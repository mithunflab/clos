-- Create storage bucket for workflow JSON files
INSERT INTO storage.buckets (id, name, public) VALUES ('workflows', 'workflows', false);

-- Create storage policies for workflow files
CREATE POLICY "Users can upload their own workflow files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'workflows' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own workflow files"
ON storage.objects FOR SELECT
USING (bucket_id = 'workflows' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own workflow files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'workflows' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own workflow files"
ON storage.objects FOR DELETE
USING (bucket_id = 'workflows' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add storage path columns to workflow_data table
ALTER TABLE public.workflow_data 
ADD COLUMN workflow_storage_path TEXT,
ADD COLUMN chat_storage_path TEXT;