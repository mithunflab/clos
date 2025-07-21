
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useN8nDeployments } from './useN8nDeployments';
import { useN8nConfig } from './useN8nConfig';

interface DeploymentStatus {
  id: string;
  workflow_id: string;
  deployment_id: string | null;
  status: 'pending' | 'deploying' | 'deployed' | 'active' | 'inactive' | 'error';
  error_message: string | null;
  deployed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useWorkflowDeployment = (workflowId: string | null) => {
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { createOrUpdateDeployment, getDeployment, updateDeploymentStatus } = useN8nDeployments();
  const { config } = useN8nConfig();

  const updateLocalDeploymentStatus = useCallback(async (
    status: DeploymentStatus['status'],
    deploymentId?: string,
    errorMessage?: string
  ) => {
    if (!workflowId) return false;

    try {
      const statusData: DeploymentStatus = {
        id: `deployment_${workflowId}`,
        workflow_id: workflowId,
        deployment_id: deploymentId || null,
        status,
        error_message: errorMessage || null,
        deployed_at: (status === 'deployed' || status === 'active') ? new Date().toISOString() : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setDeploymentStatus(statusData);
      
      // Update database
      if (workflowId && deploymentId) {
        await updateDeploymentStatus(workflowId, status);
      }
      
      console.log('✅ Deployment status updated:', statusData);
      return true;
    } catch (err) {
      console.error('❌ Error updating deployment status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  }, [workflowId, updateDeploymentStatus]);

  const cleanWorkflowForN8n = (workflow: any) => {
    const cleanWorkflow = {
      name: workflow.name,
      nodes: workflow.nodes || [],
      connections: workflow.connections || {}
    };

    if (cleanWorkflow.nodes) {
      cleanWorkflow.nodes = cleanWorkflow.nodes.map((node: any) => ({
        id: node.id,
        name: node.name,
        type: node.type,
        position: node.position || [0, 0],
        parameters: node.parameters || {},
        ...(node.credentials && { credentials: node.credentials })
      }));
    }

    return cleanWorkflow;
  };

  const deployWorkflow = useCallback(async (workflow: any) => {
    if (!workflowId || !workflow) return false;

    try {
      setIsDeploying(true);
      setError(null);

      await updateLocalDeploymentStatus('deploying');

      console.log('🚀 Deploying workflow to N8N:', workflowId);
      console.log('Using Casel Cloud:', config?.use_casel_cloud);

      const cleanedWorkflow = cleanWorkflowForN8n(workflow);

      // Check if we have an existing deployment
      const existingDeployment = await getDeployment(workflowId);
      
      // In a real implementation, this would call the appropriate N8N API
      // For now, we'll simulate the deployment
      await new Promise(resolve => setTimeout(resolve, 2000));

      const mockDeploymentId = existingDeployment?.n8n_workflow_id || `n8n_${workflowId}_${Date.now()}`;
      const deploymentUrl = config?.use_casel_cloud 
        ? `https://casel-n8n.example.com/workflow/${mockDeploymentId}`
        : `${config?.n8n_url}/workflow/${mockDeploymentId}`;
      
      // Create or update deployment in database
      await createOrUpdateDeployment(workflowId, mockDeploymentId, deploymentUrl);
      
      await updateLocalDeploymentStatus('deployed', mockDeploymentId);
      console.log('✅ Workflow deployed successfully:', mockDeploymentId);
      
      return {
        success: true,
        workflowId: mockDeploymentId,
        workflowUrl: deploymentUrl,
        message: existingDeployment ? 'Workflow updated successfully' : 'Workflow deployed successfully'
      };

    } catch (err) {
      console.error('❌ Error deploying workflow:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      await updateLocalDeploymentStatus('error', undefined, errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsDeploying(false);
    }
  }, [workflowId, updateLocalDeploymentStatus, config, getDeployment, createOrUpdateDeployment]);

  const activateWorkflow = useCallback(async () => {
    if (!workflowId || !deploymentStatus?.deployment_id) return false;

    try {
      setIsDeploying(true);
      setError(null);

      console.log('🔌 Activating workflow:', deploymentStatus.deployment_id);

      // Simulate activation
      await new Promise(resolve => setTimeout(resolve, 1000));

      await updateLocalDeploymentStatus('active');
      console.log('✅ Workflow activated successfully');
      return true;

    } catch (err) {
      console.error('❌ Error activating workflow:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      await updateLocalDeploymentStatus('error', undefined, errorMessage);
      return false;
    } finally {
      setIsDeploying(false);
    }
  }, [workflowId, deploymentStatus, updateLocalDeploymentStatus]);

  const loadDeploymentStatus = useCallback(async () => {
    if (!workflowId) return;

    try {
      // Load from database first
      const existingDeployment = await getDeployment(workflowId);
      
      if (existingDeployment) {
        const statusData: DeploymentStatus = {
          id: existingDeployment.id,
          workflow_id: existingDeployment.workflow_id,
          deployment_id: existingDeployment.n8n_workflow_id,
          status: existingDeployment.deployment_status as DeploymentStatus['status'],
          error_message: null,
          deployed_at: existingDeployment.created_at,
          created_at: existingDeployment.created_at,
          updated_at: existingDeployment.updated_at
        };
        setDeploymentStatus(statusData);
      } else {
        // Initialize with pending status
        await updateLocalDeploymentStatus('pending');
      }
      
      console.log('✅ Deployment status loaded');
    } catch (err) {
      console.error('❌ Error loading deployment status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [workflowId, getDeployment, updateLocalDeploymentStatus]);

  return {
    deploymentStatus,
    isDeploying,
    error,
    deployWorkflow,
    activateWorkflow,
    updateDeploymentStatus: updateLocalDeploymentStatus,
    loadDeploymentStatus
  };
};
