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

  const validateWorkflowNodes = (workflow: any) => {
    if (!workflow.nodes) return { isValid: true, unsupportedNodes: [] };

    const unsupportedNodeTypes = [
      'n8n-nodes-base.groq', // Groq node might not be available
      // Add other potentially unsupported nodes here
    ];

    const unsupportedNodes = workflow.nodes.filter((node: any) => 
      unsupportedNodeTypes.includes(node.type)
    );

    return {
      isValid: unsupportedNodes.length === 0,
      unsupportedNodes: unsupportedNodes.map((node: any) => ({
        name: node.name,
        type: node.type
      }))
    };
  };

  const replaceUnsupportedNodes = (workflow: any) => {
    if (!workflow.nodes) return workflow;

    const nodeReplacements: { [key: string]: any } = {
      'n8n-nodes-base.groq': {
        type: 'n8n-nodes-base.httpRequest',
        name: 'Groq API',
        parameters: {
          url: 'https://api.groq.com/openai/v1/chat/completions',
          method: 'POST',
          headers: {
            'Authorization': 'Bearer {{ $credentials.groqApi.apiKey }}',
            'Content-Type': 'application/json'
          },
          body: {
            model: 'llama3-8b-8192',
            messages: '{{ $json.messages }}',
            temperature: 0.7
          }
        }
      }
    };

    const updatedWorkflow = { ...workflow };
    updatedWorkflow.nodes = workflow.nodes.map((node: any) => {
      if (nodeReplacements[node.type]) {
        const replacement = nodeReplacements[node.type];
        return {
          ...node,
          type: replacement.type,
          parameters: {
            ...node.parameters,
            ...replacement.parameters
          }
        };
      }
      return node;
    });

    return updatedWorkflow;
  };

  const ensureNodeCredentials = (workflow: any) => {
    if (!workflow.nodes) return workflow;

    const updatedWorkflow = { ...workflow };
    updatedWorkflow.nodes = workflow.nodes.map((node: any) => {
      // Ensure nodes that require credentials have them properly set
      if (node.type === 'n8n-nodes-base.telegramTrigger' || node.type === 'n8n-nodes-base.telegram') {
        return {
          ...node,
          credentials: {
            telegramApi: {
              id: 'telegram_credentials',
              name: 'Telegram Bot Credentials'
            }
          }
        };
      }
      
      if (node.type === 'n8n-nodes-base.httpRequest' && node.name?.includes('Groq')) {
        return {
          ...node,
          credentials: {
            groqApi: {
              id: 'groq_credentials',
              name: 'Groq API Credentials'
            }
          }
        };
      }
      
      return node;
    });

    return updatedWorkflow;
  };

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

      // Validate workflow nodes
      const validation = validateWorkflowNodes(workflow);
      if (!validation.isValid) {
        console.warn('⚠️ Unsupported nodes detected:', validation.unsupportedNodes);
        // Replace unsupported nodes with compatible alternatives
        workflow = replaceUnsupportedNodes(workflow);
        console.log('🔄 Replaced unsupported nodes with HTTP Request alternatives');
      }

      // Ensure proper credential assignment
      workflow = ensureNodeCredentials(workflow);
      console.log('🔐 Ensured node credentials are properly assigned');

      const cleanedWorkflow = cleanWorkflowForN8n(workflow);

      // Check if we have an existing deployment
      const existingDeployment = await getDeployment(workflowId);
      
      console.log('🔍 Existing deployment check:', existingDeployment);

      // Always pass the current config to the edge function
      const currentConfig = config;
      
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
        
        // Check if the error is about credentials
        if (error.message && error.message.includes('credentials')) {
          throw new Error(`Deployment failed: Some nodes are missing required credentials. Please configure all node credentials before deployment.`);
        }
        
        // Check if the error is about unrecognized node types
        if (error.message && error.message.includes('Unrecognized node type')) {
          const nodeType = error.message.match(/Unrecognized node type: ([^\s"]+)/)?.[1];
          throw new Error(`Unsupported node type "${nodeType}". This node is not available in the current N8N instance. Please use alternative nodes or install the required community package.`);
        }
        
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
        } else if ('n8n_url' in currentConfig && currentConfig.n8n_url) {
          // Use custom N8N URL - only if currentConfig has n8n_url property
          const baseUrl = currentConfig.n8n_url.replace(/\/$/, ''); // Remove trailing slash
          deploymentUrl = `${baseUrl}/workflow/${realWorkflowId}`;
        }
      }

      console.log('🔗 Real N8N deployment URL:', deploymentUrl);
      console.log('🆔 Real N8N workflow ID:', realWorkflowId);
      
      // Update database with deployment information
      const { error: updateError } = await supabase
        .from('workflow_data')
        .update({
          n8n_workflow_id: realWorkflowId,
          n8n_url: deploymentUrl,
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
      const currentConfig = config;

      const { data, error } = await supabase.functions.invoke('generate-n8n-workflow', {
        body: {
          action: 'activate',
          workflowId: deploymentStatus.deployment_id,
          n8nConfig: currentConfig
        }
      });

      if (error) {
        console.error('❌ Activation error:', error);
        
        // Provide more specific error messages for credential issues
        if (error.message && error.message.includes('Node does not have any credentials set')) {
          throw new Error('Cannot activate workflow: Some nodes are missing required credentials. Please configure all node credentials before activation.');
        }
        
        // Provide more specific error messages
        if (error.message && error.message.includes('Unrecognized node type')) {
          const nodeType = error.message.match(/Unrecognized node type: ([^\s"]+)/)?.[1];
          throw new Error(`Cannot activate workflow: Unsupported node type "${nodeType}". Please redeploy the workflow with compatible nodes.`);
        }
        
        if (error.message && error.message.includes('404')) {
          throw new Error('Workflow not found in N8N. Please redeploy the workflow first.');
        }
        
        throw new Error(error.message || 'Failed to activate workflow');
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to activate workflow');
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
