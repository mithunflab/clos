
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  nodes: any[];
  connections: any;
  settings: any;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

interface N8nExecution {
  id: string;
  workflowId: string;
  mode: string;
  status: 'new' | 'running' | 'success' | 'error' | 'canceled' | 'crashed' | 'waiting';
  startedAt: string;
  stoppedAt?: string;
  executionTime?: number;
  finished?: boolean;
}

interface ExecutionLog {
  id: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  timestamp: string;
  data?: any;
}

export const useN8nWorkflowManager = (workflowId: string | null) => {
  const [workflow, setWorkflow] = useState<N8nWorkflow | null>(null);
  const [executions, setExecutions] = useState<N8nExecution[]>([]);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // Enhanced API call wrapper
  const apiCall = useCallback(async (action: string, payload: any = {}) => {
    try {
      console.log(`🔄 N8n Manager API: ${action}`, payload);
      
      const { data, error: supabaseError } = await supabase.functions.invoke('generate-n8n-workflow', {
        body: {
          action,
          workflowId: workflowId,
          ...payload
        }
      });

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      console.log(`✅ N8n Manager Response: ${action}`, data);
      return data;
      
    } catch (err) {
      console.error(`❌ N8n Manager Error: ${action}`, err);
      setError(err instanceof Error ? err.message : 'API call failed');
      throw err;
    }
  }, [workflowId]);

  // Add execution log
  const addLog = useCallback((log: Omit<ExecutionLog, 'id' | 'timestamp'>) => {
    const newLog: ExecutionLog = {
      ...log,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    };
    
    setExecutionLogs(prev => [newLog, ...prev].slice(0, 100));
    console.log('📋 Log added:', newLog);
  }, []);

  // Fetch workflow information
  const fetchWorkflowInfo = useCallback(async () => {
    if (!workflowId) return null;

    try {
      setIsLoading(true);
      setError(null);

      const data = await apiCall('workflow-info');
      
      if (data.success && data.workflow) {
        setWorkflow(data.workflow);
        addLog({
          level: 'info',
          message: `Workflow "${data.workflow.name}" loaded - ${data.workflow.nodes?.length || 0} nodes`
        });
        return data.workflow;
      }
      
      return null;

    } catch (err) {
      addLog({
        level: 'error',
        message: `Failed to fetch workflow info: ${err.message}`
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [workflowId, apiCall, addLog]);

  // Fetch executions
  const fetchExecutions = useCallback(async (limit: number = 50) => {
    if (!workflowId) return [];

    try {
      const data = await apiCall('executions', { limit });

      if (data.success) {
        setExecutions(data.executions || []);
        return data.executions || [];
      }
      
      return [];

    } catch (err) {
      addLog({
        level: 'error',
        message: `Failed to fetch executions: ${err.message}`
      });
      return [];
    }
  }, [workflowId, apiCall, addLog]);

  // Activate workflow
  const activateWorkflow = useCallback(async () => {
    if (!workflowId) return false;

    try {
      setIsLoading(true);
      addLog({ level: 'info', message: 'Activating workflow...' });

      const data = await apiCall('activate');

      if (data.success) {
        setWorkflow(prev => prev ? { ...prev, active: true } : null);
        addLog({ level: 'success', message: 'Workflow activated successfully' });
        return true;
      }
      
      return false;

    } catch (err) {
      addLog({
        level: 'error',
        message: `Failed to activate workflow: ${err.message}`
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [workflowId, apiCall, addLog]);

  // Deactivate workflow
  const deactivateWorkflow = useCallback(async () => {
    if (!workflowId) return false;

    try {
      setIsLoading(true);
      addLog({ level: 'info', message: 'Deactivating workflow...' });

      const data = await apiCall('deactivate');

      if (data.success) {
        setWorkflow(prev => prev ? { ...prev, active: false } : null);
        addLog({ level: 'success', message: 'Workflow deactivated successfully' });
        return true;
      }
      
      return false;

    } catch (err) {
      addLog({
        level: 'error',
        message: `Failed to deactivate workflow: ${err.message}`
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [workflowId, apiCall, addLog]);

  // Execute workflow
  const executeWorkflow = useCallback(async () => {
    if (!workflowId || isExecuting) return null;

    try {
      setIsExecuting(true);
      addLog({ level: 'info', message: 'Starting manual execution...' });

      const data = await apiCall('execute');

      if (data.success && data.executionId) {
        addLog({ 
          level: 'success', 
          message: `Execution started - ID: ${data.executionId}` 
        });
        
        // Refresh executions after a delay
        setTimeout(() => fetchExecutions(), 2000);
        
        return data.executionId;
      }
      
      return null;

    } catch (err) {
      addLog({
        level: 'error',
        message: `Failed to execute workflow: ${err.message}`
      });
      return null;
    } finally {
      setIsExecuting(false);
    }
  }, [workflowId, isExecuting, apiCall, addLog, fetchExecutions]);

  // Stop execution
  const stopExecution = useCallback(async (executionId: string) => {
    try {
      addLog({ level: 'info', message: `Stopping execution ${executionId}...` });

      const data = await apiCall('stop-execution', { executionId });

      if (data.success) {
        addLog({ level: 'warn', message: `Execution ${executionId} stopped` });
        setTimeout(() => fetchExecutions(), 1000);
        return true;
      }
      
      return false;

    } catch (err) {
      addLog({
        level: 'error',
        message: `Failed to stop execution: ${err.message}`
      });
      return false;
    }
  }, [apiCall, addLog, fetchExecutions]);

  // Delete execution
  const deleteExecution = useCallback(async (executionId: string) => {
    try {
      addLog({ level: 'info', message: `Deleting execution ${executionId}...` });

      const data = await apiCall('delete-execution', { executionId });

      if (data.success) {
        addLog({ level: 'warn', message: `Execution ${executionId} deleted` });
        fetchExecutions();
        return true;
      }
      
      return false;

    } catch (err) {
      addLog({
        level: 'error',
        message: `Failed to delete execution: ${err.message}`
      });
      return false;
    }
  }, [apiCall, addLog, fetchExecutions]);

  // Get execution details
  const getExecutionDetails = useCallback(async (executionId: string) => {
    try {
      const data = await apiCall('execution-details', { executionId });

      if (data.success && data.execution) {
        addLog({ 
          level: 'info', 
          message: `Loaded details for execution ${executionId}` 
        });
        return data.execution;
      }
      
      return null;

    } catch (err) {
      addLog({
        level: 'error',
        message: `Failed to get execution details: ${err.message}`
      });
      return null;
    }
  }, [apiCall, addLog]);

  // Clear logs
  const clearLogs = useCallback(() => {
    setExecutionLogs([]);
  }, []);

  // Initialize data
  useEffect(() => {
    if (!workflowId) return;

    fetchWorkflowInfo();
    fetchExecutions();

    // Set up polling for real-time updates
    const interval = setInterval(() => {
      fetchExecutions();
    }, 15000);

    return () => clearInterval(interval);
  }, [workflowId, fetchWorkflowInfo, fetchExecutions]);

  return {
    workflow,
    executions,
    executionLogs,
    isLoading,
    error,
    isExecuting,
    fetchWorkflowInfo,
    fetchExecutions,
    activateWorkflow,
    deactivateWorkflow,
    executeWorkflow,
    stopExecution,
    deleteExecution,
    getExecutionDetails,
    clearLogs,
    addLog
  };
};
