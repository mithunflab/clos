
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Square, Clock, CheckCircle, AlertCircle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  parameters: any;
  position: [number, number];
}

interface WorkflowExecution {
  nodeId: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  startTime?: Date;
  endTime?: Date;
  data?: any;
  error?: string;
}

interface WorkflowEngineProps {
  workflow: any;
  onExecutionUpdate?: (executions: WorkflowExecution[]) => void;
}

export const WorkflowEngine: React.FC<WorkflowEngineProps> = ({
  workflow,
  onExecutionUpdate
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [currentExecution, setCurrentExecution] = useState<string | null>(null);

  // Initialize executions when workflow changes
  useEffect(() => {
    if (workflow?.nodes) {
      const initialExecutions: WorkflowExecution[] = workflow.nodes.map((node: WorkflowNode) => ({
        nodeId: node.id,
        status: 'pending'
      }));
      setExecutions(initialExecutions);
    }
  }, [workflow]);

  // Simulate workflow execution
  const executeWorkflow = async () => {
    if (!workflow?.nodes || isRunning) return;

    setIsRunning(true);
    const nodes = workflow.nodes as WorkflowNode[];
    const connections = workflow.connections || {};

    // Reset all executions
    const resetExecutions = nodes.map(node => ({
      nodeId: node.id,
      status: 'pending' as const
    }));
    setExecutions(resetExecutions);

    try {
      // Find starting nodes (nodes with no incoming connections)
      const hasIncomingConnection = new Set();
      Object.values(connections).forEach((nodeConnections: any) => {
        if (nodeConnections.main?.[0]) {
          nodeConnections.main[0].forEach((conn: any) => {
            hasIncomingConnection.add(conn.node);
          });
        }
      });

      const startingNodes = nodes.filter(node => !hasIncomingConnection.has(node.name));
      
      // Execute nodes in sequence
      await executeNodesSequentially(startingNodes, connections, nodes);

    } catch (error) {
      console.error('Workflow execution error:', error);
    } finally {
      setIsRunning(false);
      setCurrentExecution(null);
    }
  };

  const executeNodesSequentially = async (
    nodesToExecute: WorkflowNode[],
    connections: any,
    allNodes: WorkflowNode[]
  ) => {
    for (const node of nodesToExecute) {
      await executeNode(node);
      
      // Find and execute next nodes
      const nodeConnections = connections[node.name];
      if (nodeConnections?.main?.[0]) {
        const nextNodeNames = nodeConnections.main[0].map((conn: any) => conn.node);
        const nextNodes = allNodes.filter(n => nextNodeNames.includes(n.name));
        
        if (nextNodes.length > 0) {
          // Small delay between node executions
          await new Promise(resolve => setTimeout(resolve, 500));
          await executeNodesSequentially(nextNodes, connections, allNodes);
        }
      }
    }
  };

  const executeNode = async (node: WorkflowNode) => {
    setCurrentExecution(node.id);
    
    // Update status to running
    setExecutions(prev => prev.map(exec => 
      exec.nodeId === node.id 
        ? { ...exec, status: 'running', startTime: new Date() }
        : exec
    ));

    try {
      // Simulate node execution based on type
      const executionTime = getNodeExecutionTime(node.type);
      await new Promise(resolve => setTimeout(resolve, executionTime));

      // Simulate node result
      const result = await simulateNodeExecution(node);

      // Update status to completed
      setExecutions(prev => prev.map(exec => 
        exec.nodeId === node.id 
          ? { 
              ...exec, 
              status: 'completed', 
              endTime: new Date(),
              data: result
            }
          : exec
      ));

    } catch (error) {
      // Update status to error
      setExecutions(prev => prev.map(exec => 
        exec.nodeId === node.id 
          ? { 
              ...exec, 
              status: 'error', 
              endTime: new Date(),
              error: error.message
            }
          : exec
      ));
    }
  };

  const getNodeExecutionTime = (nodeType: string): number => {
    const executionTimes: { [key: string]: number } = {
      'httpRequest': 1500,
      'webhook': 500,
      'code': 1000,
      'set': 300,
      'if': 200,
      'schedule': 100,
      'email': 2000,
      'slack': 1200,
      'googleSheets': 1800,
      'mysql': 1000,
      'postgresql': 1000,
      'mongodb': 1200
    };

    const baseType = nodeType.replace('n8n-nodes-base.', '').toLowerCase();
    return executionTimes[baseType] || 800;
  };

  const simulateNodeExecution = async (node: WorkflowNode) => {
    const nodeType = node.type.replace('n8n-nodes-base.', '').toLowerCase();
    
    switch (nodeType) {
      case 'httprequest':
        return { statusCode: 200, data: { message: 'HTTP request successful' } };
      case 'webhook':
        return { received: true, timestamp: new Date() };
      case 'code':
        return { result: 'Code executed successfully', output: Math.random() };
      case 'set':
        return { transformed: true, fields: ['field1', 'field2'] };
      case 'if':
        return { condition: Math.random() > 0.5, branch: 'true' };
      case 'email':
        return { sent: true, recipient: 'user@example.com' };
      case 'slack':
        return { posted: true, channel: '#general' };
      case 'googlesheets':
        return { rows: 5, updated: true };
      default:
        return { status: 'completed', nodeType };
    }
  };

  const stopExecution = () => {
    setIsRunning(false);
    setCurrentExecution(null);
    setExecutions(prev => prev.map(exec => 
      exec.status === 'running' 
        ? { ...exec, status: 'pending' }
        : exec
    ));
  };

  const getExecutionStats = () => {
    const completed = executions.filter(e => e.status === 'completed').length;
    const errors = executions.filter(e => e.status === 'error').length;
    const running = executions.filter(e => e.status === 'running').length;
    const pending = executions.filter(e => e.status === 'pending').length;

    return { completed, errors, running, pending, total: executions.length };
  };

  const stats = getExecutionStats();

  if (!workflow) {
    return (
      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-6">
        <div className="text-center text-white/60">
          <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">Workflow Engine Ready</h3>
          <p>Generate a workflow to see the execution engine in action</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Zap className="w-5 h-5 text-green-400" />
            <h3 className="text-white font-semibold">Local Workflow Engine</h3>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={executeWorkflow}
              disabled={isRunning}
              size="sm"
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Execute
                </>
              )}
            </Button>
            {isRunning && (
              <Button
                onClick={stopExecution}
                size="sm"
                variant="destructive"
              >
                <Square className="w-4 h-4 mr-2" />
                Stop
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Execution Stats */}
      <div className="p-4 border-b border-white/10">
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{stats.completed}</div>
            <div className="text-xs text-white/60">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{stats.running}</div>
            <div className="text-xs text-white/60">Running</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
            <div className="text-xs text-white/60">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">{stats.errors}</div>
            <div className="text-xs text-white/60">Errors</div>
          </div>
        </div>
      </div>

      {/* Node Execution List */}
      <div className="max-h-64 overflow-y-auto">
        {executions.map((execution) => {
          const node = workflow.nodes.find((n: WorkflowNode) => n.id === execution.nodeId);
          if (!node) return null;

          return (
            <motion.div
              key={execution.nodeId}
              className={`p-3 border-b border-white/5 flex items-center justify-between ${
                currentExecution === execution.nodeId ? 'bg-white/5' : ''
              }`}
              animate={{
                backgroundColor: currentExecution === execution.nodeId ? 'rgba(255,255,255,0.05)' : 'transparent'
              }}
            >
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  {execution.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-400" />}
                  {execution.status === 'running' && <Clock className="w-4 h-4 text-blue-400 animate-spin" />}
                  {execution.status === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
                  {execution.status === 'pending' && <Clock className="w-4 h-4 text-white/40" />}
                </div>
                <div>
                  <div className="text-white font-medium text-sm">{node.name}</div>
                  <div className="text-white/60 text-xs">{node.type.replace('n8n-nodes-base.', '')}</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-xs font-medium ${
                  execution.status === 'completed' ? 'text-green-400' :
                  execution.status === 'running' ? 'text-blue-400' :
                  execution.status === 'error' ? 'text-red-400' :
                  'text-white/40'
                }`}>
                  {execution.status.toUpperCase()}
                </div>
                {execution.endTime && execution.startTime && (
                  <div className="text-white/60 text-xs">
                    {Math.round((execution.endTime.getTime() - execution.startTime.getTime()))}ms
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default WorkflowEngine;
