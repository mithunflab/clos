
-- Create a table to store cloud runner projects
CREATE TABLE public.cloud_runner_projects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_name text NOT NULL,
  github_repo_name text,
  github_repo_url text,
  render_service_id text,
  render_service_url text,
  deployment_status text DEFAULT 'draft',
  session_file_uploaded boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS for the cloud_runner_projects table
ALTER TABLE public.cloud_runner_projects ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own cloud runner projects" 
  ON public.cloud_runner_projects 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cloud runner projects" 
  ON public.cloud_runner_projects 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cloud runner projects" 
  ON public.cloud_runner_projects 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cloud runner projects" 
  ON public.cloud_runner_projects 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Add trigger to update the updated_at column
CREATE TRIGGER update_cloud_runner_projects_updated_at 
  BEFORE UPDATE ON public.cloud_runner_projects 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
