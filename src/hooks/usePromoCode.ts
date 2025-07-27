
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useUserPlan } from './useUserPlan';

export const usePromoCode = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { refetch: refetchUserPlan } = useUserPlan();

  const applyPromoCode = async (code: string) => {
    if (!user) return { success: false, error: 'User not authenticated' };

    try {
      setLoading(true);
      setError(null);

      // Check if promo code exists and is active
      const { data: promoCode, error: promoError } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .single();

      if (promoError || !promoCode) {
        return { success: false, error: 'Invalid or expired promo code' };
      }

      // Check if user has already used this promo code
      const { data: existingUsage, error: usageError } = await supabase
        .from('promo_code_usage')
        .select('*')
        .eq('user_id', user.id)
        .eq('promo_code_id', promoCode.id)
        .maybeSingle();

      if (usageError) throw usageError;

      if (existingUsage) {
        return { success: false, error: 'Promo code already used' };
      }

      // Apply credits if any
      if (promoCode.credits_reward > 0) {
        const { data: currentCredits, error: fetchError } = await supabase
          .from('ai_credits')
          .select('current_credits')
          .eq('user_id', user.id)
          .single();

        if (fetchError) throw fetchError;

        const { error: updateError } = await supabase
          .from('ai_credits')
          .update({
            current_credits: currentCredits.current_credits + promoCode.credits_reward
          })
          .eq('user_id', user.id);

        if (updateError) throw updateError;
      }

      // Apply workflows if any
      if (promoCode.workflows_reward > 0) {
        const { data: currentPlan, error: fetchError } = await supabase
          .from('user_plans')
          .select('workflow_limit')
          .eq('user_id', user.id)
          .single();

        if (fetchError) throw fetchError;

        const newLimit = currentPlan.workflow_limit === -1 
          ? -1 
          : currentPlan.workflow_limit + promoCode.workflows_reward;

        const { error: updateError } = await supabase
          .from('user_plans')
          .update({
            workflow_limit: newLimit
          })
          .eq('user_id', user.id);

        if (updateError) throw updateError;
      }

      // Handle pro membership upgrade for specific promo codes
      if (code.toUpperCase() === 'CASELGRID100') {
        const { error: proUpgradeError } = await supabase
          .from('user_plans')
          .update({
            plan_type: 'pro',
            workflow_limit: 20
          })
          .eq('user_id', user.id);

        if (proUpgradeError) throw proUpgradeError;

        // Also give pro membership benefits (50 AI credits if not already given)
        if (promoCode.credits_reward === 0) {
          const { data: currentCredits, error: fetchError } = await supabase
            .from('ai_credits')
            .select('current_credits')
            .eq('user_id', user.id)
            .single();

          if (fetchError) throw fetchError;

          const { error: updateError } = await supabase
            .from('ai_credits')
            .update({
              current_credits: currentCredits.current_credits + 50
            })
            .eq('user_id', user.id);

          if (updateError) throw updateError;
        }
      }

      // Record the usage
      const { error: usageInsertError } = await supabase
        .from('promo_code_usage')
        .insert({
          user_id: user.id,
          promo_code_id: promoCode.id,
          credits_received: promoCode.credits_reward,
          workflows_received: promoCode.workflows_reward
        });

      if (usageInsertError) throw usageInsertError;

      await refetchUserPlan();

      const creditsAdded = code.toUpperCase() === 'CASELGRID100' && promoCode.credits_reward === 0 ? 50 : promoCode.credits_reward;
      
      return {
        success: true,
        credits_added: creditsAdded,
        workflows_added: promoCode.workflows_reward,
        plan_upgraded: code.toUpperCase() === 'CASELGRID100' ? 'pro' : null
      };
    } catch (err) {
      console.error('Error applying promo code:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to apply promo code';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    applyPromoCode
  };
};
