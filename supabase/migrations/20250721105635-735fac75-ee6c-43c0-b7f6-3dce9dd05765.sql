-- Create table for storing workflow data with compressed JSON
CREATE TABLE public.workflow_data (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  workflow_id text NOT NULL,
  workflow_name text NOT NULL,
  n8n_workflow_id text,
  n8n_url text,
  deployment_status text DEFAULT 'pending',
  compressed_workflow_json bytea NOT NULL, -- Compressed JSON data
  compressed_chat_history bytea, -- Compressed chat history
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Constraints
  UNIQUE(user_id, workflow_name),
  UNIQUE(workflow_id)
);

-- Enable RLS
ALTER TABLE public.workflow_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own workflow data" 
ON public.workflow_data 
FOR ALL 
USING (user_id = auth.uid());

-- Create index for better performance
CREATE INDEX idx_workflow_data_user_id ON public.workflow_data(user_id);
CREATE INDEX idx_workflow_data_workflow_id ON public.workflow_data(workflow_id);

-- Create trigger for updated_at
CREATE TRIGGER update_workflow_data_updated_at
  BEFORE UPDATE ON public.workflow_data
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();