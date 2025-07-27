
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UserPlan {
  id: string;
  user_id: string;
  plan_type: 'free' | 'pro' | 'custom';
  workflow_limit: number;
  created_at: string;
  updated_at: string;
}

interface UserCredits {
  id: string;
  user_id: string;
  current_credits: number;
  total_credits_used: number;
  last_credit_reset: string;
  created_at: string;
  updated_at: string;
}

export const useUserPlan = () => {
  const [plan, setPlan] = useState<UserPlan | null>(null);
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchUserPlan = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch user plan
      const { data: planData, error: planError } = await supabase
        .from('user_plans')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (planError) throw planError;
      
      // Cast plan_type to the correct type and ensure workflow_limit exists
      const typedPlan: UserPlan = {
        ...planData,
        plan_type: planData.plan_type as 'free' | 'pro' | 'custom',
        workflow_limit: planData.workflow_limit || getWorkflowLimit(planData.plan_type)
      };
      setPlan(typedPlan);

      // Fetch user credits
      const { data: creditsData, error: creditsError } = await supabase
        .from('ai_credits')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (creditsError) throw creditsError;
      setCredits(creditsData);

    } catch (err) {
      console.error('Error fetching user plan:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const deductCredit = async (amount: number = 1) => {
    if (!user) return false;

    try {
      // Update credits directly in ai_credits table
      const { data: currentCredits, error: fetchError } = await supabase
        .from('ai_credits')
        .select('current_credits, total_credits_used')
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;

      const newCredits = Math.max(0, currentCredits.current_credits - amount);
      const newTotalUsed = currentCredits.total_credits_used + amount;
      
      const { error } = await supabase
        .from('ai_credits')
        .update({ 
          current_credits: newCredits,
          total_credits_used: newTotalUsed
        })
        .eq('user_id', user.id);

      if (error) throw error;
      
      // Refresh user plan after deducting credit
      await fetchUserPlan();
      return true;
    } catch (err) {
      console.error('Error deducting credit:', err);
      setError(err instanceof Error ? err.message : 'Failed to deduct credit');
      return false;
    }
  };

  const getWorkflowLimit = (planType?: string) => {
    if (!planType && !plan) return 5; // Default to free plan
    
    const type = planType || plan?.plan_type;
    switch (type) {
      case 'free':
        return 5;
      case 'pro':
        return 20;
      case 'custom':
        return -1; // Unlimited
      default:
        return 5;
    }
  };

  useEffect(() => {
    fetchUserPlan();
  }, [user]);

  return {
    plan,
    credits,
    loading,
    error,
    deductCredit,
    getWorkflowLimit,
    refetch: fetchUserPlan
  };
};
