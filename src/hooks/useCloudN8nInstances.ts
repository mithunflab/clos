
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface CloudN8nInstance {
  id: string;
  user_id: string;
  instance_name: string;
  instance_url: string | null;
  render_service_id: string | null;
  status: 'creating' | 'active' | 'error' | 'inactive';
  created_at: string;
  updated_at: string;
}

export const useCloudN8nInstances = () => {
  const [instances, setInstances] = useState<CloudN8nInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchInstances = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cloud_n8n_instances')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Type cast the data to ensure proper typing
      const typedData: CloudN8nInstance[] = (data || []).map(item => ({
        ...item,
        status: item.status as 'creating' | 'active' | 'error' | 'inactive'
      }));
      
      setInstances(typedData);
    } catch (err) {
      console.error('Error fetching N8N instances:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch instances');
    } finally {
      setLoading(false);
    }
  };

  const createInstance = async (instanceName: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('cloud_n8n_instances')
        .insert({
          user_id: user.id,
          instance_name: instanceName,
          status: 'creating'
        });

      if (error) throw error;
      await fetchInstances();
      return true;
    } catch (err) {
      console.error('Error creating N8N instance:', err);
      setError(err instanceof Error ? err.message : 'Failed to create instance');
      return false;
    }
  };

  useEffect(() => {
    fetchInstances();
  }, [user]);

  return {
    instances,
    loading,
    error,
    createInstance,
    refetch: fetchInstances
  };
};
