-- Add unique constraint on user_id and workflow_id combination
-- This allows each user to have unique workflow_ids, but different users can have the same workflow_id
ALTER TABLE public.workflow_data 
ADD CONSTRAINT workflow_data_user_workflow_unique 
UNIQUE (user_id, workflow_id);