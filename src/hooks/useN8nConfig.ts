
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface N8nConfig {
  id: string;
  user_id: string;
  use_casel_cloud: boolean;
  n8n_url: string | null;
  n8n_api_key: string | null;
  created_at: string;
  updated_at: string;
}

export const useN8nConfig = () => {
  const [config, setConfig] = useState<N8nConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchConfig = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_n8n_config')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setConfig(data as N8nConfig);
      } else {
        // Create default config
        const { data: newConfig, error: createError } = await supabase
          .from('user_n8n_config')
          .insert({
            user_id: user.id,
            use_casel_cloud: true
          })
          .select()
          .single();

        if (createError) throw createError;
        setConfig(newConfig as N8nConfig);
      }
    } catch (err) {
      console.error('Error fetching N8N config:', err);
      setError(err instanceof Error ? err.message : 'Failed to load N8N config');
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (updates: Partial<Pick<N8nConfig, 'use_casel_cloud' | 'n8n_url' | 'n8n_api_key'>>) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('user_n8n_config')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;
      
      await fetchConfig();
      return true;
    } catch (err) {
      console.error('Error updating N8N config:', err);
      setError(err instanceof Error ? err.message : 'Failed to update N8N config');
      return false;
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [user]);

  return {
    config,
    loading,
    error,
    updateConfig,
    refetch: fetchConfig
  };
};
