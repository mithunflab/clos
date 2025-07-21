
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
      connections: workflow.connections || {},
      settings: {
        saveExecutionProgress: true,
        saveManualExecutions: true,
        saveDataErrorExecution: "all",
        saveDataSuccessExecution: "all",
        executionTimeout: 3600,
        timezone: "UTC",
        executionOrder: "v1"
      },
      staticData: {}
    };

    if (cleanWorkflow.nodes) {
      cleanWorkflow.nodes = cleanWorkflow.nodes.map((node: any) => ({
        id: node.id,
        name: node.name,
        type: node.type,
        position: node.position || [0, 0],
        parameters: node.parameters || {},
        typeVersion: node.typeVersion || 1,
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

      console.log('🚀 Deploying workflow to N8N with config:', config);

      const cleanedWorkflow = cleanWorkflowForN8n(workflow);

      // Check if we have an existing deployment
      const existingDeployment = await getDeployment(workflowId);
      
      console.log('🔍 Existing deployment check:', existingDeployment);

      // Ensure we always pass the current config to the edge function
      const currentConfig = config || { use_casel_cloud: true };
      
      console.log('🔧 Using N8N config for deployment:', currentConfig);

      // Call the N8N deployment function with proper configuration
      const { data, error } = await supabase.functions.invoke('generate-n8n-workflow', {
        body: {
          action: existingDeployment ? 'update' : 'deploy',
          workflow: cleanedWorkflow,
          workflowId: existingDeployment?.n8n_workflow_id || undefined,
          n8nConfig: currentConfig // Always pass current config
        }
      });

      console.log('📡 N8N API Response:', { data, error });

      if (error) {
        console.error('❌ N8N deployment error:', error);
        throw new Error(error.message || 'Failed to deploy to N8N');
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to deploy workflow to N8N');
      }

      // Use the real workflow ID returned from N8N
      const realWorkflowId = data.workflowId;
      let deploymentUrl = data.workflowUrl;

      // Construct real deployment URL based on actual config
      if (currentConfig && realWorkflowId) {
        if (currentConfig.use_casel_cloud) {
          // Use Casel Cloud URL
          deploymentUrl = `https://n8n.casel.cloud/workflow/${realWorkflowId}`;
        } else if (currentConfig.n8n_url) {
          // Use custom N8N URL
          const baseUrl = currentConfig.n8n_url.replace(/\/$/, ''); // Remove trailing slash
          deploymentUrl = `${baseUrl}/workflow/${realWorkflowId}`;
        }
      }

      console.log('🔗 Real N8N deployment URL:', deploymentUrl);
      console.log('🆔 Real N8N workflow ID:', realWorkflowId);
      
      // Update database with deployment information
      const { error: updateError } = await supabase
        .from('user_workflows')
        .update({
          n8n_workflow_id: realWorkflowId,
          deployment_url: deploymentUrl,
          deployment_status: 'deployed'
        })
        .eq('workflow_id', workflowId);

      if (updateError) {
        console.error('Failed to update workflow deployment status:', updateError);
      }
      
      // Create or update deployment in separate table
      await createOrUpdateDeployment(workflowId, realWorkflowId, deploymentUrl);
      
      await updateLocalDeploymentStatus('deployed', realWorkflowId);
      console.log('✅ Workflow deployed successfully to N8N:', {
        deploymentId: realWorkflowId,
        deploymentUrl,
        isUpdate: !!existingDeployment
      });
      
      return {
        success: true,
        workflowId: realWorkflowId,
        workflowUrl: deploymentUrl,
        message: existingDeployment ? 'Workflow updated successfully in N8N' : 'Workflow deployed successfully to N8N'
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

      console.log('🔌 Activating workflow in N8N:', deploymentStatus.deployment_id);

      // Pass current config to activation as well
      const currentConfig = config || { use_casel_cloud: true };

      const { data, error } = await supabase.functions.invoke('generate-n8n-workflow', {
        body: {
          action: 'activate',
          workflowId: deploymentStatus.deployment_id,
          n8nConfig: currentConfig
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to activate workflow');
      }

      await updateLocalDeploymentStatus('active');
      console.log('✅ Workflow activated successfully in N8N');
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
  }, [workflowId, deploymentStatus, updateLocalDeploymentStatus, config]);

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
