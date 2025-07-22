
import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  data?: any;
  nodeExecutionStatus?: Record<string, {
    status: string;
    startTime: string;
    endTime?: string;
    duration?: number;
  }>;
}

interface ExecutionLog {
  id: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  timestamp: string;
  data?: any;
  nodeName?: string;
  executionId?: string;
}

interface ExecutionStatistics {
  totalCount: number;
  successCount: number;
  errorCount: number;
  runningCount: number;
  averageExecutionTime: number;
  lastExecutionTime?: string;
  healthScore: number;
}

export const useN8nWorkflowManager = (workflowId: string | null) => {
  const [workflow, setWorkflow] = useState<N8nWorkflow | null>(null);
  const [executions, setExecutions] = useState<N8nExecution[]>([]);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [executionStats, setExecutionStats] = useState<ExecutionStatistics>({
    totalCount: 0,
    successCount: 0,
    errorCount: 0,
    runningCount: 0,
    averageExecutionTime: 0,
    healthScore: 100
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isRealTimeActive, setIsRealTimeActive] = useState(false);
  const pollingRef = useRef<number | null>(null);
  const wsChannelRef = useRef<any>(null);
  const pollingInterval = 10000; // 10 seconds

  // Enhanced API call wrapper with retry mechanism
  const apiCall = useCallback(async (action: string, payload: any = {}, retries = 2) => {
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
      
      // Retry mechanism for transient errors
      if (retries > 0) {
        console.log(`🔄 Retrying ${action} (${retries} attempts left)...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return apiCall(action, payload, retries - 1);
      }
      
      setError(err instanceof Error ? err.message : 'API call failed');
      throw err;
    }
  }, [workflowId]);

  // Add execution log with better timestamp formatting
  const addLog = useCallback((log: Omit<ExecutionLog, 'id' | 'timestamp'>, showToast = false) => {
    const newLog: ExecutionLog = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString()
    };
    
    setExecutionLogs(prev => [newLog, ...prev].slice(0, 100));
    console.log(`📋 Log added [${log.level.toUpperCase()}]:`, log.message);

    // Show toast for important events
    if (showToast) {
      switch (log.level) {
        case 'success':
          toast.success(log.message);
          break;
        case 'error':
          toast.error(log.message);
          break;
        case 'warn':
          toast.warning(log.message);
          break;
        case 'info':
          if (log.message.includes('started') || log.message.includes('activated')) {
            toast.info(log.message);
          }
          break;
      }
    }

    return newLog;
  }, []);

  // Real-time monitoring setup
  const setupRealTimeMonitoring = useCallback(() => {
    if (!workflowId) return () => {};

    try {
      // Clean up existing channel if any
      if (wsChannelRef.current) {
        supabase.removeChannel(wsChannelRef.current);
      }

      console.log('🔌 Setting up real-time workflow monitoring for:', workflowId);
      
      const channel = supabase
        .channel(`n8n-workflow-${workflowId}`)
        .on('broadcast', { event: 'execution' }, (payload) => {
          if (!payload.payload) return;

          const { event, data } = payload.payload;
          
          switch(event) {
            case 'execution.started':
              addLog({ 
                level: 'info', 
                message: `Execution started: ${data.executionId}`,
                executionId: data.executionId,
                data
              }, true);
              
              // Add to executions list with optimistic update
              setExecutions(prev => {
                const newExecution: N8nExecution = {
                  id: data.executionId,
                  workflowId: workflowId,
                  mode: data.mode || 'manual',
                  status: 'running',
                  startedAt: new Date().toISOString(),
                  nodeExecutionStatus: {}
                };
                return [newExecution, ...prev];
              });
              
              break;
              
            case 'execution.finished':
              addLog({ 
                level: data.status === 'success' ? 'success' : 'error', 
                message: `Execution ${data.status}: ${data.executionId} (${data.duration || 0}ms)`,
                executionId: data.executionId,
                data
              }, true);
              
              // Update execution in list
              setExecutions(prev => 
                prev.map(exec => 
                  exec.id === data.executionId 
                    ? { 
                        ...exec, 
                        status: data.status, 
                        finished: true,
                        executionTime: data.duration,
                        stoppedAt: new Date().toISOString()
                      } 
                    : exec
                )
              );
              
              break;
              
            case 'node.started':
              addLog({ 
                level: 'info', 
                message: `Node "${data.nodeName}" started execution`,
                nodeName: data.nodeName,
                executionId: data.executionId,
                data
              });
              
              // Update node status in execution
              setExecutions(prev => 
                prev.map(exec => {
                  if (exec.id === data.executionId) {
                    const nodeStatus = { ...(exec.nodeExecutionStatus || {}) };
                    nodeStatus[data.nodeName] = {
                      status: 'running',
                      startTime: new Date().toISOString()
                    };
                    return { ...exec, nodeExecutionStatus: nodeStatus };
                  }
                  return exec;
                })
              );
              
              break;
              
            case 'node.finished':
              addLog({ 
                level: data.status === 'success' ? 'success' : 'error', 
                message: `Node "${data.nodeName}" ${data.status} (${data.duration || 0}ms)`,
                nodeName: data.nodeName,
                executionId: data.executionId,
                data
              });
              
              // Update node status in execution
              setExecutions(prev => 
                prev.map(exec => {
                  if (exec.id === data.executionId) {
                    const nodeStatus = { ...(exec.nodeExecutionStatus || {}) };
                    nodeStatus[data.nodeName] = {
                      ...nodeStatus[data.nodeName],
                      status: data.status,
                      endTime: new Date().toISOString(),
                      duration: data.duration
                    };
                    return { ...exec, nodeExecutionStatus: nodeStatus };
                  }
                  return exec;
                })
              );
              
              break;
              
            case 'workflow.status':
              addLog({ 
                level: 'info', 
                message: `Workflow status changed to ${data.status}`,
                data
              }, true);
              
              // Update workflow status
              setWorkflow(prev => prev ? { ...prev, active: data.status === 'active' } : null);
              
              break;
          }
          
          // Update statistics after any event
          updateExecutionStatistics();
        })
        .subscribe((status) => {
          console.log('Real-time subscription status:', status);
          
          if (status === 'SUBSCRIBED') {
            setIsRealTimeActive(true);
            addLog({ 
              level: 'success', 
              message: 'Real-time workflow monitoring connected'
            });
          } else {
            setIsRealTimeActive(false);
            addLog({ 
              level: 'warn', 
              message: `Real-time connection status: ${status}`
            });
          }
        });
        
      wsChannelRef.current = channel;
      
      return () => {
        supabase.removeChannel(channel);
        setIsRealTimeActive(false);
      };
    } catch (err) {
      console.error('Error setting up real-time monitoring:', err);
      setIsRealTimeActive(false);
      addLog({ 
        level: 'error', 
        message: `Failed to set up real-time monitoring: ${err instanceof Error ? err.message : 'Unknown error'}`
      });
      return () => {};
    }
  }, [workflowId, addLog]);

  // Update execution statistics
  const updateExecutionStatistics = useCallback(() => {
    setExecutionStats(prevStats => {
      const successCount = executions.filter(e => e.status === 'success').length;
      const errorCount = executions.filter(e => e.status === 'error' || e.status === 'crashed').length;
      const runningCount = executions.filter(e => e.status === 'running' || e.status === 'waiting').length;
      const totalCount = executions.length;
      
      // Calculate average execution time from completed executions
      const completedExecutions = executions.filter(e => e.finished && e.executionTime);
      const averageExecutionTime = completedExecutions.length > 0
        ? completedExecutions.reduce((sum, e) => sum + (e.executionTime || 0), 0) / completedExecutions.length
        : prevStats.averageExecutionTime;
      
      // Calculate health score (100 = perfect, 0 = all failures)
      const healthScore = totalCount > 0
        ? Math.round((successCount / totalCount) * 100)
        : 100;
      
      return {
        totalCount,
        successCount,
        errorCount,
        runningCount,
        averageExecutionTime,
        lastExecutionTime: executions[0]?.startedAt,
        healthScore
      };
    });
  }, [executions]);

  // Fetch workflow information with retry mechanism
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
          message: `Workflow "${data.workflow.name}" loaded - ${data.workflow.nodes?.length || 0} nodes, Active: ${data.workflow.active ? 'Yes' : 'No'}`
        });
        return data.workflow;
      }
      
      return null;

    } catch (err) {
      addLog({
        level: 'error',
        message: `Failed to fetch workflow info: ${err instanceof Error ? err.message : 'Unknown error'}`
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [workflowId, apiCall, addLog]);

  // Enhanced fetch executions with silent option
  const fetchExecutions = useCallback(async (limit: number = 50, silent: boolean = false) => {
    if (!workflowId) return [];

    try {
      if (!silent) setIsLoading(true);
      
      const data = await apiCall('executions', { limit });

      if (data.success) {
        const receivedExecutions = data.executions || [];
        setExecutions(receivedExecutions);
        
        // Update execution statistics
        updateExecutionStatistics();
        
        if (!silent && receivedExecutions.length > 0) {
          addLog({
            level: 'info',
            message: `Loaded ${receivedExecutions.length} workflow executions`
          });
        }
        
        return receivedExecutions;
      }
      
      return [];

    } catch (err) {
      if (!silent) {
        addLog({
          level: 'error',
          message: `Failed to fetch executions: ${err instanceof Error ? err.message : 'Unknown error'}`
        });
      }
      return [];
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [workflowId, apiCall, addLog, updateExecutionStatistics]);

  // Start polling for execution updates
  const startPolling = useCallback(() => {
    // Stop existing polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    
    // Set up new polling interval
    pollingRef.current = window.setInterval(() => {
      fetchExecutions(50, true); // Silent polling
    }, pollingInterval);
    
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [fetchExecutions]);

  // Enhanced activate workflow with better status feedback
  const activateWorkflow = useCallback(async () => {
    if (!workflowId) return false;

    try {
      setIsLoading(true);
      addLog({ level: 'info', message: 'Activating workflow...', showToast: true });

      const data = await apiCall('activate');

      if (data.success) {
        setWorkflow(prev => prev ? { ...prev, active: true } : null);
        addLog({ level: 'success', message: 'Workflow activated successfully', showToast: true });
        return true;
      }
      
      throw new Error(data.message || 'Failed to activate workflow');

    } catch (err) {
      addLog({
        level: 'error',
        message: `Failed to activate workflow: ${err instanceof Error ? err.message : 'Unknown error'}`,
        showToast: true
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [workflowId, apiCall, addLog]);

  // Enhanced deactivate workflow
  const deactivateWorkflow = useCallback(async () => {
    if (!workflowId) return false;

    try {
      setIsLoading(true);
      addLog({ level: 'info', message: 'Deactivating workflow...', showToast: true });

      const data = await apiCall('deactivate');

      if (data.success) {
        setWorkflow(prev => prev ? { ...prev, active: false } : null);
        addLog({ level: 'success', message: 'Workflow deactivated successfully', showToast: true });
        return true;
      }
      
      throw new Error(data.message || 'Failed to deactivate workflow');

    } catch (err) {
      addLog({
        level: 'error',
        message: `Failed to deactivate workflow: ${err instanceof Error ? err.message : 'Unknown error'}`,
        showToast: true
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [workflowId, apiCall, addLog]);

  // Execute workflow with improved UI feedback
  const executeWorkflow = useCallback(async () => {
    if (!workflowId || isExecuting) return null;

    try {
      setIsExecuting(true);
      addLog({ level: 'info', message: 'Starting manual execution...', showToast: true });

      const data = await apiCall('execute');

      if (data.success && data.executionId) {
        addLog({ 
          level: 'success', 
          message: `Execution started - ID: ${data.executionId}`,
          executionId: data.executionId,
          showToast: true
        });
        
        // Add execution with optimistic update
        setExecutions(prev => {
          const newExecution: N8nExecution = {
            id: data.executionId,
            workflowId: workflowId,
            mode: 'manual',
            status: 'running',
            startedAt: new Date().toISOString(),
            nodeExecutionStatus: {}
          };
          return [newExecution, ...prev];
        });
        
        // Refresh executions after a delay
        setTimeout(() => fetchExecutions(), 2000);
        
        return data.executionId;
      }
      
      throw new Error(data.message || 'Failed to execute workflow');

    } catch (err) {
      addLog({
        level: 'error',
        message: `Failed to execute workflow: ${err instanceof Error ? err.message : 'Unknown error'}`,
        showToast: true
      });
      return null;
    } finally {
      setIsExecuting(false);
    }
  }, [workflowId, isExecuting, apiCall, addLog, fetchExecutions]);

  // Enhanced stop execution with optimistic updates
  const stopExecution = useCallback(async (executionId: string) => {
    try {
      addLog({ 
        level: 'warn', 
        message: `Stopping execution ${executionId}...`,
        executionId
      });

      // Optimistic update
      setExecutions(prev => prev.map(e => 
        e.id === executionId ? { ...e, status: 'canceled' } : e
      ));

      const data = await apiCall('stop-execution', { executionId });

      if (data.success) {
        addLog({ 
          level: 'warn', 
          message: `Execution ${executionId} stopped`,
          executionId,
          showToast: true
        });
        
        // Refresh to get accurate state
        setTimeout(() => fetchExecutions(), 1000);
        return true;
      }
      
      // Revert optimistic update on failure
      setExecutions(prev => prev.map(e => 
        e.id === executionId && e.status === 'canceled' ? { ...e, status: 'running' } : e
      ));
      
      throw new Error(data.message || 'Failed to stop execution');

    } catch (err) {
      addLog({
        level: 'error',
        message: `Failed to stop execution: ${err instanceof Error ? err.message : 'Unknown error'}`,
        executionId,
        showToast: true
      });
      return false;
    }
  }, [apiCall, addLog, fetchExecutions]);

  // Delete execution with confirmation
  const deleteExecution = useCallback(async (executionId: string) => {
    try {
      addLog({ 
        level: 'warn', 
        message: `Deleting execution ${executionId}...`,
        executionId
      });

      // Optimistic update
      setExecutions(prev => prev.filter(e => e.id !== executionId));

      const data = await apiCall('delete-execution', { executionId });

      if (data.success) {
        addLog({ 
          level: 'warn', 
          message: `Execution ${executionId} deleted`,
          executionId
        });
        
        // Update statistics
        updateExecutionStatistics();
        return true;
      }
      
      // Revert optimistic update on failure
      fetchExecutions();
      throw new Error(data.message || 'Failed to delete execution');

    } catch (err) {
      addLog({
        level: 'error',
        message: `Failed to delete execution: ${err instanceof Error ? err.message : 'Unknown error'}`,
        executionId,
        showToast: true
      });
      return false;
    }
  }, [apiCall, addLog, fetchExecutions, updateExecutionStatistics]);

  // Get execution details with caching
  const getExecutionDetails = useCallback(async (executionId: string) => {
    try {
      // Check if we already have detailed info for this execution
      const existingExecution = executions.find(e => e.id === executionId && e.data);
      if (existingExecution?.data) {
        return existingExecution.data;
      }

      addLog({ 
        level: 'info', 
        message: `Loading details for execution ${executionId}`,
        executionId
      });

      const data = await apiCall('execution-details', { executionId });

      if (data.success && data.execution) {
        // Update execution in the list with detailed data
        setExecutions(prev => prev.map(e => 
          e.id === executionId ? { ...e, data: data.execution } : e
        ));
        
        return data.execution;
      }
      
      return null;

    } catch (err) {
      addLog({
        level: 'error',
        message: `Failed to get execution details: ${err instanceof Error ? err.message : 'Unknown error'}`,
        executionId
      });
      return null;
    }
  }, [apiCall, addLog, executions]);

  // Clear logs with confirmation
  const clearLogs = useCallback(() => {
    if (confirm('Are you sure you want to clear all logs? This cannot be undone.')) {
      setExecutionLogs([]);
      addLog({
        level: 'info',
        message: 'Logs cleared'
      });
    }
  }, [addLog]);

  // Initialize data and set up real-time monitoring
  useEffect(() => {
    if (!workflowId) return;

    // Initial data fetch
    fetchWorkflowInfo();
    fetchExecutions();

    // Set up real-time monitoring
    const unsubscribeRealTime = setupRealTimeMonitoring();
    
    // Set up polling as backup for real-time
    const stopPolling = startPolling();

    return () => {
      unsubscribeRealTime();
      stopPolling();
    };
  }, [workflowId, fetchWorkflowInfo, fetchExecutions, setupRealTimeMonitoring, startPolling]);

  return {
    workflow,
    executions,
    executionLogs,
    executionStats,
    isLoading,
    error,
    isExecuting,
    isRealTimeActive,
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
