
import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Square, 
  RotateCcw, 
  Activity, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  Zap,
  ExternalLink,
  Pause,
  Settings,
  Database,
  Globe,
  Terminal,
  Download,
  Upload,
  Eye,
  Trash2,
  Copy,
  Edit3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RealTimeN8nEngineProps {
  workflowId: string | null;
  workflowName?: string;
}

interface N8nExecution {
  id: string;
  workflowId: string;
  mode: string;
  retryOf?: string;
  status: 'new' | 'running' | 'success' | 'error' | 'canceled' | 'crashed' | 'waiting';
  startedAt: string;
  stoppedAt?: string;
  workflowData?: any;
  data?: any;
  executionTime?: number;
  finished?: boolean;
}

interface WorkflowInfo {
  id: string;
  name: string;
  active: boolean;
  nodes: any[];
  connections: any;
  settings: any;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  versionId?: string;
}

interface ExecutionLog {
  id: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  timestamp: string;
  nodeId?: string;
  nodeName?: string;
  executionTime?: number;
  data?: any;
}

export const RealTimeN8nEngine: React.FC<RealTimeN8nEngineProps> = ({
  workflowId,
  workflowName
}) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executions, setExecutions] = useState<N8nExecution[]>([]);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [currentExecution, setCurrentExecution] = useState<N8nExecution | null>(null);
  const [workflowInfo, setWorkflowInfo] = useState<WorkflowInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [selectedExecution, setSelectedExecution] = useState<string | null>(null);
  const [executionDetails, setExecutionDetails] = useState<any>(null);

  // Enhanced API call wrapper with better error handling
  const apiCall = useCallback(async (action: string, payload: any = {}) => {
    try {
      console.log(`🔄 N8n API Call: ${action}`, payload);
      
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

      console.log(`✅ N8n API Response: ${action}`, data);
      return data;
      
    } catch (err) {
      console.error(`❌ N8n API Error: ${action}`, err);
      setError(err instanceof Error ? err.message : 'API call failed');
      throw err;
    }
  }, [workflowId]);

  // Fetch comprehensive workflow information
  const fetchWorkflowInfo = useCallback(async () => {
    if (!workflowId) return;

    try {
      setIsLoading(true);
      setError(null);

      const data = await apiCall('workflow-info');
      
      if (data.success && data.workflow) {
        setWorkflowInfo(data.workflow);
        setIsActive(data.workflow.active);
        
        // Add info log
        const infoLog: ExecutionLog = {
          id: Date.now().toString(),
          level: 'info',
          message: `Workflow "${data.workflow.name}" loaded - ${data.workflow.nodes?.length || 0} nodes, Active: ${data.workflow.active}`,
          timestamp: new Date().toISOString()
        };
        
        setExecutionLogs(prev => [infoLog, ...prev]);
      }

    } catch (err) {
      console.error('Error fetching workflow info:', err);
    } finally {
      setIsLoading(false);
    }
  }, [workflowId, apiCall]);

  // Fetch executions with enhanced details
  const fetchExecutions = useCallback(async () => {
    if (!workflowId) return;

    try {
      setError(null);

      const data = await apiCall('executions', { limit: 50 });

      if (data.success) {
        setExecutions(data.executions || []);
        
        // Generate detailed logs from executions
        const logs: ExecutionLog[] = data.executions.map((execution: N8nExecution) => ({
          id: execution.id,
          level: execution.status === 'success' ? 'success' : 
                 execution.status === 'error' ? 'error' : 
                 execution.status === 'running' ? 'info' : 'info',
          message: `${execution.mode.toUpperCase()} execution ${execution.status}${execution.executionTime ? ` in ${execution.executionTime}ms` : ''}`,
          timestamp: execution.startedAt,
          executionTime: execution.executionTime,
          data: execution
        }));
        
        setExecutionLogs(prev => {
          const existingIds = new Set(prev.map(log => log.id));
          const newLogs = logs.filter(log => !existingIds.has(log.id));
          return [...newLogs, ...prev].slice(0, 100);
        });
      }

    } catch (err) {
      console.error('Error fetching executions:', err);
    }
  }, [workflowId, apiCall]);

  // Activate/Deactivate workflow
  const toggleWorkflowActivation = useCallback(async () => {
    if (!workflowId) return;

    try {
      setIsLoading(true);
      setError(null);

      const action = isActive ? 'deactivate' : 'activate';
      const data = await apiCall(action);

      if (data.success) {
        setIsActive(!isActive);
        
        const statusLog: ExecutionLog = {
          id: Date.now().toString(),
          level: 'success',
          message: `Workflow ${action}d successfully`,
          timestamp: new Date().toISOString()
        };
        
        setExecutionLogs(prev => [statusLog, ...prev]);
        
        // Refresh workflow info
        await fetchWorkflowInfo();
      }

    } catch (error) {
      console.error(`Error ${isActive ? 'deactivating' : 'activating'} workflow:`, error);
    } finally {
      setIsLoading(false);
    }
  }, [workflowId, isActive, apiCall, fetchWorkflowInfo]);

  // Execute workflow manually
  const executeWorkflow = useCallback(async () => {
    if (!workflowId || isExecuting) return;

    setIsExecuting(true);
    setError(null);

    try {
      console.log('🚀 Starting manual workflow execution...');
      
      const startLog: ExecutionLog = {
        id: Date.now().toString(),
        level: 'info',
        message: 'Manual execution started...',
        timestamp: new Date().toISOString()
      };
      
      setExecutionLogs(prev => [startLog, ...prev]);

      const data = await apiCall('execute');

      if (data.success) {
        console.log('✅ Workflow execution started:', data.executionId);
        
        const successLog: ExecutionLog = {
          id: data.executionId || Date.now().toString(),
          level: 'info',
          message: `Manual execution initiated - ID: ${data.executionId}`,
          timestamp: new Date().toISOString()
        };
        
        setExecutionLogs(prev => [successLog, ...prev]);
        
        // Start polling for execution updates
        if (data.executionId) {
          pollExecutionStatus(data.executionId);
        }
        
        // Refresh executions list
        setTimeout(() => fetchExecutions(), 2000);
      }

    } catch (error) {
      console.error('❌ Error executing workflow:', error);
      
      const errorLog: ExecutionLog = {
        id: Date.now().toString(),
        level: 'error',
        message: `Manual execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      };
      
      setExecutionLogs(prev => [errorLog, ...prev]);
    } finally {
      setIsExecuting(false);
    }
  }, [workflowId, isExecuting, apiCall, fetchExecutions]);

  // Stop running execution
  const stopExecution = useCallback(async (executionId: string) => {
    try {
      setError(null);
      
      const data = await apiCall('stop-execution', { executionId });

      if (data.success) {
        const stopLog: ExecutionLog = {
          id: Date.now().toString(),
          level: 'warn',
          message: `Execution ${executionId} stopped`,
          timestamp: new Date().toISOString()
        };
        
        setExecutionLogs(prev => [stopLog, ...prev]);
        
        // Refresh executions
        setTimeout(() => fetchExecutions(), 1000);
      }

    } catch (error) {
      console.error('Error stopping execution:', error);
    }
  }, [apiCall, fetchExecutions]);

  // Get detailed execution information
  const getExecutionDetails = useCallback(async (executionId: string) => {
    try {
      setError(null);
      
      const data = await apiCall('execution-details', { executionId });

      if (data.success && data.execution) {
        setExecutionDetails(data.execution);
        setSelectedExecution(executionId);
        
        const detailsLog: ExecutionLog = {
          id: Date.now().toString(),
          level: 'info',
          message: `Loaded details for execution ${executionId}`,
          timestamp: new Date().toISOString()
        };
        
        setExecutionLogs(prev => [detailsLog, ...prev]);
      }

    } catch (error) {
      console.error('Error fetching execution details:', error);
    }
  }, [apiCall]);

  // Delete execution
  const deleteExecution = useCallback(async (executionId: string) => {
    try {
      setError(null);
      
      const data = await apiCall('delete-execution', { executionId });

      if (data.success) {
        const deleteLog: ExecutionLog = {
          id: Date.now().toString(),
          level: 'warn',
          message: `Execution ${executionId} deleted`,
          timestamp: new Date().toISOString()
        };
        
        setExecutionLogs(prev => [deleteLog, ...prev]);
        
        // Refresh executions
        fetchExecutions();
      }

    } catch (error) {
      console.error('Error deleting execution:', error);
    }
  }, [apiCall, fetchExecutions]);

  // Poll execution status with enhanced monitoring
  const pollExecutionStatus = useCallback(async (executionId: string) => {
    let attempts = 0;
    const maxAttempts = 60; // Poll for 10 minutes max
    
    const poll = async () => {
      try {
        const data = await apiCall('execution-details', { executionId });

        if (data.success && data.execution) {
          const execution = data.execution;
          setCurrentExecution(execution);
          
          const statusLog: ExecutionLog = {
            id: `${executionId}-${attempts}`,
            level: execution.status === 'success' ? 'success' : 
                   execution.status === 'error' ? 'error' : 'info',
            message: `Execution ${execution.status}${execution.finished ? ' - Finished' : ' - Running'}${execution.executionTime ? ` (${execution.executionTime}ms)` : ''}`,
            timestamp: new Date().toISOString(),
            data: execution
          };
          
          setExecutionLogs(prev => {
            const filtered = prev.filter(log => !log.id.startsWith(`${executionId}-`));
            return [statusLog, ...filtered];
          });

          // If execution is complete, stop polling
          if (execution.finished || execution.status === 'success' || execution.status === 'error' || 
              execution.status === 'canceled' || execution.status === 'crashed') {
            console.log('✅ Execution polling completed with status:', execution.status);
            
            // Fetch final execution list
            fetchExecutions();
            return;
          }
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 10000); // Poll every 10 seconds
        } else {
          console.log('⏰ Polling timeout reached for execution:', executionId);
          
          const timeoutLog: ExecutionLog = {
            id: Date.now().toString(),
            level: 'warn',
            message: `Polling timeout for execution ${executionId}`,
            timestamp: new Date().toISOString()
          };
          
          setExecutionLogs(prev => [timeoutLog, ...prev]);
        }

      } catch (error) {
        console.error('Error in execution polling:', error);
      }
    };

    // Start polling with initial delay
    setTimeout(poll, 2000);
  }, [apiCall, fetchExecutions]);

  // Set up comprehensive monitoring
  useEffect(() => {
    if (!workflowId) return;

    // Initial data fetch
    fetchWorkflowInfo();
    fetchExecutions();

    // Set up interval for real-time updates
    const interval = setInterval(() => {
      fetchExecutions();
    }, 15000); // Refresh every 15 seconds

    return () => clearInterval(interval);
  }, [workflowId, fetchWorkflowInfo, fetchExecutions]);

  const getStatusIcon = (level: string) => {
    switch (level) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'info':
        return <Clock className="w-4 h-4 text-blue-400" />;
      case 'warn':
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      default:
        return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const getExecutionStatusBadge = (status: string) => {
    const statusConfig = {
      success: { variant: 'default', className: 'bg-green-500', text: 'Success' },
      error: { variant: 'destructive', className: 'bg-red-500', text: 'Error' },
      running: { variant: 'default', className: 'bg-blue-500', text: 'Running' },
      waiting: { variant: 'secondary', className: 'bg-yellow-500', text: 'Waiting' },
      canceled: { variant: 'secondary', className: 'bg-gray-500', text: 'Canceled' },
      crashed: { variant: 'destructive', className: 'bg-red-600', text: 'Crashed' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.waiting;
    
    return (
      <Badge variant={config.variant as any} className={config.className}>
        {config.text}
      </Badge>
    );
  };

  const getExecutionStats = () => {
    const success = executions.filter(e => e.status === 'success').length;
    const errors = executions.filter(e => e.status === 'error').length;
    const running = executions.filter(e => e.status === 'running').length;
    const total = executions.length;

    return { success, errors, running, total };
  };

  const stats = getExecutionStats();

  if (!workflowId) {
    return (
      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-6">
        <div className="text-center text-white/60">
          <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">N8n Engine</h3>
          <p>Generate a workflow to start comprehensive n8n management</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden">
      {/* Enhanced Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Zap className="w-5 h-5 text-green-400" />
            <div>
              <h3 className="text-white font-semibold">N8n Engine</h3>
              {workflowInfo && (
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-white/60">{workflowInfo.name}</span>
                  <Badge variant={isActive ? 'default' : 'secondary'} 
                         className={isActive ? 'bg-green-500' : 'bg-gray-500'}>
                    {isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  {workflowInfo.nodes && (
                    <span className="text-white/40">{workflowInfo.nodes.length} nodes</span>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              onClick={fetchWorkflowInfo}
              disabled={isLoading}
              size="sm"
              variant="ghost"
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            
            <Button
              onClick={toggleWorkflowActivation}
              disabled={isLoading}
              size="sm"
              variant={isActive ? "destructive" : "default"}
              className={isActive ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"}
            >
              {isActive ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Deactivate
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Activate
                </>
              )}
            </Button>
            
            <Button
              onClick={executeWorkflow}
              disabled={isExecuting || !isActive}
              size="sm"
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              {isExecuting ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Execute
                </>
              )}
            </Button>
            
            <Button
              onClick={() => window.open(`https://n8n-df58.onrender.com/workflow/${workflowId}`, '_blank')}
              size="sm"
              variant="outline"
              className="text-white border-white/20 hover:bg-white/10"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in n8n
            </Button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 border-b border-white/10">
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
            <div className="flex items-center space-x-2 text-red-300">
              <XCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
              <Button
                onClick={() => setError(null)}
                size="sm"
                variant="ghost"
                className="ml-auto text-red-300 hover:text-red-100"
              >
                <XCircle className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Stats Dashboard */}
      <div className="p-4 border-b border-white/10">
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-3 bg-green-500/20 rounded-lg border border-green-500/30">
            <div className="text-2xl font-bold text-green-400">{stats.success}</div>
            <div className="text-xs text-green-300">Success</div>
          </div>
          <div className="text-center p-3 bg-blue-500/20 rounded-lg border border-blue-500/30">
            <div className="text-2xl font-bold text-blue-400">{stats.running}</div>
            <div className="text-xs text-blue-300">Running</div>
          </div>
          <div className="text-center p-3 bg-red-500/20 rounded-lg border border-red-500/30">
            <div className="text-2xl font-bold text-red-400">{stats.errors}</div>
            <div className="text-xs text-red-300">Errors</div>
          </div>
          <div className="text-center p-3 bg-white/10 rounded-lg border border-white/20">
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-xs text-white/60">Total</div>
          </div>
        </div>
      </div>

      {/* Enhanced Tabbed Interface */}
      <Tabs defaultValue="logs" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-black/20">
          <TabsTrigger value="logs" className="text-white">
            <Terminal className="w-4 h-4 mr-2" />
            Live Logs
          </TabsTrigger>
          <TabsTrigger value="executions" className="text-white">
            <Activity className="w-4 h-4 mr-2" />
            Executions
          </TabsTrigger>
          <TabsTrigger value="workflow" className="text-white">
            <Settings className="w-4 h-4 mr-2" />
            Workflow
          </TabsTrigger>
        </TabsList>

        {/* Live Logs Tab */}
        <TabsContent value="logs" className="mt-0">
          <ScrollArea className="h-80 p-4">
            {executionLogs.length > 0 ? (
              <div className="space-y-2">
                <AnimatePresence>
                  {executionLogs.map((log, index) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.02 }}
                      className={`p-3 rounded bg-white/5 border-l-2 ${
                        log.level === 'success' ? 'border-green-400' :
                        log.level === 'error' ? 'border-red-400' :
                        log.level === 'warn' ? 'border-yellow-400' :
                        'border-blue-400'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          {getStatusIcon(log.level)}
                          <div className="flex-1">
                            <div className="text-white text-sm">{log.message}</div>
                            {log.nodeName && (
                              <div className="text-white/60 text-xs mt-1">
                                Node: {log.nodeName}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-white/60 text-xs">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </div>
                          {log.executionTime && (
                            <div className="text-white/40 text-xs">
                              {log.executionTime}ms
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="text-center py-8">
                <Terminal className="w-12 h-12 text-white/40 mx-auto mb-4" />
                <h3 className="text-white/60 text-lg mb-2">No Logs Yet</h3>
                <p className="text-white/40">Execute the workflow to see live logs</p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* Executions Tab */}
        <TabsContent value="executions" className="mt-0">
          <ScrollArea className="h-80 p-4">
            {executions.length > 0 ? (
              <div className="space-y-3">
                {executions.map((execution) => (
                  <motion.div
                    key={execution.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-white/5 rounded-lg border border-white/10"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className="text-white font-medium">#{execution.id.slice(0, 8)}</div>
                        {getExecutionStatusBadge(execution.status)}
                        <div className="text-white/60 text-sm">
                          {execution.mode.toUpperCase()}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {execution.status === 'running' && (
                          <Button
                            onClick={() => stopExecution(execution.id)}
                            size="sm"
                            variant="destructive"
                            className="h-7 px-2"
                          >
                            <Square className="w-3 h-3" />
                          </Button>
                        )}
                        <Button
                          onClick={() => getExecutionDetails(execution.id)}
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-white/60 hover:text-white"
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button
                          onClick={() => deleteExecution(execution.id)}
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-white/60">Started</div>
                        <div className="text-white">
                          {new Date(execution.startedAt).toLocaleString()}
                        </div>
                      </div>
                      {execution.stoppedAt && (
                        <div>
                          <div className="text-white/60">Finished</div>
                          <div className="text-white">
                            {new Date(execution.stoppedAt).toLocaleString()}
                          </div>
                        </div>
                      )}
                      {execution.executionTime && (
                        <div>
                          <div className="text-white/60">Duration</div>
                          <div className="text-white">{execution.executionTime}ms</div>
                        </div>
                      )}
                    </div>
                    
                    {selectedExecution === execution.id && executionDetails && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-3 pt-3 border-t border-white/10"
                      >
                        <pre className="text-xs text-white/80 bg-black/20 p-2 rounded overflow-x-auto">
                          {JSON.stringify(executionDetails, null, 2)}
                        </pre>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-white/40 mx-auto mb-4" />
                <h3 className="text-white/60 text-lg mb-2">No Executions Yet</h3>
                <p className="text-white/40">Execute the workflow to see execution history</p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* Workflow Info Tab */}
        <TabsContent value="workflow" className="mt-0">
          <ScrollArea className="h-80 p-4">
            {workflowInfo ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-white/60 text-sm">Name</div>
                    <div className="text-white font-medium">{workflowInfo.name}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-white/60 text-sm">Status</div>
                    <Badge variant={workflowInfo.active ? 'default' : 'secondary'} 
                           className={workflowInfo.active ? 'bg-green-500' : 'bg-gray-500'}>
                      {workflowInfo.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="text-white/60 text-sm">Nodes</div>
                    <div className="text-white">{workflowInfo.nodes?.length || 0}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-white/60 text-sm">Created</div>
                    <div className="text-white text-sm">
                      {workflowInfo.createdAt ? new Date(workflowInfo.createdAt).toLocaleString() : 'Unknown'}
                    </div>
                  </div>
                </div>
                
                {workflowInfo.tags && workflowInfo.tags.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-white/60 text-sm">Tags</div>
                    <div className="flex flex-wrap gap-1">
                      {workflowInfo.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <div className="text-white/60 text-sm">Settings</div>
                  <div className="bg-black/20 p-3 rounded text-xs">
                    <pre className="text-white/80 overflow-x-auto">
                      {JSON.stringify(workflowInfo.settings || {}, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Database className="w-12 h-12 text-white/40 mx-auto mb-4" />
                <h3 className="text-white/60 text-lg mb-2">Loading Workflow Info</h3>
                <p className="text-white/40">Fetching workflow details...</p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RealTimeN8nEngine;
