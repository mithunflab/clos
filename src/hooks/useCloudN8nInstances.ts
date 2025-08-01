
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

interface DeploymentLog {
  id: string;
  status: string;
  createdAt: string;
  finishedAt?: string;
  commitId?: string;
  commitMessage?: string;
}

export const useCloudN8nInstances = () => {
  const [instances, setInstances] = useState<CloudN8nInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [deploymentLogs, setDeploymentLogs] = useState<DeploymentLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const { user } = useAuth();

  const checkN8nAccess = async () => {
    if (!user) return false;

    try {
      // Check if user has purchased N8N instance
      const { data: purchases, error: purchaseError } = await supabase
        .from('purchases')
        .select('*')
        .eq('user_id', user.id)
        .eq('purchase_type', 'n8n_instance')
        .eq('status', 'completed');

      if (purchaseError) throw purchaseError;

      return purchases && purchases.length > 0;
    } catch (err) {
      console.error('Error checking N8N access:', err);
      return false;
    }
  };

  const fetchInstances = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Check if user has access to N8N instances
      const accessGranted = await checkN8nAccess();
      setHasAccess(accessGranted);

      if (!accessGranted) {
        setInstances([]);
        setLoading(false);
        return;
      }

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

  const listRenderServices = async () => {
    if (!user) return { success: false, error: 'User not authenticated' };

    try {
      const { data, error } = await supabase.functions.invoke('n8n-cloud-manager', {
        body: {
          action: 'list-services'
        }
      });

      if (error) throw error;

      return {
        success: true,
        services: data.services
      };
    } catch (err) {
      console.error('Error listing Render services:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to list services' 
      };
    }
  };

  const getDeploymentLogs = async (renderServiceId: string) => {
    if (!user) return { success: false, error: 'User not authenticated' };

    try {
      setLogsLoading(true);
      
      const { data, error } = await supabase.functions.invoke('n8n-cloud-manager', {
        body: {
          action: 'get-deployment-logs',
          renderServiceId
        }
      });

      if (error) throw error;

      setDeploymentLogs(data.deployments || []);
      
      return {
        success: true,
        deployments: data.deployments,
        logsUrl: `https://api.render.com/v1/services/${renderServiceId}/deploys?limit=20`
      };
    } catch (err) {
      console.error('Error fetching deployment logs:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to fetch deployment logs' 
      };
    } finally {
      setLogsLoading(false);
    }
  };

  const createInstance = async (instanceName: string, username: string, password: string) => {
    if (!user) return { success: false, error: 'User not authenticated' };

    try {
      console.log('Creating N8N instance:', { instanceName, username, passwordLength: password.length });
      
      // Check if user has access first
      const accessGranted = await checkN8nAccess();
      if (!accessGranted) {
        setError('N8N access not purchased. Please purchase an N8N instance first.');
        return { success: false, error: 'N8N access not purchased' };
      }

      // Create database entry first
      const { data: instanceData, error: dbError } = await supabase
        .from('cloud_n8n_instances')
        .insert({
          user_id: user.id,
          instance_name: instanceName,
          status: 'creating'
        })
        .select()
        .single();

      if (dbError) throw dbError;

      console.log('Database entry created:', instanceData);

      // Call edge function to create Render service
      const { data, error: deployError } = await supabase.functions.invoke('n8n-cloud-manager', {
        body: {
          action: 'create-n8n-instance',
          instanceName,
          instanceId: instanceData.id,
          username,
          password
        }
      });

      if (deployError) {
        console.error('Deployment error:', deployError);
        // Update status to error
        await supabase
          .from('cloud_n8n_instances')
          .update({ status: 'error' })
          .eq('id', instanceData.id);
        
        throw new Error(deployError.message || 'Failed to deploy instance');
      }

      if (!data?.success) {
        console.error('Deployment failed:', data?.error);
        // Update status to error
        await supabase
          .from('cloud_n8n_instances')
          .update({ status: 'error' })
          .eq('id', instanceData.id);
        
        throw new Error(data?.error || 'Failed to create instance');
      }

      console.log('Instance created successfully:', data);

      // Set initial deployment logs if available
      if (data.deploymentLogs) {
        setDeploymentLogs(data.deploymentLogs);
      }

      await fetchInstances();
      return { 
        success: true, 
        serviceUrl: data.serviceUrl,
        credentials: data.credentials,
        deploymentLogs: data.deploymentLogs,
        logsUrl: data.logsUrl
      };
    } catch (err) {
      console.error('Error creating N8N instance:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create instance';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const checkDeploymentStatus = async (instanceId: string) => {
    if (!user) return { success: false, error: 'User not authenticated' };

    try {
      console.log('Checking deployment status for instance:', instanceId);
      
      const { data, error } = await supabase.functions.invoke('n8n-cloud-manager', {
        body: {
          action: 'check-deployment-status',
          instanceId
        }
      });

      if (error) throw error;

      console.log('Status check result:', data);

      return {
        success: true,
        status: data.status,
        isActive: data.isActive
      };
    } catch (err) {
      console.error('Error checking deployment status:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to check status' 
      };
    }
  };

  const deleteInstance = async (instanceId: string, renderServiceId?: string) => {
    if (!user) return false;

    try {
      console.log('Deleting instance:', { instanceId, renderServiceId });
      
      // Delete from Render first if we have a service ID
      if (renderServiceId) {
        const { data, error } = await supabase.functions.invoke('n8n-cloud-manager', {
          body: {
            action: 'delete-n8n-instance',
            renderServiceId
          }
        });

        if (error) {
          console.error('Error deleting from Render:', error);
          // Continue with database deletion even if Render deletion fails
        }
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('cloud_n8n_instances')
        .delete()
        .eq('id', instanceId)
        .eq('user_id', user.id);

      if (dbError) throw dbError;

      await fetchInstances();
      return true;
    } catch (err) {
      console.error('Error deleting N8N instance:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete instance');
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
    hasAccess,
    deploymentLogs,
    logsLoading,
    createInstance,
    listRenderServices,
    getDeploymentLogs,
    checkDeploymentStatus,
    deleteInstance,
    refetch: fetchInstances
  };
};
