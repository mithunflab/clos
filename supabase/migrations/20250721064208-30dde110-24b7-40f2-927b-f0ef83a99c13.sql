-- Add n8n deployment tracking columns to user_workflows table
ALTER TABLE public.user_workflows 
ADD COLUMN IF NOT EXISTS n8n_workflow_id TEXT,
ADD COLUMN IF NOT EXISTS deployment_url TEXT,
ADD COLUMN IF NOT EXISTS deployment_status TEXT DEFAULT 'pending' CHECK (deployment_status IN ('pending', 'deploying', 'deployed', 'active', 'inactive', 'error')),
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_workflows_n8n_id ON public.user_workflows(n8n_workflow_id);
CREATE INDEX IF NOT EXISTS idx_user_workflows_deployment_status ON public.user_workflows(deployment_status);