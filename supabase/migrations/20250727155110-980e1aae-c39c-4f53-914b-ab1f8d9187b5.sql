
-- Create table for Cloud N8N instances
CREATE TABLE public.cloud_n8n_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instance_name TEXT NOT NULL,
  instance_url TEXT,
  render_service_id TEXT,
  status TEXT NOT NULL DEFAULT 'creating',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for purchases
CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purchase_type TEXT NOT NULL, -- 'credits', 'workflows', 'n8n_instance'
  amount DECIMAL NOT NULL,
  quantity INTEGER NOT NULL,
  stripe_session_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for promo codes
CREATE TABLE public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  credits_reward INTEGER DEFAULT 0,
  workflows_reward INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for promo code usage
CREATE TABLE public.promo_code_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  credits_received INTEGER DEFAULT 0,
  workflows_received INTEGER DEFAULT 0,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, promo_code_id)
);

-- Add workflow limit to user_plans table
ALTER TABLE public.user_plans ADD COLUMN IF NOT EXISTS workflow_limit INTEGER DEFAULT 5;

-- Update workflow limits for existing plans
UPDATE public.user_plans SET workflow_limit = 5 WHERE plan_type = 'free';
UPDATE public.user_plans SET workflow_limit = 20 WHERE plan_type = 'pro';
UPDATE public.user_plans SET workflow_limit = -1 WHERE plan_type = 'custom';

-- Enable RLS on new tables
ALTER TABLE public.cloud_n8n_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_code_usage ENABLE ROW LEVEL SECURITY;

-- RLS policies for cloud_n8n_instances
CREATE POLICY "Users can view their own N8N instances" 
  ON public.cloud_n8n_instances FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own N8N instances" 
  ON public.cloud_n8n_instances FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own N8N instances" 
  ON public.cloud_n8n_instances FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own N8N instances" 
  ON public.cloud_n8n_instances FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS policies for purchases
CREATE POLICY "Users can view their own purchases" 
  ON public.purchases FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own purchases" 
  ON public.purchases FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own purchases" 
  ON public.purchases FOR UPDATE 
  USING (auth.uid() = user_id);

-- RLS policies for promo_codes (public read access)
CREATE POLICY "Anyone can view active promo codes" 
  ON public.promo_codes FOR SELECT 
  USING (is_active = true);

-- RLS policies for promo_code_usage
CREATE POLICY "Users can view their own promo code usage" 
  ON public.promo_code_usage FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own promo code usage" 
  ON public.promo_code_usage FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Insert the CASELCLOUD promo code
INSERT INTO public.promo_codes (code, credits_reward, workflows_reward, is_active) 
VALUES ('CASELCLOUD', 10, 5, true)
ON CONFLICT (code) DO NOTHING;
