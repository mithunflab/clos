-- Fix RLS policies for workflow_data table
DROP POLICY IF EXISTS "Users can manage their own workflow data" ON public.workflow_data;

-- Create proper RLS policies for workflow_data
CREATE POLICY "Users can view their own workflow data" 
ON public.workflow_data 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workflow data" 
ON public.workflow_data 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workflow data" 
ON public.workflow_data 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workflow data" 
ON public.workflow_data 
FOR DELETE 
USING (auth.uid() = user_id);

-- Ensure user_id column is not nullable for security
ALTER TABLE public.workflow_data 
ALTER COLUMN user_id SET NOT NULL;