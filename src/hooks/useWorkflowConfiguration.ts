
import { useState, useCallback } from 'react';
import { useGitHubIntegration } from './useGitHubIntegration';

interface WorkflowConfiguration {
  id: string;
  workflow_id: string;
  configuration: any;
  ai_model: string;
  deployment_settings: any;
  created_at: string;
  updated_at: string;
}

interface WorkflowNode {
  id: string;
  workflow_id: string;
  node_uuid: string;
  node_name: string;
  node_type: string;
  parameters: any;
  position: [number, number];
  created_at: string;
  updated_at: string;
}

export const useWorkflowConfiguration = (workflowId: string | null) => {
  const [configuration, setConfiguration] = useState<WorkflowConfiguration | null>(null);
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  
  const { createWorkflowRepository, updateWorkflow, loadWorkflow, getUserWorkflows } = useGitHubIntegration();

  const saveConfiguration = useCallback(async (config: any, deploymentSettings?: any, chat?: any[]) => {
    if (!workflowId) return false;

    try {
      setIsLoading(true);
      setError(null);

      console.log('💾 Saving workflow configuration with GitHub integration:', { 
        workflowId, 
        config, 
        chat: chat?.length || 0,
        hasNodes: !!config.nodes?.length 
      });

      const configData = {
        id: `config_${workflowId}`,
        workflow_id: workflowId,
        configuration: config,
        ai_model: 'gemini-2.0-flash-exp',
        deployment_settings: deploymentSettings || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Enhanced workflow data for GitHub storage
      const workflowData = {
        name: config.name || 'Untitled Workflow',
        workflow: config,
        chat: chat || chatHistory,
        nodes: config.nodes || [],
        connections: config.connections || {},
        metadata: {
          created_at: new Date().toISOString(),
          workflow_id: workflowId,
          ai_model: 'gemini-2.0-flash-exp',
          version: '1.0.0',
          description: config.description || 'AI Generated Workflow'
        }
      };

      let result;
      console.log('🔄 Creating/updating workflow in GitHub with enhanced data...');
      
      try {
        // Always try to create first, then update if it exists
        result = await createWorkflowRepository(workflowData, workflowId);
        console.log('✅ Workflow created successfully in GitHub:', result);
      } catch (createError: any) {
        console.log('ℹ️ Create failed, trying to update existing workflow:', createError.message);
        try {
          result = await updateWorkflow(workflowData, workflowId);
          console.log('✅ Workflow updated successfully in GitHub:', result);
        } catch (updateError) {
          console.error('❌ Both create and update failed:', updateError);
          throw updateError;
        }
      }

      setConfiguration(configData);
      if (chat) setChatHistory(chat);
      
      console.log('✅ Configuration saved successfully with GitHub integration:', { 
        configData, 
        result,
        githubRepo: result?.repository
      });
      
      return true;
    } catch (err: any) {
      console.error('❌ Error saving configuration with GitHub:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [workflowId, createWorkflowRepository, updateWorkflow, chatHistory]);

  const saveNodes = useCallback(async (workflowNodes: any[]) => {
    if (!workflowId) return false;

    try {
      setIsLoading(true);
      setError(null);

      const nodesToSave = workflowNodes.map(node => ({
        id: `node_${node.id}`,
        workflow_id: workflowId,
        node_uuid: node.id,
        node_name: node.name,
        node_type: node.type,
        parameters: node.parameters || {},
        position: node.position || [0, 0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      setNodes(nodesToSave);
      
      console.log('✅ Nodes processed and ready for GitHub sync:', nodesToSave);
      return true;
    } catch (err: any) {
      console.error('❌ Error saving nodes:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [workflowId]);

  const loadConfiguration = useCallback(async () => {
    if (!workflowId) return;

    try {
      setIsLoading(true);
      setError(null);

      console.log('📥 Loading workflow configuration from GitHub:', workflowId);

      const data = await loadWorkflow(workflowId);
      
      if (data.success) {
        const configData = {
          id: `config_${workflowId}`,
          workflow_id: workflowId,
          configuration: data.workflow,
          ai_model: 'gemini-2.0-flash-exp',
          deployment_settings: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        setConfiguration(configData);
        setChatHistory(data.chat || []);
        console.log('✅ Configuration loaded from GitHub:', configData);
      } else {
        console.log('ℹ️ No existing configuration found for workflow:', workflowId);
      }
    } catch (err: any) {
      console.error('❌ Error loading configuration:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [workflowId, loadWorkflow]);

  const loadNodes = useCallback(async () => {
    if (!workflowId) return;
    console.log('✅ Nodes loaded with configuration');
  }, [workflowId]);

  return {
    configuration,
    nodes,
    isLoading,
    error,
    chatHistory,
    saveConfiguration,
    saveNodes,
    loadConfiguration,
    loadNodes
  };
};
