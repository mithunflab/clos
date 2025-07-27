-- Insert the CASELGRID100 promo code for pro membership
INSERT INTO public.promo_codes (code, credits_reward, workflows_reward, is_active)
VALUES ('CASELGRID100', 0, 0, true)
ON CONFLICT (code) DO NOTHING;