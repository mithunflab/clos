
import { useState, useCallback, useEffect } from 'react';
import { useWorkflowStorage } from './useWorkflowStorage';
import { useAutoSave } from './useAutoSave';

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
  const [workflowData, setWorkflowData] = useState<any>(null);
  
  const { loadWorkflow, updateDeploymentStatus } = useWorkflowStorage();

  // Auto-save functionality
  const { saving } = useAutoSave({
    workflowId: workflowId || '',
    workflowData,
    chatHistory,
    delay: 2000
  });

  const updateWorkflowData = useCallback((newData: any) => {
    console.log('🔄 Updating workflow data:', newData);
    setWorkflowData(newData);
  }, []);

  const updateChatHistory = useCallback((newChat: any[]) => {
    console.log('🔄 Updating chat history:', newChat.length, 'messages');
    setChatHistory(newChat);
  }, []);

  const saveConfiguration = useCallback(async (config: any, deploymentSettings?: any, chat?: any[]) => {
    if (!workflowId) return false;

    try {
      setIsLoading(true);
      setError(null);

      console.log('💾 Saving workflow configuration:', { 
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

      setConfiguration(configData);
      setWorkflowData(config);
      if (chat) setChatHistory(chat);
      
      console.log('✅ Configuration saved successfully to local state');
      return true;
      
    } catch (err: any) {
      console.error('❌ Error saving configuration:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [workflowId]);

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
      
      console.log('✅ Nodes processed and ready for auto-save:', nodesToSave);
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

      console.log('📥 Loading workflow configuration from Supabase:', workflowId);

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
        setWorkflowData(data.workflow);
        setChatHistory(data.chat || []);
        console.log('✅ Configuration loaded from Supabase:', configData);
      } else {
        console.log('ℹ️ No existing configuration found for workflow:', workflowId);
        // Initialize empty workflow data
        setWorkflowData({
          name: 'Untitled Workflow',
          nodes: [],
          connections: {}
        });
      }
    } catch (err: any) {
      console.error('❌ Error loading configuration:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Initialize empty workflow data on error
      setWorkflowData({
        name: 'Untitled Workflow',
        nodes: [],
        connections: {}
      });
    } finally {
      setIsLoading(false);
    }
  }, [workflowId, loadWorkflow]);

  const loadNodes = useCallback(async () => {
    if (!workflowId) return;
    console.log('✅ Nodes loaded with configuration');
  }, [workflowId]);

  // Auto-load configuration when workflowId changes
  useEffect(() => {
    if (workflowId) {
      loadConfiguration();
    }
  }, [workflowId, loadConfiguration]);

  return {
    configuration,
    nodes,
    isLoading: isLoading || saving,
    error,
    chatHistory,
    workflowData,
    saveConfiguration,
    saveNodes,
    loadConfiguration,
    loadNodes,
    updateWorkflowData,
    updateChatHistory,
    saving
  };
};
