
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface CloudN8nInstance {
  id: string;
  user_id: string;
  instance_name: string;
  render_service_id: string | null;
  render_service_url: string | null;
  basic_auth_user: string;
  basic_auth_password: string;
  deployment_status: string;
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
      setInstances(data || []);
    } catch (err) {
      console.error('Error fetching N8N instances:', err);
      setError(err instanceof Error ? err.message : 'Failed to load N8N instances');
    } finally {
      setLoading(false);
    }
  };

  const createInstance = async (instanceName: string) => {
    if (!user) return false;

    try {
      setLoading(true);
      setError(null);

      // Generate basic auth credentials
      const basicAuthUser = `n8n_${Date.now()}`;
      const basicAuthPassword = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

      const { data: instanceData, error: insertError } = await supabase
        .from('cloud_n8n_instances')
        .insert({
          user_id: user.id,
          instance_name: instanceName,
          basic_auth_user: basicAuthUser,
          basic_auth_password: basicAuthPassword,
          deployment_status: 'pending'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Deploy to Render via edge function
      const { data: deployData, error: deployError } = await supabase.functions.invoke('deploy-cloud-n8n', {
        body: {
          instanceId: instanceData.id,
          instanceName: instanceName,
          basicAuthUser: basicAuthUser,
          basicAuthPassword: basicAuthPassword
        }
      });

      if (deployError) {
        console.error('Deployment error:', deployError);
        // Update status to error
        await supabase
          .from('cloud_n8n_instances')
          .update({ deployment_status: 'error' })
          .eq('id', instanceData.id);
        throw deployError;
      }

      if (!deployData?.success) {
        throw new Error(deployData?.error || 'Deployment failed');
      }

      await fetchInstances();
      return true;
    } catch (err) {
      console.error('Error creating N8N instance:', err);
      setError(err instanceof Error ? err.message : 'Failed to create N8N instance');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateInstance = async (instanceId: string, updates: Partial<CloudN8nInstance>) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('cloud_n8n_instances')
        .update(updates)
        .eq('id', instanceId)
        .eq('user_id', user.id);

      if (error) throw error;
      
      await fetchInstances();
      return true;
    } catch (err) {
      console.error('Error updating N8N instance:', err);
      setError(err instanceof Error ? err.message : 'Failed to update N8N instance');
      return false;
    }
  };

  const deleteInstance = async (instanceId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('cloud_n8n_instances')
        .delete()
        .eq('id', instanceId)
        .eq('user_id', user.id);

      if (error) throw error;
      
      await fetchInstances();
      return true;
    } catch (err) {
      console.error('Error deleting N8N instance:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete N8N instance');
      return false;
    }
  };

  useEffect(() => {
    fetchInstances();
  }, [user]);

  // Set up realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('cloud_n8n_instances_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cloud_n8n_instances',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchInstances();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    instances,
    loading,
    error,
    createInstance,
    updateInstance,
    deleteInstance,
    refetch: fetchInstances
  };
};
