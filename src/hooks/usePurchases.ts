
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useUserPlan } from './useUserPlan';

export const usePurchases = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { refetch: refetchUserPlan } = useUserPlan();

  const purchaseCredits = async (quantity: number = 10) => {
    if (!user) return false;

    try {
      setLoading(true);
      setError(null);

      // Record the purchase
      const { error: purchaseError } = await supabase
        .from('purchases')
        .insert({
          user_id: user.id,
          purchase_type: 'credits',
          amount: quantity * 0.1, // $0.10 per credit ($1 for 10 credits)
          quantity: quantity,
          status: 'completed'
        });

      if (purchaseError) throw purchaseError;

      // Update user credits
      const { data: currentCredits, error: fetchError } = await supabase
        .from('ai_credits')
        .select('current_credits')
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;

      const { error: updateError } = await supabase
        .from('ai_credits')
        .update({
          current_credits: currentCredits.current_credits + quantity
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      await refetchUserPlan();
      return true;
    } catch (err) {
      console.error('Error purchasing credits:', err);
      setError(err instanceof Error ? err.message : 'Failed to purchase credits');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const purchaseWorkflows = async (quantity: number = 5) => {
    if (!user) return false;

    try {
      setLoading(true);
      setError(null);

      // Record the purchase
      const { error: purchaseError } = await supabase
        .from('purchases')
        .insert({
          user_id: user.id,
          purchase_type: 'workflows',
          amount: quantity * 0.2, // $0.20 per workflow ($1 for 5 workflows)
          quantity: quantity,
          status: 'completed'
        });

      if (purchaseError) throw purchaseError;

      // Update user workflow limit
      const { data: currentPlan, error: fetchError } = await supabase
        .from('user_plans')
        .select('workflow_limit')
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;

      const newLimit = currentPlan.workflow_limit === -1 
        ? -1 
        : currentPlan.workflow_limit + quantity;

      const { error: updateError } = await supabase
        .from('user_plans')
        .update({
          workflow_limit: newLimit
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      await refetchUserPlan();
      return true;
    } catch (err) {
      console.error('Error purchasing workflows:', err);
      setError(err instanceof Error ? err.message : 'Failed to purchase workflows');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const purchaseN8nInstance = async () => {
    if (!user) return false;

    try {
      setLoading(true);
      setError(null);

      // Record the purchase
      const { error: purchaseError } = await supabase
        .from('purchases')
        .insert({
          user_id: user.id,
          purchase_type: 'n8n_instance',
          amount: 20, // $20 per month
          quantity: 1,
          status: 'completed'
        });

      if (purchaseError) throw purchaseError;

      return true;
    } catch (err) {
      console.error('Error purchasing N8N instance:', err);
      setError(err instanceof Error ? err.message : 'Failed to purchase N8N instance');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    purchaseCredits,
    purchaseWorkflows,
    purchaseN8nInstance
  };
};
