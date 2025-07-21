
-- Create workflow_configurations table for better configuration management
CREATE TABLE public.workflow_configurations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_id text NOT NULL,
  configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_model text NOT NULL DEFAULT 'gemini-2.0-flash-exp',
  deployment_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create workflow_nodes table for better node management
CREATE TABLE public.workflow_nodes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id text NOT NULL,
  node_uuid uuid NOT NULL DEFAULT gen_random_uuid(),
  node_name text NOT NULL,
  node_type text NOT NULL,
  parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  position jsonb NOT NULL DEFAULT '[0, 0]'::jsonb,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(workflow_id, node_uuid)
);

-- Create workflow_deployment_status table for tracking deployments
CREATE TABLE public.workflow_deployment_status (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deployment_id text,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  deployed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create workflow_real_time_logs table for real-time monitoring
CREATE TABLE public.workflow_real_time_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id text NOT NULL,
  execution_id text,
  node_name text,
  log_level text NOT NULL DEFAULT 'info',
  message text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp timestamp with time zone NOT NULL DEFAULT now()
);

-- Add RLS policies for workflow_configurations
ALTER TABLE public.workflow_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own workflow configurations"
  ON public.workflow_configurations
  FOR ALL
  USING (user_id = auth.uid());

-- Add RLS policies for workflow_nodes
ALTER TABLE public.workflow_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own workflow nodes"
  ON public.workflow_nodes
  FOR ALL
  USING (user_id = auth.uid());

-- Add RLS policies for workflow_deployment_status
ALTER TABLE public.workflow_deployment_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own workflow deployment status"
  ON public.workflow_deployment_status
  FOR ALL
  USING (user_id = auth.uid());

-- Add RLS policies for workflow_real_time_logs
ALTER TABLE public.workflow_real_time_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own workflow real-time logs"
  ON public.workflow_real_time_logs
  FOR ALL
  USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX idx_workflow_configurations_user_id ON public.workflow_configurations(user_id);
CREATE INDEX idx_workflow_configurations_workflow_id ON public.workflow_configurations(workflow_id);
CREATE INDEX idx_workflow_nodes_workflow_id ON public.workflow_nodes(workflow_id);
CREATE INDEX idx_workflow_nodes_user_id ON public.workflow_nodes(user_id);
CREATE INDEX idx_workflow_deployment_status_workflow_id ON public.workflow_deployment_status(workflow_id);
CREATE INDEX idx_workflow_real_time_logs_workflow_id ON public.workflow_real_time_logs(workflow_id);
CREATE INDEX idx_workflow_real_time_logs_timestamp ON public.workflow_real_time_logs(timestamp);

-- Enable realtime for workflow_real_time_logs
ALTER TABLE public.workflow_real_time_logs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_real_time_logs;
