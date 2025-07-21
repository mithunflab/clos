
-- Add workflow limits to user_plans table
ALTER TABLE public.user_plans 
ADD COLUMN IF NOT EXISTS max_workflows integer DEFAULT 5;

-- Update existing plans with their workflow limits
UPDATE public.user_plans 
SET max_workflows = CASE 
  WHEN plan_type = 'free' THEN 5
  WHEN plan_type = 'pro' THEN 10
  WHEN plan_type = 'custom' THEN -1  -- -1 means unlimited
  ELSE 5
END;

-- Create function to check workflow limits
CREATE OR REPLACE FUNCTION public.check_workflow_limit(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_count INTEGER;
  max_allowed INTEGER;
BEGIN
  -- Get current workflow count
  SELECT COUNT(*) INTO current_count
  FROM public.workflow_data
  WHERE user_id = p_user_id;
  
  -- Get max allowed workflows
  SELECT max_workflows INTO max_allowed
  FROM public.user_plans
  WHERE user_id = p_user_id;
  
  -- If custom plan (unlimited), return true
  IF max_allowed = -1 THEN
    RETURN TRUE;
  END IF;
  
  -- Check if under limit
  RETURN current_count < max_allowed;
END;
$$;

-- Create function to cleanup old workflows (keep only latest 100 per user)
CREATE OR REPLACE FUNCTION public.cleanup_old_workflows()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete workflows older than 6 months for free users
  DELETE FROM public.workflow_data
  WHERE user_id IN (
    SELECT user_id FROM public.user_plans WHERE plan_type = 'free'
  )
  AND created_at < NOW() - INTERVAL '6 months';
  
  -- Keep only latest 100 workflows per user
  DELETE FROM public.workflow_data
  WHERE id NOT IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC) as rn
      FROM public.workflow_data
    ) ranked
    WHERE rn <= 100
  );
END;
$$;

-- Create trigger to check workflow limits before insert
CREATE OR REPLACE FUNCTION public.check_workflow_limit_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Skip check for updates
  IF TG_OP = 'UPDATE' THEN
    RETURN NEW;
  END IF;
  
  -- Check if user can create more workflows
  IF NOT public.check_workflow_limit(NEW.user_id) THEN
    RAISE EXCEPTION 'Workflow limit exceeded for your plan. Please upgrade to create more workflows.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS workflow_limit_check ON public.workflow_data;
CREATE TRIGGER workflow_limit_check
  BEFORE INSERT ON public.workflow_data
  FOR EACH ROW
  EXECUTE FUNCTION public.check_workflow_limit_trigger();
