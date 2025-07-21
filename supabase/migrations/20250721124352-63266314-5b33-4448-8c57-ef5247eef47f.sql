-- Make compressed columns optional since we're using storage now
ALTER TABLE public.workflow_data 
ALTER COLUMN compressed_workflow_json DROP NOT NULL;