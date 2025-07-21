
-- Create promo_codes table to manage promo codes
CREATE TABLE public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  plan_type plan_type NOT NULL,
  credits_to_add INTEGER NOT NULL DEFAULT 0,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on promo_codes table
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view active promo codes (for validation)
CREATE POLICY "Users can view active promo codes"
  ON public.promo_codes
  FOR SELECT
  USING (active = true AND (expires_at IS NULL OR expires_at > now()));

-- Create policy for system to update promo codes usage
CREATE POLICY "System can update promo codes"
  ON public.promo_codes
  FOR UPDATE
  USING (true);

-- Insert the CASELGRID50 promo code
INSERT INTO public.promo_codes (code, plan_type, credits_to_add, max_uses, expires_at)
VALUES ('CASELGRID50', 'pro', 50, 1000, now() + interval '1 year');

-- Create promo_code_usage table to track usage
CREATE TABLE public.promo_code_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, promo_code_id)
);

-- Enable RLS on promo_code_usage table
ALTER TABLE public.promo_code_usage ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own promo code usage
CREATE POLICY "Users can view their own promo code usage"
  ON public.promo_code_usage
  FOR SELECT
  USING (user_id = auth.uid());

-- Create policy for system to insert promo code usage
CREATE POLICY "System can insert promo code usage"
  ON public.promo_code_usage
  FOR INSERT
  WITH CHECK (true);

-- Create function to apply promo code
CREATE OR REPLACE FUNCTION public.apply_promo_code(
  p_user_id UUID,
  p_promo_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  promo_record RECORD;
  user_plan_record RECORD;
  result JSONB;
BEGIN
  -- Check if promo code exists and is valid
  SELECT * INTO promo_record
  FROM public.promo_codes
  WHERE code = p_promo_code
    AND active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR current_uses < max_uses);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired promo code');
  END IF;

  -- Check if user has already used this promo code
  IF EXISTS (
    SELECT 1 FROM public.promo_code_usage
    WHERE user_id = p_user_id AND promo_code_id = promo_record.id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Promo code already used');
  END IF;

  -- Get current user plan
  SELECT * INTO user_plan_record
  FROM public.user_plans
  WHERE user_id = p_user_id;

  -- Update user plan if promo code offers a better plan
  IF promo_record.plan_type = 'pro' AND user_plan_record.plan_type = 'free' THEN
    UPDATE public.user_plans
    SET plan_type = 'pro', updated_at = now()
    WHERE user_id = p_user_id;
  ELSIF promo_record.plan_type = 'custom' AND user_plan_record.plan_type IN ('free', 'pro') THEN
    UPDATE public.user_plans
    SET plan_type = 'custom', updated_at = now()
    WHERE user_id = p_user_id;
  END IF;

  -- Add credits to user
  UPDATE public.ai_credits
  SET current_credits = current_credits + promo_record.credits_to_add,
      updated_at = now()
  WHERE user_id = p_user_id;

  -- Record promo code usage
  INSERT INTO public.promo_code_usage (user_id, promo_code_id)
  VALUES (p_user_id, promo_record.id);

  -- Update promo code usage count
  UPDATE public.promo_codes
  SET current_uses = current_uses + 1,
      updated_at = now()
  WHERE id = promo_record.id;

  RETURN jsonb_build_object(
    'success', true,
    'plan_type', promo_record.plan_type,
    'credits_added', promo_record.credits_to_add
  );
END;
$$;
