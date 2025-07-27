
-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user plans table
CREATE TABLE public.user_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('free', 'pro', 'custom')) DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Create AI credits table
CREATE TABLE public.ai_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  current_credits INTEGER NOT NULL DEFAULT 10,
  total_credits_used INTEGER NOT NULL DEFAULT 0,
  last_credit_reset TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Create N8N configurations table
CREATE TABLE public.n8n_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  use_casel_cloud BOOLEAN NOT NULL DEFAULT true,
  n8n_url TEXT,
  n8n_api_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Create workflow data table
CREATE TABLE public.workflow_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  workflow_id TEXT NOT NULL,
  workflow_name TEXT NOT NULL,
  description TEXT DEFAULT '',
  metadata JSONB DEFAULT '{}',
  storage_bucket_id TEXT,
  workflow_storage_path TEXT,
  chat_storage_path TEXT,
  n8n_workflow_id TEXT,
  n8n_url TEXT,
  deployment_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, workflow_id)
);

-- Create N8N deployments table
CREATE TABLE public.n8n_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  workflow_id TEXT NOT NULL,
  n8n_workflow_id TEXT NOT NULL,
  deployment_status TEXT NOT NULL CHECK (deployment_status IN ('pending', 'deploying', 'deployed', 'active', 'inactive', 'error')) DEFAULT 'pending',
  deployment_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, workflow_id)
);

-- Create cloud runner projects table
CREATE TABLE public.cloud_runner_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_name TEXT NOT NULL,
  github_repo_name TEXT,
  github_repo_url TEXT,
  render_service_id TEXT,
  render_service_url TEXT,
  deployment_status TEXT NOT NULL DEFAULT 'draft',
  session_file_uploaded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n8n_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n8n_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloud_runner_projects ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Create RLS policies for user_plans
CREATE POLICY "Users can view their own plan" ON public.user_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own plan" ON public.user_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own plan" ON public.user_plans FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for ai_credits
CREATE POLICY "Users can view their own credits" ON public.ai_credits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own credits" ON public.ai_credits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own credits" ON public.ai_credits FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for n8n_configs
CREATE POLICY "Users can view their own n8n config" ON public.n8n_configs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own n8n config" ON public.n8n_configs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own n8n config" ON public.n8n_configs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for workflow_data
CREATE POLICY "Users can view their own workflows" ON public.workflow_data FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own workflows" ON public.workflow_data FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own workflows" ON public.workflow_data FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own workflows" ON public.workflow_data FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for n8n_deployments
CREATE POLICY "Users can view their own deployments" ON public.n8n_deployments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own deployments" ON public.n8n_deployments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own deployments" ON public.n8n_deployments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own deployments" ON public.n8n_deployments FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for cloud_runner_projects
CREATE POLICY "Users can view their own projects" ON public.cloud_runner_projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own projects" ON public.cloud_runner_projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own projects" ON public.cloud_runner_projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own projects" ON public.cloud_runner_projects FOR DELETE USING (auth.uid() = user_id);

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  
  -- Insert into user_plans with default free plan
  INSERT INTO public.user_plans (user_id, plan_type)
  VALUES (NEW.id, 'free');
  
  -- Insert into ai_credits with default credits
  INSERT INTO public.ai_credits (user_id, current_credits, total_credits_used)
  VALUES (NEW.id, 10, 0);
  
  -- Insert into n8n_configs with default settings
  INSERT INTO public.n8n_configs (user_id, use_casel_cloud)
  VALUES (NEW.id, true);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically set up new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to reset daily credits
CREATE OR REPLACE FUNCTION public.reset_daily_credits()
RETURNS void AS $$
BEGIN
  -- Reset credits for free users (5 credits daily)
  UPDATE public.ai_credits 
  SET current_credits = LEAST(current_credits + 5, 15),
      last_credit_reset = now()
  WHERE user_id IN (
    SELECT user_id FROM public.user_plans WHERE plan_type = 'free'
  )
  AND last_credit_reset < now() - INTERVAL '1 day';
  
  -- Reset credits for pro users (5 credits daily)
  UPDATE public.ai_credits 
  SET current_credits = LEAST(current_credits + 5, 55),
      last_credit_reset = now()
  WHERE user_id IN (
    SELECT user_id FROM public.user_plans WHERE plan_type = 'pro'
  )
  AND last_credit_reset < now() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to create user bucket
CREATE OR REPLACE FUNCTION public.create_user_bucket(user_id_param UUID)
RETURNS text AS $$
DECLARE
  bucket_name text;
BEGIN
  bucket_name := 'user-workflows-' || user_id_param::text;
  
  -- Create the bucket
  INSERT INTO storage.buckets (id, name, public, owner)
  VALUES (bucket_name, bucket_name, false, user_id_param)
  ON CONFLICT (id) DO NOTHING;
  
  RETURN bucket_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create storage policies for user buckets
CREATE POLICY "Users can access their own workflow bucket" ON storage.objects
  FOR ALL USING (bucket_id = 'user-workflows-' || auth.uid()::text);

CREATE POLICY "Users can manage their own workflow bucket" ON storage.buckets
  FOR ALL USING (id = 'user-workflows-' || auth.uid()::text);
