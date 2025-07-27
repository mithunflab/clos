
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useN8nConfig } from './useN8nConfig';
import { useN8nDeployments } from './useN8nDeployments';
import { useCredentialStorage } from './useCredentialStorage';
import { useWorkflowStorage } from './useWorkflowStorage';

export interface WorkflowDeployment {
  id: string;
  workflow_id: string;
  status: 'pending' | 'deploying' | 'deployed' | 'error';
  deployment_url?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export const useWorkflowDeployment = () => {
  const [deployments, setDeployments] = useState<WorkflowDeployment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { config } = useN8nConfig();
  const { createOrUpdateDeployment } = useN8nDeployments();
  const { credentials } = useCredentialStorage();
  const { workflows } = useWorkflowStorage();

  const deployWorkflow = async (workflowId: string, workflowData: any) => {
    if (!user || !config) return false;

    try {
      setLoading(true);
      setError(null);

      // Use cloud deployment if using Casel Cloud
      if (config.use_casel_cloud) {
        const { data, error } = await supabase.functions.invoke('generate-n8n-workflow', {
          body: {
            workflow: workflowData,
            credentials: credentials
          }
        });

        if (error) throw error;

        if (data?.success) {
          await createOrUpdateDeployment(workflowId, data.n8nWorkflowId, data.deploymentUrl);
          return true;
        } else {
          throw new Error(data?.error || 'Deployment failed');
        }
      } else {
        // Use custom N8N instance
        if (!config.n8n_url || !config.n8n_api_key) {
          throw new Error('N8N URL and API key are required for custom deployment');
        }

        // Deploy to custom N8N instance
        const response = await fetch(`${config.n8n_url}/api/v1/workflows`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-N8N-API-KEY': config.n8n_api_key
          },
          body: JSON.stringify({
            name: workflowData.name || 'Untitled Workflow',
            nodes: workflowData.nodes || [],
            connections: workflowData.connections || {}
          })
        });

        if (!response.ok) {
          throw new Error(`Deployment failed: ${response.statusText}`);
        }

        const result = await response.json();
        await createOrUpdateDeployment(workflowId, result.id, config.n8n_url);
        return true;
      }
    } catch (err) {
      console.error('Error deploying workflow:', err);
      setError(err instanceof Error ? err.message : 'Failed to deploy workflow');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getDeploymentStatus = (workflowId: string) => {
    const deployment = deployments.find(d => d.workflow_id === workflowId);
    return deployment?.status || 'not-deployed';
  };

  // Save workflow to database
  const saveWorkflowToDatabase = async (workflowId: string, workflowName: string, workflowJson: any) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('workflow_data')
        .upsert({
          user_id: user.id,
          workflow_id: workflowId,
          workflow_name: workflowName,
          workflow_json: workflowJson
        });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error saving workflow to database:', err);
      return false;
    }
  };

  return {
    deployments,
    loading,
    error,
    deployWorkflow,
    getDeploymentStatus,
    saveWorkflowToDatabase
  };
};
