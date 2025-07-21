
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface N8nDeployment {
  id: string;
  user_id: string;
  workflow_id: string;
  n8n_workflow_id: string;
  deployment_status: 'pending' | 'deploying' | 'deployed' | 'active' | 'inactive' | 'error';
  deployment_url: string | null;
  created_at: string;
  updated_at: string;
}

export const useN8nDeployments = () => {
  const [deployments, setDeployments] = useState<N8nDeployment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const getDeployment = async (workflowId: string) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('n8n_deployments')
        .select('*')
        .eq('user_id', user.id)
        .eq('workflow_id', workflowId)
        .maybeSingle();

      if (error) throw error;
      return data as N8nDeployment | null;
    } catch (err) {
      console.error('Error fetching deployment:', err);
      return null;
    }
  };

  const createOrUpdateDeployment = async (
    workflowId: string, 
    n8nWorkflowId: string, 
    deploymentUrl?: string
  ) => {
    if (!user) return false;

    try {
      setLoading(true);
      setError(null);

      // Check if deployment exists
      const existingDeployment = await getDeployment(workflowId);

      if (existingDeployment) {
        // Update existing deployment
        const { error } = await supabase
          .from('n8n_deployments')
          .update({
            n8n_workflow_id: n8nWorkflowId,
            deployment_status: 'active',
            deployment_url: deploymentUrl || null
          })
          .eq('user_id', user.id)
          .eq('workflow_id', workflowId);

        if (error) throw error;
      } else {
        // Create new deployment
        const { error } = await supabase
          .from('n8n_deployments')
          .insert({
            user_id: user.id,
            workflow_id: workflowId,
            n8n_workflow_id: n8nWorkflowId,
            deployment_status: 'active',
            deployment_url: deploymentUrl || null
          });

        if (error) throw error;
      }

      return true;
    } catch (err) {
      console.error('Error creating/updating deployment:', err);
      setError(err instanceof Error ? err.message : 'Failed to manage deployment');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateDeploymentStatus = async (workflowId: string, status: N8nDeployment['deployment_status']) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('n8n_deployments')
        .update({ deployment_status: status })
        .eq('user_id', user.id)
        .eq('workflow_id', workflowId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error updating deployment status:', err);
      return false;
    }
  };

  return {
    deployments,
    loading,
    error,
    getDeployment,
    createOrUpdateDeployment,
    updateDeploymentStatus
  };
};
