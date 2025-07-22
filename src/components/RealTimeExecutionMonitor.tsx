import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  AlertCircle,
  CheckCircle, 
  Clock, 
  Eye,
  Loader2,
  RefreshCw,
  RotateCcw,
  Square, 
  Terminal, 
  Trash2, 
  XCircle,
  Zap,
  BarChart,
  ChevronRight,
  ChevronDown,
  Filter
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';

// Define polling interval constant
const POLLING_INTERVAL = 10000; // 10 seconds

interface ExecutionLog {
  id: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  timestamp: string;
  nodeName?: string;
  executionId?: string;
  data?: any;
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

interface ExecutionStatistics {
  totalCount: number;
  successCount: number;
  errorCount: number;
  runningCount: number;
  averageExecutionTime: number;
  lastExecutionTime?: string;
  healthScore: number;
}

interface RealTimeExecutionMonitorProps {
  workflowId: string | null;
  workflowName?: string;
  executions: N8nExecution[];
  executionLogs: ExecutionLog[];
  executionStats: ExecutionStatistics;
  isLoading: boolean;
  isRealTimeActive: boolean;
  isExecuting: boolean;
  executeWorkflow: () => Promise<any>;
  stopExecution: (executionId: string) => Promise<boolean>;
  deleteExecution: (executionId: string) => Promise<boolean>;
  getExecutionDetails: (executionId: string) => Promise<any>;
  clearLogs: () => void;
  refreshExecutions: () => Promise<any>;
}

export const RealTimeExecutionMonitor: React.FC<RealTimeExecutionMonitorProps> = ({
  workflowId,
  workflowName,
  executions,
  executionLogs,
  executionStats,
  isLoading,
  isRealTimeActive,
  isExecuting,
  executeWorkflow,
  stopExecution,
  deleteExecution,
  getExecutionDetails,
  clearLogs,
  refreshExecutions
}) => {
  const [selectedExecution, setSelectedExecution] = useState<string | null>(null);
  const [executionDetails, setExecutionDetails] = useState<any>(null);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [logFilter, setLogFilter] = useState<string>('all');
  const [nodeFilter, setNodeFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('executions');

  // Get execution details
  const handleViewExecutionDetails = async (executionId: string) => {
    if (selectedExecution === executionId && executionDetails) {
      setSelectedExecution(null);
      setExecutionDetails(null);
    } else {
      setSelectedExecution(executionId);
      const details = await getExecutionDetails(executionId);
      if (details) {
        setExecutionDetails(details);
      }
    }
  };

  // Toggle node expansion
  const toggleNodeExpansion = (nodeId: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  // Filter logs by level
  const filteredLogs = executionLogs.filter(log => {
    if (logFilter === 'all') return true;
    return log.level === logFilter;
  }).filter(log => {
    if (nodeFilter === 'all') return true;
    return log.nodeName === nodeFilter;
  });

  // Get list of all nodes for filtering
  const allNodes = [...new Set(executionLogs
    .filter(log => log.nodeName)
    .map(log => log.nodeName!)
  )];

  // Handle refresh
  const handleRefresh = async () => {
    toast.info("Refreshing execution data...");
    await refreshExecutions();
  };

  // Format time for display
  const formatTime = (timestamp: string) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  // Format date for display
  const formatDate = (timestamp: string) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // Get status icon based on level
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

  // Get status badge style
  const getExecutionStatusBadge = (status: string) => {
    const statusConfig = {
      success: { variant: 'default', className: 'bg-green-500', text: 'Success' },
      error: { variant: 'destructive', className: 'bg-red-500', text: 'Error' },
      running: { variant: 'default', className: 'bg-blue-500', text: 'Running' },
      waiting: { variant: 'secondary', className: 'bg-yellow-500', text: 'Waiting' },
      canceled: { variant: 'secondary', className: 'bg-gray-500', text: 'Canceled' },
      crashed: { variant: 'destructive', className: 'bg-red-600', text: 'Crashed' },
      new: { variant: 'secondary', className: 'bg-purple-500', text: 'New' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.waiting;
    
    return (
      <Badge variant={config.variant as any} className={config.className}>
        {config.text}
      </Badge>
    );
  };

  // Get execution progress
  const getExecutionProgress = (execution: N8nExecution) => {
    if (!execution.nodeExecutionStatus) return 0;
    
    const nodeStatuses = Object.values(execution.nodeExecutionStatus);
    if (nodeStatuses.length === 0) return 0;
    
    const completedNodes = nodeStatuses.filter(
      status => status.status === 'success' || status.status === 'error'
    ).length;
    
    return Math.round((completedNodes / nodeStatuses.length) * 100);
  };

  if (!workflowId) {
    return (
      <Card className="bg-background/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Real-time Execution Monitor</CardTitle>
          <CardDescription>
            Select a workflow to view its real-time execution details
          </CardDescription>
        </CardHeader>
        <CardContent className="h-60 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No workflow selected</h3>
            <p>Select a workflow to monitor its executions</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-background/60 backdrop-blur-sm border border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Zap className="w-5 h-5 mr-2 text-primary" />
              Real-time Execution Monitor
              {isRealTimeActive && (
                <span className="flex items-center ml-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">Live</span>
                </span>
              )}
            </CardTitle>
            <CardDescription>
              {workflowName || 'Workflow'} execution monitoring
            </CardDescription>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              onClick={executeWorkflow}
              disabled={isExecuting}
              size="sm"
              className="bg-primary hover:bg-primary/90"
            >
              {isExecuting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Execute
                </>
              )}
            </Button>
            
            <Button
              onClick={handleRefresh}
              disabled={isLoading}
              size="sm"
              variant="outline"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {/* Statistics Dashboard */}
      <CardContent className="py-2">
        <div className="grid grid-cols-5 gap-3 mb-4">
          <div className="bg-background rounded-lg p-3 border border-border">
            <div className="text-2xl font-bold text-foreground">{executionStats.totalCount}</div>
            <div className="text-xs text-muted-foreground">Total Executions</div>
          </div>
          <div className="bg-background rounded-lg p-3 border border-border">
            <div className="text-2xl font-bold text-green-500">{executionStats.successCount}</div>
            <div className="text-xs text-muted-foreground">Successful</div>
          </div>
          <div className="bg-background rounded-lg p-3 border border-border">
            <div className="text-2xl font-bold text-red-500">{executionStats.errorCount}</div>
            <div className="text-xs text-muted-foreground">Failed</div>
          </div>
          <div className="bg-background rounded-lg p-3 border border-border">
            <div className="text-2xl font-bold text-blue-500">{executionStats.runningCount}</div>
            <div className="text-xs text-muted-foreground">Running</div>
          </div>
          <div className="bg-background rounded-lg p-3 border border-border">
            <div className="text-2xl font-bold text-foreground">
              {Math.round(executionStats.averageExecutionTime)}ms
            </div>
            <div className="text-xs text-muted-foreground">Avg. Duration</div>
          </div>
        </div>
        
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">Workflow Health</div>
            <div className="text-sm font-medium">
              {executionStats.healthScore}%
            </div>
          </div>
          <Progress 
            value={executionStats.healthScore} 
            className="h-2"
            indicatorClassName={
              executionStats.healthScore > 80 ? "bg-green-500" :
              executionStats.healthScore > 50 ? "bg-yellow-500" : "bg-red-500"
            }
          />
        </div>
      </CardContent>
      
      {/* Tabbed Interface */}
      <CardContent className="p-0">
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 rounded-none border-b border-border">
            <TabsTrigger value="executions">
              <Activity className="w-4 h-4 mr-2" />
              Executions
            </TabsTrigger>
            <TabsTrigger value="logs">
              <Terminal className="w-4 h-4 mr-2" />
              Live Logs
            </TabsTrigger>
            <TabsTrigger value="nodes">
              <BarChart className="w-4 h-4 mr-2" />
              Node Analysis
            </TabsTrigger>
          </TabsList>
          
          {/* Executions Tab */}
          <TabsContent value="executions" className="mt-0">
            <div className="px-4 py-2 border-b border-border bg-accent/50">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">
                  Showing {executions.length} execution{executions.length !== 1 ? 's' : ''}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearLogs}
                  className="h-8 text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Clear History
                </Button>
              </div>
            </div>
            
            <ScrollArea className="h-[300px]">
              {executions.length > 0 ? (
                <div className="divide-y divide-border">
                  <AnimatePresence>
                    {executions.map((execution) => (
                      <motion.div
                        key={execution.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                        className="p-3 hover:bg-accent/50"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <div className="font-mono text-xs text-muted-foreground">
                              #{execution.id.slice(0, 8)}
                            </div>
                            {getExecutionStatusBadge(execution.status)}
                            <div className="text-sm text-muted-foreground">
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
                                <Square className="w-3 h-3 mr-1" />
                                Stop
                              </Button>
                            )}
                            <Button
                              onClick={() => handleViewExecutionDetails(execution.id)}
                              size="sm"
                              variant={selectedExecution === execution.id ? "default" : "outline"}
                              className="h-7 px-2"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              {selectedExecution === execution.id ? "Hide" : "Details"}
                            </Button>
                            <Button
                              onClick={() => deleteExecution(execution.id)}
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-destructive hover:text-destructive/80"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 text-xs">
                          <div>
                            <div className="text-muted-foreground">Started</div>
                            <div className="font-medium">
                              {formatDate(execution.startedAt)}
                            </div>
                          </div>
                          {execution.stoppedAt && (
                            <div>
                              <div className="text-muted-foreground">Finished</div>
                              <div className="font-medium">
                                {formatDate(execution.stoppedAt)}
                              </div>
                            </div>
                          )}
                          {execution.executionTime && (
                            <div>
                              <div className="text-muted-foreground">Duration</div>
                              <div className="font-medium">{execution.executionTime}ms</div>
                            </div>
                          )}
                        </div>
                        
                        {execution.status === 'running' && execution.nodeExecutionStatus && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-xs text-muted-foreground">Progress</div>
                              <div className="text-xs font-medium">
                                {getExecutionProgress(execution)}%
                              </div>
                            </div>
                            <Progress value={getExecutionProgress(execution)} className="h-1" />
                          </div>
                        )}
                        
                        {selectedExecution === execution.id && executionDetails && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-3 pt-3 border-t border-border"
                          >
                            <div className="text-xs font-medium mb-2">Execution Details</div>
                            <ScrollArea className="h-[200px] border border-border rounded-md">
                              <pre className="text-xs p-2 font-mono">
                                {JSON.stringify(executionDetails, null, 2)}
                              </pre>
                            </ScrollArea>
                          </motion.div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-muted-foreground">
                    <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-base font-medium mb-2">No Executions Yet</h3>
                    <p className="text-sm">Run the workflow to see execution history</p>
                  </div>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          
          {/* Logs Tab */}
          <TabsContent value="logs" className="mt-0">
            <div className="px-4 py-2 border-b border-border bg-accent/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Select value={logFilter} onValueChange={setLogFilter}>
                    <SelectTrigger className="h-8 w-[120px]">
                      <Filter className="w-3 h-3 mr-2" />
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="warn">Warning</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {allNodes.length > 0 && (
                    <Select value={nodeFilter} onValueChange={setNodeFilter}>
                      <SelectTrigger className="h-8 w-[140px]">
                        <Activity className="w-3 h-3 mr-2" />
                        <SelectValue placeholder="Node" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Nodes</SelectItem>
                        {allNodes.map(node => (
                          <SelectItem key={node} value={node}>{node}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearLogs}
                  className="h-8 text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Clear Logs
                </Button>
              </div>
            </div>
            
            <ScrollArea className="h-[300px]">
              {filteredLogs.length > 0 ? (
                <div className="divide-y divide-border/50">
                  <AnimatePresence>
                    {filteredLogs.map((log) => (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.2 }}
                        className={`p-3 hover:bg-accent/30 border-l-2 ${
                          log.level === 'success' ? 'border-green-500' :
                          log.level === 'error' ? 'border-red-500' :
                          log.level === 'warn' ? 'border-yellow-500' :
                          'border-blue-500'
                        }`}
                      >
                        <div className="flex items-start">
                          <div className="mr-3 mt-0.5">
                            {getStatusIcon(log.level)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div className="text-sm">{log.message}</div>
                              <div className="text-xs text-muted-foreground ml-3">
                                {formatTime(log.timestamp)}
                              </div>
                            </div>
                            {log.nodeName && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Node: {log.nodeName}
                              </div>
                            )}
                            {log.executionId && (
                              <div className="text-xs text-muted-foreground">
                                Execution: {log.executionId.slice(0, 8)}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-muted-foreground">
                    <Terminal className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-base font-medium mb-2">No Logs Available</h3>
                    <p className="text-sm">Run the workflow to see execution logs</p>
                  </div>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          
          {/* Node Analysis Tab */}
          <TabsContent value="nodes" className="mt-0">
            <div className="px-4 py-2 border-b border-border bg-accent/50">
              <div className="text-sm font-medium">
                Node Performance Analysis
              </div>
            </div>
            
            <ScrollArea className="h-[300px]">
              {allNodes.length > 0 ? (
                <div className="divide-y divide-border">
                  {allNodes.map(nodeName => {
                    // Get logs for this node
                    const nodeLogs = executionLogs.filter(log => log.nodeName === nodeName);
                    
                    // Calculate statistics
                    const successCount = nodeLogs.filter(log => log.level === 'success').length;
                    const errorCount = nodeLogs.filter(log => log.level === 'error').length;
                    const totalRuns = successCount + errorCount;
                    const successRate = totalRuns > 0 ? (successCount / totalRuns) * 100 : 0;
                    
                    // Find average execution time if available in metadata
                    const executionTimes = nodeLogs.filter(log => log.data?.duration).map(log => log.data.duration);
                    const avgExecutionTime = executionTimes.length > 0
                      ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length
                      : null;
                    
                    return (
                      <div key={nodeName} className="p-3">
                        <div 
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => toggleNodeExpansion(nodeName)}
                        >
                          <div className="flex items-center">
                            <div className="mr-2">
                              {expandedNodes[nodeName] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </div>
                            <div className="font-medium">{nodeName}</div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-xs text-muted-foreground">
                              {totalRuns} run{totalRuns !== 1 ? 's' : ''}
                            </div>
                            <div className="flex items-center">
                              <div className="w-16 h-2 bg-background rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-green-500" 
                                  style={{ width: `${successRate}%` }}
                                ></div>
                              </div>
                              <div className="text-xs text-muted-foreground ml-2">
                                {Math.round(successRate)}%
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {expandedNodes[nodeName] && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-3 pl-6 text-sm"
                          >
                            <div className="grid grid-cols-3 gap-4">
                              <div className="bg-background p-2 rounded border border-border">
                                <div className="text-xs text-muted-foreground">Success</div>
                                <div className="font-medium text-green-500">{successCount}</div>
                              </div>
                              <div className="bg-background p-2 rounded border border-border">
                                <div className="text-xs text-muted-foreground">Errors</div>
                                <div className="font-medium text-red-500">{errorCount}</div>
                              </div>
                              <div className="bg-background p-2 rounded border border-border">
                                <div className="text-xs text-muted-foreground">Avg. Time</div>
                                <div className="font-medium">
                                  {avgExecutionTime !== null ? `${Math.round(avgExecutionTime)}ms` : 'N/A'}
                                </div>
                              </div>
                            </div>
                            
                            {nodeLogs.length > 0 && (
                              <div className="mt-3">
                                <div className="text-xs font-medium mb-2">Recent Activity</div>
                                <div className="max-h-[150px] overflow-y-auto space-y-1 text-xs">
                                  {nodeLogs.slice(0, 5).map(log => (
                                    <div 
                                      key={log.id} 
                                      className={`p-2 rounded-sm ${
                                        log.level === 'success' ? 'bg-green-500/10 text-green-500' :
                                        log.level === 'error' ? 'bg-red-500/10 text-red-500' :
                                        log.level === 'warn' ? 'bg-yellow-500/10 text-yellow-500' :
                                        'bg-blue-500/10 text-blue-500'
                                      }`}
                                    >
                                      {log.message}
                                      <div className="text-muted-foreground text-[10px] mt-1">
                                        {formatTime(log.timestamp)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-muted-foreground">
                    <BarChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-base font-medium mb-2">No Node Data</h3>
                    <p className="text-sm">Run the workflow to collect node statistics</p>
                  </div>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex justify-between border-t border-border p-2 text-xs text-muted-foreground">
        <div className="flex items-center">
          {isRealTimeActive ? (
            <span className="flex items-center text-green-500">
              <span className="relative flex h-2 w-2 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Real-time monitoring active
            </span>
          ) : (
            <span className="flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              Polling every {POLLING_INTERVAL / 1000}s
            </span>
          )}
        </div>
        <div>
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </CardFooter>
    </Card>
  );
};

export default RealTimeExecutionMonitor;
