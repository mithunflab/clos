
import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExecutionLog {
  id?: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  timestamp: string;
  status?: string;
  duration?: number | null;
  node_name?: string;
  execution_id?: string;
  metadata?: any;
}

interface WorkflowStatus {
  status: 'active' | 'inactive' | 'error';
  executionLogs: ExecutionLog[];
  lastExecution?: any;
  executions?: any[];
  realTimeLogs?: ExecutionLog[];
  nodeStatus?: Record<string, {
    status: 'pending' | 'running' | 'completed' | 'error';
    startTime?: string;
    endTime?: string;
    duration?: number;
  }>;
  statistics?: {
    totalExecutions: number;
    successCount: number;
    errorCount: number;
    averageExecutionTime: number;
    lastExecutionTime?: string;
  };
}

export const useWorkflowMonitoring = (workflowId: string | null) => {
  const [status, setStatus] = useState<WorkflowStatus>({
    status: 'inactive',
    executionLogs: [],
    realTimeLogs: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const pollingInterval = useRef<number | null>(null);
  const wsChannel = useRef<any>(null);

  // Enhanced logging function with toast notifications for critical events
  const logRealTimeEvent = useCallback(async (
    level: ExecutionLog['level'],
    message: string,
    nodeName?: string,
    executionId?: string,
    metadata?: any,
    showToast: boolean = false
  ) => {
    if (!workflowId) return;

    try {
      const timestamp = new Date().toISOString();
      const logEntry: ExecutionLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        level,
        message,
        timestamp,
        node_name: nodeName,
        execution_id: executionId,
        metadata: metadata || {}
      };

      setStatus(prev => ({
        ...prev,
        realTimeLogs: [logEntry, ...(prev.realTimeLogs || [])].slice(0, 100) // Increase log history
      }));

      // Update node status if node name is provided
      if (nodeName) {
        setStatus(prev => {
          const nodeStatus = { ...(prev.nodeStatus || {}) };
          
          if (level === 'error') {
            nodeStatus[nodeName] = { 
              status: 'error', 
              endTime: timestamp,
              ...(nodeStatus[nodeName] || {})
            };
          } else if (level === 'success') {
            nodeStatus[nodeName] = { 
              status: 'completed', 
              endTime: timestamp,
              ...(nodeStatus[nodeName] || {})
            };
            // Calculate duration if we have start time
            if (nodeStatus[nodeName]?.startTime) {
              const startTime = new Date(nodeStatus[nodeName].startTime!).getTime();
              const endTime = new Date(timestamp).getTime();
              nodeStatus[nodeName].duration = endTime - startTime;
            }
          } else if (level === 'info' && message.includes('running') || message.includes('started')) {
            nodeStatus[nodeName] = { 
              status: 'running', 
              startTime: timestamp,
              ...(nodeStatus[nodeName] || {})
            };
          }

          return {
            ...prev,
            nodeStatus
          };
        });
      }

      // Show toast notifications for important events
      if (showToast) {
        switch (level) {
          case 'success':
            toast.success(message);
            break;
          case 'error':
            toast.error(message);
            break;
          case 'warn':
            toast.warning(message);
            break;
          case 'info':
            if (message.includes('activation') || message.includes('started')) {
              toast.info(message);
            }
            break;
        }
      }

      console.log(`✅ Real-time log added [${level.toUpperCase()}]:`, message);
    } catch (err) {
      console.error('❌ Error logging real-time event:', err);
    }
  }, [workflowId]);

  // Subscribe to real-time updates using Supabase Realtime
  const subscribeToRealTimeUpdates = useCallback(() => {
    if (!workflowId) return;

    try {
      console.log('🔌 Setting up real-time monitoring for workflow:', workflowId);
      
      // Close existing channel if any
      if (wsChannel.current) {
        supabase.removeChannel(wsChannel.current);
      }

      // Create new channel
      const channel = supabase
        .channel(`workflow-executions-${workflowId}`)
        .on('broadcast', { event: 'workflow-execution' }, (payload) => {
          if (payload.payload && payload.payload.workflowId === workflowId) {
            const { event, data } = payload.payload;
            
            // Process execution event
            switch (event) {
              case 'execution.started':
                logRealTimeEvent('info', `Execution started: ${data.executionId}`, undefined, data.executionId, data, true);
                break;
              case 'execution.finished':
                logRealTimeEvent(
                  data.status === 'success' ? 'success' : 'error',
                  `Execution ${data.status}: ${data.executionId} (${data.duration}ms)`,
                  undefined,
                  data.executionId,
                  data,
                  true
                );
                break;
              case 'node.started':
                logRealTimeEvent('info', `Node ${data.nodeName} started execution`, data.nodeName, data.executionId, data);
                break;
              case 'node.finished':
                logRealTimeEvent(
                  data.status === 'success' ? 'success' : 'error',
                  `Node ${data.nodeName} ${data.status} (${data.duration}ms)`,
                  data.nodeName,
                  data.executionId,
                  data
                );
                break;
              case 'workflow.status':
                setStatus(prev => ({
                  ...prev,
                  status: data.status
                }));
                logRealTimeEvent('info', `Workflow status changed to ${data.status}`, undefined, undefined, data, true);
                break;
            }

            // Update statistics on any execution event
            updateStatistics();
          }
        })
        .subscribe((status) => {
          console.log('Subscription status:', status);
          
          if (status === 'SUBSCRIBED') {
            setIsStreaming(true);
            logRealTimeEvent('info', 'Real-time monitoring activated', undefined, undefined, { status });
          } else if (status === 'CHANNEL_ERROR') {
            setIsStreaming(false);
            logRealTimeEvent('error', 'Real-time monitoring connection error', undefined, undefined, { status });
            
            // Try to reconnect after a delay
            setTimeout(() => {
              subscribeToRealTimeUpdates();
            }, 5000);
          }
        });
      
      wsChannel.current = channel;
      
      // Initialize with a log message
      logRealTimeEvent('info', 'Workflow monitoring initialized');
      
      return () => {
        supabase.removeChannel(channel);
        setIsStreaming(false);
      };
    } catch (err) {
      console.error('❌ Error setting up real-time monitoring:', err);
      setIsStreaming(false);
      setError(err instanceof Error ? err.message : 'Failed to set up real-time monitoring');
    }
  }, [workflowId, logRealTimeEvent]);

  // Fetch initial logs
  const fetchRealTimeLogs = useCallback(async () => {
    if (!workflowId) return;

    try {
      // In a real implementation, this would fetch recent logs from a logging service
      // For now, we'll initialize with basic logs
      const initialLogs: ExecutionLog[] = [
        {
          id: 'log_init',
          level: 'info',
          message: 'Workflow monitoring initialized',
          timestamp: new Date().toISOString()
        }
      ];

      setStatus(prev => ({
        ...prev,
        realTimeLogs: initialLogs
      }));
      
      console.log('✅ Real-time logs initialized');
    } catch (err) {
      console.error('❌ Error fetching real-time logs:', err);
    }
  }, [workflowId]);

  // Enhanced fetch workflow status with error recovery
  const fetchWorkflowStatus = useCallback(async (silent: boolean = false) => {
    if (!workflowId) return;

    try {
      if (!silent) setIsLoading(true);
      setError(null);

      console.log('📊 Fetching workflow status for:', workflowId);

      // In a real n8n integration, this would call the n8n API
      // For now, we'll simulate the response
      const mockExecutions = [
        {
          id: `exec_${Date.now()}`,
          status: Math.random() > 0.2 ? 'success' : 'error', // Simulate occasional errors
          mode: Math.random() > 0.5 ? 'manual' : 'scheduled',
          startedAt: new Date().toISOString(),
          executionTime: Math.floor(Math.random() * 3000) + 200
        }
      ];

      const executionLogs: ExecutionLog[] = mockExecutions.map((execution: any) => ({
        id: execution.id,
        level: execution.status === 'success' ? 'success' as const : 
               execution.status === 'error' ? 'error' as const : 'info' as const,
        message: `Execution ${execution.status} - ${execution.mode || 'manual'} mode${execution.executionTime ? ` (${execution.executionTime}ms)` : ''}`,
        timestamp: execution.startedAt,
        status: execution.status,
        duration: execution.executionTime,
        execution_id: execution.id
      }));

      // Update statistics
      const statistics = {
        totalExecutions: mockExecutions.length + Math.floor(Math.random() * 10),
        successCount: mockExecutions.filter(e => e.status === 'success').length + Math.floor(Math.random() * 5),
        errorCount: mockExecutions.filter(e => e.status === 'error').length + Math.floor(Math.random() * 3),
        averageExecutionTime: Math.floor(mockExecutions.reduce((acc, e) => acc + (e.executionTime || 0), 0) / Math.max(mockExecutions.length, 1)),
        lastExecutionTime: mockExecutions[0]?.startedAt
      };

      setStatus(prev => ({
        status: 'active',
        executionLogs: [...executionLogs, ...(prev.executionLogs || [])].slice(0, 50),
        lastExecution: mockExecutions[0],
        executions: mockExecutions,
        realTimeLogs: prev.realTimeLogs || [],
        nodeStatus: prev.nodeStatus || {},
        statistics
      }));

      if (!silent) {
        console.log('✅ Successfully fetched workflow status');
      }

    } catch (err) {
      console.error('❌ Error fetching workflow status:', err);
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        
        setStatus(prev => ({
          ...prev,
          status: 'error'
        }));
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [workflowId]);

  // Update statistics with latest execution data
  const updateStatistics = useCallback(() => {
    setStatus(prev => {
      if (!prev.executions?.length) return prev;
      
      const successCount = prev.executions.filter(e => e.status === 'success').length;
      const errorCount = prev.executions.filter(e => e.status === 'error').length;
      const totalExecutions = prev.executions.length;
      const averageExecutionTime = Math.floor(prev.executions.reduce((acc, e) => acc + (e.executionTime || 0), 0) / totalExecutions);
      
      return {
        ...prev,
        statistics: {
          totalExecutions,
          successCount,
          errorCount,
          averageExecutionTime,
          lastExecutionTime: prev.executions[0]?.startedAt
        }
      };
    });
  }, []);

  // Start polling for workflow status
  const startPolling = useCallback((interval: number = 15000) => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
    }
    
    // Initial fetch
    fetchWorkflowStatus();
    
    // Set up polling
    pollingInterval.current = window.setInterval(() => {
      fetchWorkflowStatus(true); // Silent fetch for polling
    }, interval);
    
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
    };
  }, [fetchWorkflowStatus]);

  // Activate workflow with enhanced error handling
  const activateWorkflow = useCallback(async () => {
    if (!workflowId) return false;

    try {
      setIsLoading(true);
      setError(null);

      console.log('🔌 Activating workflow:', workflowId);
      logRealTimeEvent('info', 'Activating workflow...', undefined, undefined, {}, true);

      // In a real implementation, this would call the n8n API
      // For now, we'll simulate activation
      await new Promise(resolve => setTimeout(resolve, 1000));

      setStatus(prev => ({
        ...prev,
        status: 'active'
      }));

      await logRealTimeEvent('success', 'Workflow activated successfully', undefined, undefined, {}, true);
      
      // Refresh status after activation
      setTimeout(() => {
        fetchWorkflowStatus();
      }, 2000);
      
      return true;

    } catch (err) {
      console.error('❌ Error activating workflow:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      await logRealTimeEvent('error', `Failed to activate workflow: ${err instanceof Error ? err.message : 'Unknown error'}`, undefined, undefined, {}, true);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [workflowId, fetchWorkflowStatus, logRealTimeEvent]);

  // Set up real-time monitoring and polling on mount
  useEffect(() => {
    if (!workflowId) return;
    
    // Initial data setup
    fetchRealTimeLogs();
    
    // Start real-time monitoring
    const unsubscribe = subscribeToRealTimeUpdates();
    
    // Start status polling (backup for real-time)
    const stopPolling = startPolling();
    
    return () => {
      unsubscribe && unsubscribe();
      stopPolling();
    };
  }, [workflowId, fetchRealTimeLogs, subscribeToRealTimeUpdates, startPolling]);

  return {
    status,
    isLoading,
    error,
    isStreaming,
    activateWorkflow,
    refreshStatus: fetchWorkflowStatus,
    logRealTimeEvent,
    fetchRealTimeLogs,
    startPolling,
    subscribeToRealTimeUpdates
  };
};
