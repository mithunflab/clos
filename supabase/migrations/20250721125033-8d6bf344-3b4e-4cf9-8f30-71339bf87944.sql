-- Add unique constraint for user_id and workflow_id combination
ALTER TABLE public.workflow_data 
ADD CONSTRAINT workflow_data_user_workflow_unique 
UNIQUE (user_id, workflow_id);