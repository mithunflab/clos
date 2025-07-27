
-- Create table for N8N cloud instances
CREATE TABLE public.cloud_n8n_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  instance_name TEXT NOT NULL,
  render_service_id TEXT,
  render_service_url TEXT,
  basic_auth_user TEXT NOT NULL,
  basic_auth_password TEXT NOT NULL,
  deployment_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cloud_n8n_instances ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own N8N instances"
  ON public.cloud_n8n_instances
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own N8N instances"
  ON public.cloud_n8n_instances
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own N8N instances"
  ON public.cloud_n8n_instances
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own N8N instances"
  ON public.cloud_n8n_instances
  FOR DELETE
  USING (auth.uid() = user_id);

-- Enable realtime
ALTER TABLE public.cloud_n8n_instances REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cloud_n8n_instances;

-- Create user plans table
CREATE TABLE public.user_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  plan_type TEXT NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'pro', 'custom')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for user plans
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user plans
CREATE POLICY "Users can view their own plan"
  ON public.user_plans
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own plan"
  ON public.user_plans
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create AI credits table
CREATE TABLE public.ai_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  current_credits INTEGER NOT NULL DEFAULT 100,
  total_credits_used INTEGER NOT NULL DEFAULT 0,
  last_credit_reset TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for AI credits
ALTER TABLE public.ai_credits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for AI credits
CREATE POLICY "Users can view their own credits"
  ON public.ai_credits
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own credits"
  ON public.ai_credits
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create N8N configurations table
CREATE TABLE public.n8n_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  use_casel_cloud BOOLEAN NOT NULL DEFAULT true,
  n8n_url TEXT,
  n8n_api_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for N8N configs
ALTER TABLE public.n8n_configs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for N8N configs
CREATE POLICY "Users can view their own N8N config"
  ON public.n8n_configs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own N8N config"
  ON public.n8n_configs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own N8N config"
  ON public.n8n_configs
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create N8N deployments table
CREATE TABLE public.n8n_deployments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  workflow_id TEXT NOT NULL,
  n8n_workflow_id TEXT NOT NULL,
  deployment_status TEXT NOT NULL DEFAULT 'pending' CHECK (deployment_status IN ('pending', 'deploying', 'deployed', 'active', 'inactive', 'error')),
  deployment_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for N8N deployments
ALTER TABLE public.n8n_deployments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for N8N deployments
CREATE POLICY "Users can view their own N8N deployments"
  ON public.n8n_deployments
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own N8N deployments"
  ON public.n8n_deployments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own N8N deployments"
  ON public.n8n_deployments
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create cloud runner projects table
CREATE TABLE public.cloud_runner_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_name TEXT NOT NULL,
  github_repo_name TEXT,
  github_repo_url TEXT,
  render_service_id TEXT,
  render_service_url TEXT,
  session_file_uploaded BOOLEAN NOT NULL DEFAULT false,
  deployment_status TEXT NOT NULL DEFAULT 'created',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for cloud runner projects
ALTER TABLE public.cloud_runner_projects ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for cloud runner projects
CREATE POLICY "Users can view their own cloud runner projects"
  ON public.cloud_runner_projects
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cloud runner projects"
  ON public.cloud_runner_projects
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cloud runner projects"
  ON public.cloud_runner_projects
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert into user_plans
  INSERT INTO public.user_plans (user_id, plan_type)
  VALUES (NEW.id, 'free');
  
  -- Insert into ai_credits
  INSERT INTO public.ai_credits (user_id, current_credits)
  VALUES (NEW.id, 100);
  
  -- Insert into n8n_configs
  INSERT INTO public.n8n_configs (user_id, use_casel_cloud)
  VALUES (NEW.id, true);
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
