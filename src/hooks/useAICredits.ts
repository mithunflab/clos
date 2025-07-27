
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface AICredits {
  id: string;
  user_id: string;
  current_credits: number;
  total_credits_used: number;
  last_credit_reset: string;
  created_at: string;
  updated_at: string;
}

export const useAICredits = () => {
  const [credits, setCredits] = useState<AICredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchCredits = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('ai_credits')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setCredits(data);
    } catch (err) {
      console.error('Error fetching AI credits:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const deductCredits = async (amount: number = 1) => {
    if (!user?.id || !credits) return false;

    try {
      if (credits.current_credits < amount) {
        throw new Error('Insufficient credits');
      }

      const newCredits = credits.current_credits - amount;
      const newTotalUsed = credits.total_credits_used + amount;

      const { error } = await supabase
        .from('ai_credits')
        .update({
          current_credits: newCredits,
          total_credits_used: newTotalUsed
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      setCredits(prev => prev ? {
        ...prev,
        current_credits: newCredits,
        total_credits_used: newTotalUsed
      } : null);

      return true;
    } catch (err) {
      console.error('Error deducting credits:', err);
      setError(err instanceof Error ? err.message : 'Failed to deduct credits');
      return false;
    }
  };

  const checkAndResetDailyCredits = async () => {
    if (!user?.id) return;

    try {
      // Call the reset function (this should be called via a daily cron job in production)
      const { error } = await supabase.rpc('reset_daily_credits');
      
      if (error) {
        console.error('Error resetting daily credits:', error);
      } else {
        // Refresh credits after reset
        await fetchCredits();
      }
    } catch (err) {
      console.error('Error checking daily credit reset:', err);
    }
  };

  const getCreditsForPlan = (planType: 'free' | 'pro' | 'custom') => {
    switch (planType) {
      case 'free':
        return { initial: 10, daily: 5 };
      case 'pro':
        return { initial: 50, daily: 5 };
      case 'custom':
        return { initial: 100, daily: 0 }; // Custom users don't need daily resets
      default:
        return { initial: 10, daily: 5 };
    }
  };

  useEffect(() => {
    if (user) {
      fetchCredits();
      // Check for daily reset on component mount
      checkAndResetDailyCredits();
    }
  }, [user]);

  return {
    credits,
    loading,
    error,
    fetchCredits,
    deductCredits,
    checkAndResetDailyCredits,
    getCreditsForPlan
  };
};
