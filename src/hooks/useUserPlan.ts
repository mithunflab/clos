
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UserPlan {
  id: string;
  plan_type: 'free' | 'pro' | 'custom';
  credits: number;
  max_credits: number;
  custom_features: any;
  expires_at: string | null;
}

export const useUserPlan = () => {
  const [plan, setPlan] = useState<UserPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchUserPlan = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_plans')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setPlan(data);
    } catch (err) {
      console.error('Error fetching user plan:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const deductCredit = async (workflowId?: string, description?: string) => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc('deduct_credit', {
        p_user_id: user.id,
        p_workflow_id: workflowId,
        p_description: description || 'AI Chat'
      });

      if (error) throw error;
      
      if (data) {
        // Refresh user plan after deducting credit
        await fetchUserPlan();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error deducting credit:', err);
      setError(err instanceof Error ? err.message : 'Failed to deduct credit');
      return false;
    }
  };

  useEffect(() => {
    fetchUserPlan();
  }, [user]);

  return {
    plan,
    loading,
    error,
    deductCredit,
    refetch: fetchUserPlan
  };
};
