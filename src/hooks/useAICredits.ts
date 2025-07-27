
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UserCredits {
  id: string;
  user_id: string;
  current_credits: number;
  total_credits_used: number;
  last_credit_reset: string;
  created_at: string;
  updated_at: string;
}

export const useAICredits = () => {
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchCredits = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ai_credits')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Credits don't exist, create them
          const { data: newCredits, error: createError } = await supabase
            .from('ai_credits')
            .insert({
              user_id: user.id,
              current_credits: 100,
              total_credits_used: 0
            })
            .select()
            .single();

          if (createError) throw createError;
          setCredits(newCredits);
        } else {
          throw error;
        }
      } else {
        setCredits(data);
      }
    } catch (err) {
      console.error('Error fetching credits:', err);
      setError(err instanceof Error ? err.message : 'Failed to load credits');
    } finally {
      setLoading(false);
    }
  };

  const deductCredit = async (amount: number = 1) => {
    if (!user || !credits) return false;

    try {
      const newCredits = Math.max(0, credits.current_credits - amount);
      const newTotalUsed = credits.total_credits_used + amount;

      const { error } = await supabase
        .from('ai_credits')
        .update({
          current_credits: newCredits,
          total_credits_used: newTotalUsed
        })
        .eq('user_id', user.id);

      if (error) throw error;
      
      await fetchCredits();
      return true;
    } catch (err) {
      console.error('Error deducting credit:', err);
      setError(err instanceof Error ? err.message : 'Failed to deduct credit');
      return false;
    }
  };

  useEffect(() => {
    fetchCredits();
  }, [user]);

  return {
    credits,
    loading,
    error,
    deductCredit,
    refetch: fetchCredits
  };
};
