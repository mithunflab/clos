-- Clean up ALL duplicate workflows first

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
)
-- Delete all duplicates except the first one for each workflow name per user
DELETE FROM user_workflows 
WHERE id IN (
  SELECT id 
  FROM ranked_workflows 
  WHERE rn > 1
);