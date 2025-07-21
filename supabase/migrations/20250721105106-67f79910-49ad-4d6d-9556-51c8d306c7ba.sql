-- Fix the upsert_workflow function to resolve ambiguous column reference
DROP FUNCTION IF EXISTS public.upsert_workflow(text, text, uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.upsert_workflow(
  p_workflow_id text, 
  p_workflow_name text, 
  p_user_id uuid, 
  p_github_repo_name text, 
  p_github_repo_url text, 
  p_github_repo_id text DEFAULT NULL::text
)
RETURNS TABLE(id uuid, workflow_id text, workflow_name text, github_repo_name text, github_repo_url text)
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Try to update existing workflow first
  UPDATE user_workflows 
  SET 
    workflow_id = p_workflow_id,
    workflow_name = p_workflow_name,
    github_repo_name = p_github_repo_name,
    github_repo_url = p_github_repo_url,
    github_repo_id = p_github_repo_id,
    last_updated = NOW()
  WHERE user_workflows.workflow_name = p_workflow_name AND user_workflows.user_id = p_user_id;
  
  -- If no rows were updated, insert new workflow
  IF NOT FOUND THEN
    INSERT INTO user_workflows (workflow_id, workflow_name, user_id, github_repo_name, github_repo_url, github_repo_id)
    VALUES (p_workflow_id, p_workflow_name, p_user_id, p_github_repo_name, p_github_repo_url, p_github_repo_id);
  END IF;
  
  -- Return the workflow
  RETURN QUERY
  SELECT uw.id, uw.workflow_id, uw.workflow_name, uw.github_repo_name, uw.github_repo_url
  FROM user_workflows uw
  WHERE uw.workflow_name = p_workflow_name AND uw.user_id = p_user_id;
END;
$function$;