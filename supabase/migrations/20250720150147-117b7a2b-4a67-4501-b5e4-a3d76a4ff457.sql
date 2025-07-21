
-- Create profiles table (missing from current database)
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create n8n_deployments table to track N8N deployments
CREATE TABLE public.n8n_deployments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_id TEXT NOT NULL,
  n8n_workflow_id TEXT NOT NULL,
  deployment_status TEXT NOT NULL DEFAULT 'active',
  deployment_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, workflow_id)
);

-- Create user_n8n_config table for user N8N settings
CREATE TABLE public.user_n8n_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  use_casel_cloud BOOLEAN NOT NULL DEFAULT true,
  n8n_url TEXT,
  n8n_api_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on new tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n8n_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_n8n_config ENABLE ROW LEVEL SECURITY;

-- RLS policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS policies for n8n_deployments
CREATE POLICY "Users can manage their own deployments"
  ON public.n8n_deployments
  FOR ALL
  USING (user_id = auth.uid());

-- RLS policies for user_n8n_config
CREATE POLICY "Users can manage their own N8N config"
  ON public.user_n8n_config
  FOR ALL
  USING (user_id = auth.uid());

-- Update user_plans to give 5 credits instead of 10, and set max to 5
ALTER TABLE public.user_plans ALTER COLUMN credits SET DEFAULT 5;
ALTER TABLE public.user_plans ALTER COLUMN max_credits SET DEFAULT 5;

-- Update existing users to have 5 credits max (for new daily credit system)
UPDATE public.user_plans SET max_credits = 5 WHERE max_credits = 10;

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- Update user plan creation to give 5 credits initially
CREATE OR REPLACE FUNCTION public.handle_new_user_plan()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_plans (user_id, plan_type, credits, max_credits)
  VALUES (NEW.id, 'free', 5, 5);
  RETURN NEW;
END;
$$;

-- Create function for daily credit replenishment
CREATE OR REPLACE FUNCTION public.replenish_daily_credits()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_plans 
  SET credits = 5, 
      updated_at = now()
  WHERE plan_type = 'free' 
    AND credits < 5;
END;
$$;

-- Create trigger for profile creation (if not exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create trigger for plan creation (if not exists)  
DROP TRIGGER IF EXISTS on_auth_user_created_plan ON auth.users;
CREATE TRIGGER on_auth_user_created_plan
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_plan();

-- Add updated_at triggers
CREATE TRIGGER handle_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_n8n_deployments
  BEFORE UPDATE ON public.n8n_deployments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_user_n8n_config
  BEFORE UPDATE ON public.user_n8n_config
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create indexes for better performance
CREATE INDEX idx_n8n_deployments_user_id ON public.n8n_deployments(user_id);
CREATE INDEX idx_n8n_deployments_workflow_id ON public.n8n_deployments(workflow_id);
CREATE INDEX idx_user_n8n_config_user_id ON public.user_n8n_config(user_id);
