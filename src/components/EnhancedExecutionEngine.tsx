
import React, { useState, useCallback, useEffect, useRef } from 'react';
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
  Database,
  Settings,
  Zap,
  BarChart4,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { useN8nWorkflowManager } from '@/hooks/useN8nWorkflowManager';
import { useWorkflowMonitoring } from '@/hooks/useWorkflowMonitoring';
import RealTimeExecutionMonitor from './RealTimeExecutionMonitor';
import { toast } from 'sonner';

interface EnhancedExecutionEngineProps {
  workflowId: string | null;
  workflowName?: string;
}

export const EnhancedExecutionEngine: React.FC<EnhancedExecutionEngineProps> = ({
  workflowId,
  workflowName
}) => {
  const [activeTab, setActiveTab] = useState<string>('realtime');
  
  // Initialize hooks
  const n8nManager = useN8nWorkflowManager(workflowId);
  const workflowMonitoring = useWorkflowMonitoring(workflowId);
  
  // Derived state
  const isActive = n8nManager.workflow?.active || false;
  const isRealTimeActive = n8nManager.isRealTimeActive || workflowMonitoring.isStreaming;
  
  // Execute workflow with notifications
  const handleExecuteWorkflow = async () => {
    try {
      toast.info('Starting workflow execution...');
      await n8nManager.executeWorkflow();
    } catch (error) {
      toast.error('Failed to execute workflow');
      console.error('Execution error:', error);
    }
  };
  
  // Toggle workflow activation
  const toggleWorkflowActivation = async () => {
    try {
      if (isActive) {
        toast.info('Deactivating workflow...');
        await n8nManager.deactivateWorkflow();
      } else {
        toast.info('Activating workflow...');
        await n8nManager.activateWorkflow();
      }
    } catch (error) {
      toast.error(`Failed to ${isActive ? 'deactivate' : 'activate'} workflow`);
      console.error('Activation toggle error:', error);
    }
  };
  
  // Format execution time
  const formatExecutionTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };
  
  // Calculate success rate
  const calculateSuccessRate = () => {
    const total = n8nManager.executionStats.totalCount;
    if (total === 0) return 0;
    return Math.round((n8nManager.executionStats.successCount / total) * 100);
  };
  
  // Refresh data
  const refreshData = useCallback(async () => {
    try {
      await n8nManager.fetchWorkflowInfo();
      await n8nManager.fetchExecutions();
      await workflowMonitoring.refreshStatus();
      toast.success('Data refreshed');
    } catch (error) {
      toast.error('Failed to refresh data');
      console.error('Refresh error:', error);
    }
  }, [n8nManager, workflowMonitoring]);
  
  // Set up initial data and polling
  useEffect(() => {
    if (!workflowId) return;
    
    refreshData();
    
    // Set up polling interval
    const pollingInterval = setInterval(() => {
      if (!isRealTimeActive) {
        n8nManager.fetchExecutions(20, true);
        workflowMonitoring.refreshStatus(true);
      }
    }, 10000);
    
    return () => {
      clearInterval(pollingInterval);
    };
  }, [workflowId, refreshData, isRealTimeActive, n8nManager, workflowMonitoring]);
  
  if (!workflowId) {
    return (
      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-6">
        <div className="text-center text-white/60">
          <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">Execution Engine</h3>
          <p>Select a workflow to monitor and execute</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden">
      {/* Header with controls */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Zap className="w-5 h-5 text-green-400" />
            <div>
              <h3 className="text-white font-semibold">{workflowName || 'Workflow'} Execution Engine</h3>
              <div className="flex items-center space-x-2 text-sm">
                <span className="text-white/60">Status:</span>
                <Badge className={isActive ? "bg-green-500" : "bg-gray-500"}>
                  {isActive ? 'Active' : 'Inactive'}
                </Badge>
                {isRealTimeActive && (
                  <span className="flex items-center text-xs text-green-400">
                    <span className="relative flex h-2 w-2 mr-1">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    Live
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              onClick={toggleWorkflowActivation}
              size="sm"
              variant={isActive ? "destructive" : "default"}
              className={isActive ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"}
            >
              {isActive ? 'Deactivate' : 'Activate'}
            </Button>
            
            <Button
              onClick={handleExecuteWorkflow}
              disabled={n8nManager.isExecuting}
              size="sm"
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              {n8nManager.isExecuting ? (
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
              onClick={refreshData}
              disabled={n8nManager.isLoading || workflowMonitoring.isLoading}
              size="sm"
              variant="outline"
              className="text-white border-white/20 hover:bg-white/10"
            >
              <RotateCcw className={`w-4 h-4 ${n8nManager.isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Stats Dashboard */}
      <div className="grid grid-cols-4 gap-4 p-4 border-b border-white/10">
        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <div className="flex items-center justify-between">
            <div className="text-xs text-white/60">Success Rate</div>
            <div className="text-xs font-medium text-green-400">{calculateSuccessRate()}%</div>
          </div>
          <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 rounded-full" 
              style={{ width: `${calculateSuccessRate()}%` }}
            ></div>
          </div>
        </div>
        
        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <div className="text-xs text-white/60">Total Executions</div>
          <div className="flex items-center justify-between mt-1">
            <div className="text-xl font-bold text-white">{n8nManager.executionStats.totalCount}</div>
            <Activity className="w-5 h-5 text-blue-400" />
          </div>
        </div>
        
        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <div className="text-xs text-white/60">Avg. Execution Time</div>
          <div className="flex items-center justify-between mt-1">
            <div className="text-xl font-bold text-white">
              {formatExecutionTime(n8nManager.executionStats.averageExecutionTime)}
            </div>
            <Clock className="w-5 h-5 text-purple-400" />
          </div>
        </div>
        
        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <div className="text-xs text-white/60">Current Status</div>
          <div className="flex items-center justify-between mt-1">
            <div className="text-xl font-bold text-white">
              {n8nManager.executionStats.runningCount > 0 ? 'Running' : 'Idle'}
            </div>
            <div className={`w-2 h-2 rounded-full ${n8nManager.executionStats.runningCount > 0 ? 'bg-blue-500 animate-pulse' : 'bg-gray-500'}`}></div>
          </div>
        </div>
      </div>
      
      {/* Tabs Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="min-h-[400px]">
        <TabsList className="w-full grid grid-cols-3 rounded-none bg-black/30">
          <TabsTrigger value="realtime" className="text-white data-[state=active]:bg-white/10">
            <Zap className="w-4 h-4 mr-2" />
            Real-Time Monitor
          </TabsTrigger>
          <TabsTrigger value="logs" className="text-white data-[state=active]:bg-white/10">
            <Activity className="w-4 h-4 mr-2" />
            Execution Logs
          </TabsTrigger>
          <TabsTrigger value="stats" className="text-white data-[state=active]:bg-white/10">
            <BarChart4 className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>
        
        {/* Real-time Monitor Tab */}
        <TabsContent value="realtime" className="mt-0">
          <RealTimeExecutionMonitor
            workflowId={workflowId}
            workflowName={workflowName || n8nManager.workflow?.name}
            executions={n8nManager.executions}
            executionLogs={n8nManager.executionLogs}
            executionStats={n8nManager.executionStats}
            isLoading={n8nManager.isLoading}
            isRealTimeActive={isRealTimeActive}
            isExecuting={n8nManager.isExecuting}
            executeWorkflow={n8nManager.executeWorkflow}
            stopExecution={n8nManager.stopExecution}
            deleteExecution={n8nManager.deleteExecution}
            getExecutionDetails={n8nManager.getExecutionDetails}
            clearLogs={n8nManager.clearLogs}
            refreshExecutions={n8nManager.fetchExecutions}
          />
        </TabsContent>
        
        {/* Logs Tab */}
        <TabsContent value="logs" className="mt-0 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-medium">Workflow Execution Logs</h3>
            <Button 
              variant="outline" 
              size="sm"
              onClick={n8nManager.clearLogs}
              className="text-white/70 border-white/20 hover:bg-white/10"
            >
              <RotateCcw className="w-3 h-3 mr-2" />
              Clear
            </Button>
          </div>
          
          <ScrollArea className="h-[350px] bg-black/20 rounded-lg border border-white/10">
            <div className="p-2 space-y-2">
              <AnimatePresence>
                {workflowMonitoring.status.realTimeLogs?.map((log) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className={`p-3 rounded-md border-l-2 bg-black/30 ${
                      log.level === 'success' ? 'border-green-500' :
                      log.level === 'error' ? 'border-red-500' :
                      log.level === 'warn' ? 'border-yellow-500' :
                      'border-blue-500'
                    }`}
                  >
                    <div className="flex items-start">
                      <div className="mt-0.5 mr-3">
                        {log.level === 'success' ? <CheckCircle className="w-4 h-4 text-green-500" /> :
                         log.level === 'error' ? <XCircle className="w-4 h-4 text-red-500" /> :
                         log.level === 'warn' ? <AlertCircle className="w-4 h-4 text-yellow-500" /> :
                         <Clock className="w-4 h-4 text-blue-500" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <p className="text-white text-sm">{log.message}</p>
                          <span className="text-white/50 text-xs ml-2">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        {log.node_name && (
                          <p className="text-white/70 text-xs mt-1">Node: {log.node_name}</p>
                        )}
                        {log.execution_id && (
                          <p className="text-white/70 text-xs">
                            Execution: {log.execution_id.substring(0, 8)}...
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {(!workflowMonitoring.status.realTimeLogs || workflowMonitoring.status.realTimeLogs.length === 0) && (
                <div className="flex items-center justify-center h-60">
                  <div className="text-center text-white/50">
                    <Database className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p className="text-lg">No logs available</p>
                    <p className="text-sm mt-1">Execute the workflow to see logs</p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
        
        {/* Analytics Tab */}
        <TabsContent value="stats" className="mt-0 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-medium">Workflow Analytics</h3>
            <Button 
              variant="outline" 
              size="sm"
              onClick={refreshData}
              className="text-white/70 border-white/20 hover:bg-white/10"
            >
              <RotateCcw className="w-3 h-3 mr-2" />
              Refresh
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <h4 className="text-white/70 text-sm mb-3">Execution Status</h4>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white/70 text-xs">Success</span>
                    <span className="text-white text-xs">{n8nManager.executionStats.successCount}</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full" 
                      style={{ 
                        width: `${n8nManager.executionStats.totalCount > 0 
                          ? (n8nManager.executionStats.successCount / n8nManager.executionStats.totalCount) * 100 
                          : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white/70 text-xs">Error</span>
                    <span className="text-white text-xs">{n8nManager.executionStats.errorCount}</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-500 rounded-full" 
                      style={{ 
                        width: `${n8nManager.executionStats.totalCount > 0 
                          ? (n8nManager.executionStats.errorCount / n8nManager.executionStats.totalCount) * 100 
                          : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white/70 text-xs">Running</span>
                    <span className="text-white text-xs">{n8nManager.executionStats.runningCount}</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full" 
                      style={{ 
                        width: `${n8nManager.executionStats.totalCount > 0 
                          ? (n8nManager.executionStats.runningCount / n8nManager.executionStats.totalCount) * 100 
                          : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <h4 className="text-white/70 text-sm mb-3">Performance Metrics</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Average Execution Time</span>
                  <span className="text-white font-medium">
                    {formatExecutionTime(n8nManager.executionStats.averageExecutionTime)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Health Score</span>
                  <div className="flex items-center">
                    <span className="text-white font-medium mr-2">
                      {n8nManager.executionStats.healthScore}%
                    </span>
                    <div className={`w-3 h-3 rounded-full ${
                      n8nManager.executionStats.healthScore > 80 ? 'bg-green-500' :
                      n8nManager.executionStats.healthScore > 50 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}></div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Last Execution</span>
                  <span className="text-white font-medium">
                    {n8nManager.executionStats.lastExecutionTime 
                      ? new Date(n8nManager.executionStats.lastExecutionTime).toLocaleTimeString() 
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <h4 className="text-white/70 text-sm mb-3">Node Statistics</h4>
            {n8nManager.workflow?.nodes && n8nManager.workflow.nodes.length > 0 ? (
              <div className="space-y-2">
                {n8nManager.workflow.nodes.map((node: any) => (
                  <div key={node.id} className="p-2 hover:bg-white/5 rounded-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <ChevronRight className="w-4 h-4 text-white/50 mr-2" />
                        <span className="text-white">{node.name}</span>
                      </div>
                      <div className="text-white/70 text-sm">
                        {node.type.replace('n8n-nodes-base.', '')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-white/50 py-4">
                <Settings className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No node statistics available</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedExecutionEngine;
