-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user plans enum and table
CREATE TYPE public.plan_type AS ENUM ('free', 'pro', 'custom');

CREATE TABLE public.user_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  plan_type plan_type NOT NULL DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create AI credits table
CREATE TABLE public.ai_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  current_credits INTEGER NOT NULL DEFAULT 0,
  total_credits_used INTEGER NOT NULL DEFAULT 0,
  last_credit_reset TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workflow data table
CREATE TABLE public.workflow_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_name TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  storage_bucket_id TEXT,
  workflow_storage_path TEXT,
  chat_storage_path TEXT,
  n8n_workflow_id TEXT,
  n8n_url TEXT,
  deployment_status TEXT DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create N8N configuration table
CREATE TABLE public.n8n_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  use_casel_cloud BOOLEAN NOT NULL DEFAULT true,
  n8n_url TEXT,
  n8n_api_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create N8N deployments table
CREATE TABLE public.n8n_deployments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_id TEXT NOT NULL,
  n8n_workflow_id TEXT,
  deployment_status TEXT NOT NULL DEFAULT 'pending',
  deployment_url TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n8n_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n8n_deployments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- User plans policies
CREATE POLICY "Users can view their own plan"
ON public.user_plans FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own plan"
ON public.user_plans FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own plan"
ON public.user_plans FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- AI credits policies
CREATE POLICY "Users can view their own credits"
ON public.ai_credits FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own credits"
ON public.ai_credits FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credits"
ON public.ai_credits FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Workflow data policies
CREATE POLICY "Users can view their own workflows"
ON public.workflow_data FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workflows"
ON public.workflow_data FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workflows"
ON public.workflow_data FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workflows"
ON public.workflow_data FOR DELETE
USING (auth.uid() = user_id);

-- N8N configs policies
CREATE POLICY "Users can view their own n8n config"
ON public.n8n_configs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own n8n config"
ON public.n8n_configs FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own n8n config"
ON public.n8n_configs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- N8N deployments policies
CREATE POLICY "Users can view their own deployments"
ON public.n8n_deployments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own deployments"
ON public.n8n_deployments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own deployments"
ON public.n8n_deployments FOR UPDATE
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_plans_updated_at
BEFORE UPDATE ON public.user_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_credits_updated_at
BEFORE UPDATE ON public.ai_credits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflow_data_updated_at
BEFORE UPDATE ON public.workflow_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_n8n_configs_updated_at
BEFORE UPDATE ON public.n8n_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_n8n_deployments_updated_at
BEFORE UPDATE ON public.n8n_deployments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create user-specific storage bucket
CREATE OR REPLACE FUNCTION public.create_user_bucket(user_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  bucket_name text;
BEGIN
  bucket_name := 'user-workflows-' || user_id_param::text;
  
  -- Check if bucket already exists
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = bucket_name) THEN
    -- Create the bucket
    INSERT INTO storage.buckets (id, name, public) 
    VALUES (bucket_name, bucket_name, false);
  END IF;
  
  RETURN bucket_name;
END;
$$;

-- Function to initialize user data on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  bucket_name text;
  initial_credits integer;
BEGIN
  -- Create user profile
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id, 
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  );

  -- Create default user plan (free)
  INSERT INTO public.user_plans (user_id, plan_type)
  VALUES (NEW.id, 'free');

  -- Set initial credits based on plan (10 for free users)
  initial_credits := 10;
  INSERT INTO public.ai_credits (user_id, current_credits)
  VALUES (NEW.id, initial_credits);

  -- Create default N8N config
  INSERT INTO public.n8n_configs (user_id, use_casel_cloud)
  VALUES (NEW.id, true);

  -- Create user-specific storage bucket
  bucket_name := public.create_user_bucket(NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to handle new user signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Function to reset daily credits
CREATE OR REPLACE FUNCTION public.reset_daily_credits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Reset free users to 5 credits daily (after first day)
  UPDATE public.ai_credits 
  SET 
    current_credits = 5,
    last_credit_reset = now()
  WHERE 
    user_id IN (
      SELECT user_id FROM public.user_plans WHERE plan_type = 'free'
    )
    AND last_credit_reset < now() - interval '1 day';

  -- Add 5 credits daily for pro users
  UPDATE public.ai_credits 
  SET 
    current_credits = current_credits + 5,
    last_credit_reset = now()
  WHERE 
    user_id IN (
      SELECT user_id FROM public.user_plans WHERE plan_type = 'pro'
    )
    AND last_credit_reset < now() - interval '1 day';

  -- Custom users don't need daily credit resets (they have 100 initial)
END;
$$;

-- Function to get workflow limits by plan
CREATE OR REPLACE FUNCTION public.get_workflow_limit(user_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  plan plan_type;
BEGIN
  SELECT plan_type INTO plan
  FROM public.user_plans
  WHERE user_id = user_id_param;

  CASE plan
    WHEN 'free' THEN RETURN 5;
    WHEN 'pro' THEN RETURN 20;
    WHEN 'custom' THEN RETURN -1; -- Infinite
    ELSE RETURN 5; -- Default to free
  END CASE;
END;
$$;

-- Storage policies for user buckets
CREATE POLICY "Users can manage their own bucket objects"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'user-workflows-' || auth.uid()::text
)
WITH CHECK (
  bucket_id = 'user-workflows-' || auth.uid()::text
);