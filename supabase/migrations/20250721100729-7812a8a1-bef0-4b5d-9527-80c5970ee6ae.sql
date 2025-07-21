-- Add unique constraint to prevent future duplicates
ALTER TABLE user_workflows 
ADD CONSTRAINT unique_workflow_name_per_user 
UNIQUE (workflow_name, user_id);

-- Also add a function to handle workflow upserts
CREATE OR REPLACE FUNCTION upsert_workflow(
  p_workflow_id TEXT,
  p_workflow_name TEXT,
  p_user_id UUID,
  p_github_repo_name TEXT,
  p_github_repo_url TEXT,
  p_github_repo_id TEXT DEFAULT NULL
) RETURNS TABLE(id UUID, workflow_id TEXT, workflow_name TEXT, github_repo_name TEXT, github_repo_url TEXT) AS $$
BEGIN
  -- Try to update existing workflow first
  UPDATE user_workflows 
  SET 
    workflow_id = p_workflow_id,
    github_repo_name = p_github_repo_name,
    github_repo_url = p_github_repo_url,
    github_repo_id = p_github_repo_id,
    last_updated = NOW()
  WHERE workflow_name = p_workflow_name AND user_id = p_user_id;
  
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
$$ LANGUAGE plpgsql;