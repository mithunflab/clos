
-- Create user plans enum
CREATE TYPE public.plan_type AS ENUM ('free', 'pro', 'custom');

-- Create user plans table
CREATE TABLE public.user_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type plan_type NOT NULL DEFAULT 'free',
  credits INTEGER NOT NULL DEFAULT 10,
  max_credits INTEGER NOT NULL DEFAULT 10,
  custom_features JSONB DEFAULT '{}',
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create user workflows table to track GitHub repositories
CREATE TABLE public.user_workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_id TEXT NOT NULL,
  workflow_name TEXT NOT NULL,
  github_repo_name TEXT NOT NULL,
  github_repo_url TEXT NOT NULL,
  github_repo_id TEXT,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, workflow_id)
);

-- Create credit transactions table for tracking usage
CREATE TABLE public.credit_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_id TEXT,
  transaction_type TEXT NOT NULL, -- 'debit' or 'credit'
  amount INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_plans
CREATE POLICY "Users can view their own plan"
  ON public.user_plans
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own plan"
  ON public.user_plans
  FOR UPDATE
  USING (user_id = auth.uid());

-- RLS policies for user_workflows
CREATE POLICY "Users can manage their own workflows"
  ON public.user_workflows
  FOR ALL
  USING (user_id = auth.uid());

-- RLS policies for credit_transactions
CREATE POLICY "Users can view their own transactions"
  ON public.credit_transactions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can insert transactions"
  ON public.credit_transactions
  FOR INSERT
  WITH CHECK (true);

-- Create function to initialize user plan on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_plan()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_plans (user_id, plan_type, credits, max_credits)
  VALUES (NEW.id, 'free', 10, 10);
  RETURN NEW;
END;
$$;

-- Create trigger for new user plan initialization
CREATE TRIGGER on_auth_user_created_plan
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_plan();

-- Create function to deduct credits
CREATE OR REPLACE FUNCTION public.deduct_credit(
  p_user_id UUID,
  p_workflow_id TEXT DEFAULT NULL,
  p_description TEXT DEFAULT 'AI Chat'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_credits INTEGER;
BEGIN
  -- Get current credits
  SELECT credits INTO current_credits
  FROM public.user_plans
  WHERE user_id = p_user_id;
  
  -- Check if user has credits
  IF current_credits <= 0 THEN
    RETURN FALSE;
  END IF;
  
  -- Deduct credit
  UPDATE public.user_plans
  SET credits = credits - 1,
      updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Log transaction
  INSERT INTO public.credit_transactions (user_id, workflow_id, transaction_type, amount, description)
  VALUES (p_user_id, p_workflow_id, 'debit', 1, p_description);
  
  RETURN TRUE;
END;
$$;

-- Create indexes for better performance
CREATE INDEX idx_user_plans_user_id ON public.user_plans(user_id);
CREATE INDEX idx_user_workflows_user_id ON public.user_workflows(user_id);
CREATE INDEX idx_user_workflows_workflow_id ON public.user_workflows(workflow_id);
CREATE INDEX idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created_at ON public.credit_transactions(created_at);
