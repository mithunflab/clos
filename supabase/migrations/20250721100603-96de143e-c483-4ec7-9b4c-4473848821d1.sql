-- Clean up duplicate workflows and fix the workflow creation logic

-- First, let's identify the oldest workflow to keep
WITH ranked_workflows AS (
  SELECT 
    id,
    workflow_id,
    workflow_name,
    user_id,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY workflow_name, user_id 
      ORDER BY created_at ASC
    ) as rn
  FROM user_workflows
  WHERE workflow_name = 'YouTube New Video Alerter to Discord & Twitter'
)
-- Delete all duplicates except the first one
DELETE FROM user_workflows 
WHERE id IN (
  SELECT id 
  FROM ranked_workflows 
  WHERE rn > 1
);

-- Add a unique constraint to prevent future duplicates for the same user
ALTER TABLE user_workflows 
ADD CONSTRAINT unique_workflow_name_per_user 
UNIQUE (workflow_name, user_id);