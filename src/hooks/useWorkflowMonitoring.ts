
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
}

export const useWorkflowMonitoring = (workflowId: string | null) => {
  const [status, setStatus] = useState<WorkflowStatus>({
    status: 'inactive',
    executionLogs: [],
    realTimeLogs: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logRealTimeEvent = useCallback(async (
    level: ExecutionLog['level'],
    message: string,
    nodeName?: string,
    executionId?: string,
    metadata?: any
  ) => {
    if (!workflowId) return;

    try {
      const logEntry: ExecutionLog = {
        id: `log_${Date.now()}_${Math.random()}`,
        level,
        message,
        timestamp: new Date().toISOString(),
        node_name: nodeName,
        execution_id: executionId,
        metadata: metadata || {}
      };

      setStatus(prev => ({
        ...prev,
        realTimeLogs: [logEntry, ...(prev.realTimeLogs || [])].slice(0, 50)
      }));

      console.log('✅ Real-time log added:', logEntry);
    } catch (err) {
      console.error('❌ Error logging real-time event:', err);
    }
  }, [workflowId]);

  const fetchRealTimeLogs = useCallback(async () => {
    if (!workflowId) return;

    try {
      // In a real implementation, this would fetch from a logging service
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

  const fetchWorkflowStatus = useCallback(async () => {
    if (!workflowId) return;

    try {
      setIsLoading(true);
      setError(null);

      console.log('📊 Fetching workflow status for:', workflowId);

      // In a real n8n integration, this would call the n8n API
      // For now, we'll simulate the response
      const mockExecutions = [
        {
          id: 'exec_1',
          status: 'success',
          mode: 'manual',
          startedAt: new Date().toISOString(),
          executionTime: 1200
        }
      ];

      const executionLogs: ExecutionLog[] = mockExecutions.map((execution: any) => ({
        id: execution.id,
        level: execution.status === 'success' ? 'success' as const : 
               execution.status === 'error' ? 'error' as const : 'info' as const,
        message: `Execution ${execution.status} - ${execution.mode || 'manual'} mode${execution.executionTime ? ` (${execution.executionTime}ms)` : ''}`,
        timestamp: execution.startedAt,
        status: execution.status,
        duration: execution.executionTime
      }));

      await fetchRealTimeLogs();

      setStatus(prev => ({
        status: 'active',
        executionLogs: executionLogs.slice(0, 20),
        lastExecution: mockExecutions[0],
        executions: mockExecutions,
        realTimeLogs: prev.realTimeLogs || []
      }));

      console.log('✅ Successfully fetched workflow status');

    } catch (err) {
      console.error('❌ Error fetching workflow status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      
      setStatus(prev => ({
        ...prev,
        status: 'error'
      }));
    } finally {
      setIsLoading(false);
    }
  }, [workflowId, fetchRealTimeLogs]);

  const activateWorkflow = useCallback(async () => {
    if (!workflowId) return false;

    try {
      setIsLoading(true);
      setError(null);

      console.log('🔌 Activating workflow:', workflowId);

      // In a real implementation, this would call the n8n API
      // For now, we'll simulate activation
      await new Promise(resolve => setTimeout(resolve, 1000));

      setStatus(prev => ({
        ...prev,
        status: 'active'
      }));

      await logRealTimeEvent('success', 'Workflow activated successfully');
      
      setTimeout(() => {
        fetchWorkflowStatus();
      }, 2000);
      
      return true;

    } catch (err) {
      console.error('❌ Error activating workflow:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [workflowId, fetchWorkflowStatus, logRealTimeEvent]);

  return {
    status,
    isLoading,
    error,
    activateWorkflow,
    refreshStatus: fetchWorkflowStatus,
    logRealTimeEvent,
    fetchRealTimeLogs
  };
};
