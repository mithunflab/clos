
-- Clean all data from tables except profiles
DELETE FROM public.credit_transactions;
DELETE FROM public.n8n_deployments;
DELETE FROM public.user_n8n_config;
DELETE FROM public.user_plans WHERE user_id NOT IN (SELECT id FROM public.profiles);
DELETE FROM public.user_settings;
DELETE FROM public.user_workflows;
DELETE FROM public.workflow_data;

-- Reset user plans for existing profiles to free tier
INSERT INTO public.user_plans (user_id, plan_type, credits, max_credits, max_workflows)
SELECT id, 'free', 5, 5, 5 
FROM public.profiles 
WHERE id NOT IN (SELECT user_id FROM public.user_plans);

-- Update workflow_data table to be minimal metadata only
ALTER TABLE public.workflow_data 
DROP COLUMN IF EXISTS compressed_workflow_json,
DROP COLUMN IF EXISTS compressed_chat_history;

-- Ensure we have the storage path columns
ALTER TABLE public.workflow_data 
ADD COLUMN IF NOT EXISTS workflow_storage_path TEXT,
ADD COLUMN IF NOT EXISTS chat_storage_path TEXT;
