
import React, { useState, useCallback } from 'react';
import { Node, Edge } from '@xyflow/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Square, RotateCcw, Activity, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { N8nWorkflow, updateNodeStatus, animateEdge, findNodeConnections } from '@/utils/workflowParser';
import { WorkflowNodeData } from '@/components/WorkflowNode';

interface ExecutionResult {
  nodeId: string;
  nodeName: string;
  status: 'completed' | 'error';
  executionTime: number;
  data?: any;
  error?: string;
}

interface LocalExecutionEngineProps {
  workflow: N8nWorkflow;
  nodes: Node[];
  edges: Edge[];
  onNodesUpdate: (nodes: Node[]) => void;
  onEdgesUpdate: (edges: Edge[]) => void;
}

export const LocalExecutionEngine: React.FC<LocalExecutionEngineProps> = ({
  workflow,
  nodes,
  edges,
  onNodesUpdate,
  onEdgesUpdate
}) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResults, setExecutionResults] = useState<ExecutionResult[]>([]);
  const [currentExecutingNode, setCurrentExecutingNode] = useState<string | null>(null);
  const [executionStartTime, setExecutionStartTime] = useState<Date | null>(null);

  const simulateNodeExecution = async (node: WorkflowNodeData): Promise<{ data: any; executionTime: number }> => {
    const startTime = Date.now();
    
    // Simulate different execution times based on node type
    const executionTime = getNodeExecutionTime(node.type);
    await new Promise(resolve => setTimeout(resolve, executionTime));

    const endTime = Date.now();
    const actualExecutionTime = endTime - startTime;

    // Simulate node-specific results
    const data = await simulateNodeResult(node);

    return { data, executionTime: actualExecutionTime };
  };

  const getNodeExecutionTime = (nodeType: string): number => {
    const executionTimes: { [key: string]: number } = {
      'n8n-nodes-base.httpRequest': 1500,
      'n8n-nodes-base.webhook': 500,
      'n8n-nodes-base.code': 1000,
      'n8n-nodes-base.set': 300,
      'n8n-nodes-base.if': 200,
      'n8n-nodes-base.schedule': 100,
      'n8n-nodes-base.email': 2000,
      'n8n-nodes-base.slack': 1200,
      'n8n-nodes-base.googleSheets': 1800,
      'n8n-nodes-base.mysql': 1000,
      'n8n-nodes-base.postgresql': 1000,
      'n8n-nodes-base.mongodb': 1200
    };

    return executionTimes[nodeType] || 800;
  };

  const simulateNodeResult = async (node: WorkflowNodeData) => {
    const nodeType = node.type.replace('n8n-nodes-base.', '').toLowerCase();
    
    // Simulate occasional failures (10% chance)
    if (Math.random() < 0.1) {
      throw new Error(`Simulated error in ${node.name}`);
    }
    
    switch (nodeType) {
      case 'httprequest':
        return { 
          statusCode: 200, 
          data: { message: 'HTTP request successful', timestamp: new Date() },
          headers: { 'content-type': 'application/json' }
        };
      case 'webhook':
        return { 
          received: true, 
          timestamp: new Date(),
          payload: { event: 'webhook_triggered' }
        };
      case 'code':
        return { 
          result: 'Code executed successfully', 
          output: Math.random() * 100,
          executedAt: new Date()
        };
      case 'set':
        return { 
          transformed: true, 
          fields: ['field1', 'field2', 'field3'],
          recordCount: Math.floor(Math.random() * 50) + 1
        };
      case 'if':
        const condition = Math.random() > 0.5;
        return { 
          condition, 
          branch: condition ? 'true' : 'false',
          evaluatedAt: new Date()
        };
      case 'email':
        return { 
          sent: true, 
          recipient: 'user@example.com',
          messageId: `msg_${Date.now()}`
        };
      case 'slack':
        return { 
          posted: true, 
          channel: '#general',
          messageTs: Date.now().toString()
        };
      case 'googlesheets':
        return { 
          rows: Math.floor(Math.random() * 10) + 1, 
          updated: true,
          spreadsheetId: 'sheet_123'
        };
      default:
        return { 
          status: 'completed', 
          nodeType,
          processedAt: new Date()
        };
    }
  };

  const executeWorkflow = useCallback(async () => {
    if (isExecuting || !workflow.nodes.length) return;

    setIsExecuting(true);
    setExecutionResults([]);
    setExecutionStartTime(new Date());

    // Reset all nodes to pending
    let updatedNodes = nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        status: 'pending' as const,
        executionTime: undefined,
        data: undefined,
        error: undefined
      }
    }));
    onNodesUpdate(updatedNodes);

    // Reset edges
    let updatedEdges = edges.map(edge => ({
      ...edge,
      animated: false,
      style: {
        ...edge.style,
        stroke: 'rgba(255, 255, 255, 0.6)',
        strokeWidth: 2
      }
    }));
    onEdgesUpdate(updatedEdges);

    try {
      // Find starting nodes (nodes with no incoming connections)
      const startingNodes = workflow.nodes.filter(node => {
        const { incoming } = findNodeConnections(workflow, node.name);
        return incoming.length === 0;
      });

      // Execute workflow sequentially
      await executeNodesSequentially(startingNodes, updatedNodes, updatedEdges);
    } catch (error) {
      console.error('Workflow execution failed:', error);
    } finally {
      setIsExecuting(false);
      setCurrentExecutingNode(null);
    }
  }, [workflow, nodes, edges, isExecuting, onNodesUpdate, onEdgesUpdate]);

  const executeNodesSequentially = async (
    nodesToExecute: any[],
    currentNodes: Node[],
    currentEdges: Edge[]
  ) => {
    for (const workflowNode of nodesToExecute) {
      const reactFlowNode = currentNodes.find(n => n.data.name === workflowNode.name);
      if (!reactFlowNode) continue;

      setCurrentExecutingNode(reactFlowNode.id);

      // Update node status to running
      currentNodes = updateNodeStatus(currentNodes, reactFlowNode.id, 'running');
      onNodesUpdate(currentNodes);

      // Animate incoming edges
      const incomingEdges = currentEdges.filter(e => e.target === reactFlowNode.id);
      incomingEdges.forEach(edge => {
        currentEdges = animateEdge(currentEdges, edge.id, true);
      });
      onEdgesUpdate(currentEdges);

      try {
        // Execute the node
        const { data, executionTime } = await simulateNodeExecution(reactFlowNode.data as WorkflowNodeData);

        // Update node status to completed
        currentNodes = updateNodeStatus(currentNodes, reactFlowNode.id, 'completed', {
          executionTime,
          data
        });
        onNodesUpdate(currentNodes);

        // Add to execution results with proper type casting
        setExecutionResults(prev => [...prev, {
          nodeId: reactFlowNode.id,
          nodeName: reactFlowNode.data.name as string,
          status: 'completed',
          executionTime,
          data
        }]);

        // Stop animating incoming edges
        incomingEdges.forEach(edge => {
          currentEdges = animateEdge(currentEdges, edge.id, false);
        });
        onEdgesUpdate(currentEdges);

        // Find and execute next nodes
        const { outgoing } = findNodeConnections(workflow, workflowNode.name);
        if (outgoing.length > 0) {
          const nextNodes = workflow.nodes.filter(n => outgoing.includes(n.name));
          await new Promise(resolve => setTimeout(resolve, 300)); // Brief pause between nodes
          await executeNodesSequentially(nextNodes, currentNodes, currentEdges);
        }

      } catch (error) {
        // Update node status to error
        currentNodes = updateNodeStatus(currentNodes, reactFlowNode.id, 'error', {
          error: error.message
        });
        onNodesUpdate(currentNodes);

        // Add to execution results with proper type casting
        setExecutionResults(prev => [...prev, {
          nodeId: reactFlowNode.id,
          nodeName: reactFlowNode.data.name as string,
          status: 'error',
          executionTime: 0,
          error: error.message
        }]);

        // Stop animating edges
        incomingEdges.forEach(edge => {
          currentEdges = animateEdge(currentEdges, edge.id, false);
        });
        onEdgesUpdate(currentEdges);

        throw error; // Stop execution on error
      }
    }
  };

  const stopExecution = () => {
    setIsExecuting(false);
    setCurrentExecutingNode(null);
    
    // Reset all running nodes to pending
    const updatedNodes = nodes.map(node => {
      if (node.data.status === 'running') {
        return {
          ...node,
          data: {
            ...node.data,
            status: 'pending' as const
          }
        };
      }
      return node;
    });
    onNodesUpdate(updatedNodes);

    // Stop all edge animations
    const updatedEdges = edges.map(edge => ({
      ...edge,
      animated: false,
      style: {
        ...edge.style,
        stroke: 'rgba(255, 255, 255, 0.6)',
        strokeWidth: 2
      }
    }));
    onEdgesUpdate(updatedEdges);
  };

  const resetExecution = () => {
    setExecutionResults([]);
    setExecutionStartTime(null);
    
    // Reset all nodes to pending
    const updatedNodes = nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        status: 'pending' as const,
        executionTime: undefined,
        data: undefined,
        error: undefined
      }
    }));
    onNodesUpdate(updatedNodes);
  };

  const getExecutionStats = () => {
    const completed = executionResults.filter(r => r.status === 'completed').length;
    const errors = executionResults.filter(r => r.status === 'error').length;
    const totalTime = executionStartTime ? Date.now() - executionStartTime.getTime() : 0;

    return { completed, errors, totalTime, total: workflow.nodes.length };
  };

  const stats = getExecutionStats();

  return (
    <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Activity className="w-5 h-5 text-green-400" />
          <h3 className="text-white font-semibold">Local Execution Engine</h3>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            onClick={executeWorkflow}
            disabled={isExecuting}
            size="sm"
            className="bg-green-500 hover:bg-green-600 text-white"
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
          
          {isExecuting && (
            <Button onClick={stopExecution} size="sm" variant="destructive">
              <Square className="w-4 h-4 mr-2" />
              Stop
            </Button>
          )}
          
          <Button onClick={resetExecution} size="sm" variant="outline" className="text-white border-white/20">
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      {/* Execution Stats */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="text-center p-2 bg-white/5 rounded">
          <div className="text-lg font-bold text-green-400">{stats.completed}</div>
          <div className="text-xs text-white/60">Completed</div>
        </div>
        <div className="text-center p-2 bg-white/5 rounded">
          <div className="text-lg font-bold text-red-400">{stats.errors}</div>
          <div className="text-xs text-white/60">Errors</div>
        </div>
        <div className="text-center p-2 bg-white/5 rounded">
          <div className="text-lg font-bold text-blue-400">{stats.total}</div>
          <div className="text-xs text-white/60">Total Nodes</div>
        </div>
        <div className="text-center p-2 bg-white/5 rounded">
          <div className="text-lg font-bold text-white">{Math.round(stats.totalTime / 1000)}s</div>
          <div className="text-xs text-white/60">Duration</div>
        </div>
      </div>

      {/* Execution Results */}
      <div className="max-h-48 overflow-y-auto space-y-2">
        <AnimatePresence>
          {executionResults.map((result, index) => (
            <motion.div
              key={result.nodeId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.1 }}
              className={`p-2 rounded bg-white/5 border-l-2 ${
                result.status === 'completed' 
                  ? 'border-green-400' 
                  : 'border-red-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="text-white font-medium text-sm">{result.nodeName}</div>
                <div className={`text-xs font-medium ${
                  result.status === 'completed' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {result.status.toUpperCase()}
                </div>
              </div>
              {result.executionTime > 0 && (
                <div className="text-xs text-white/60">
                  Executed in {result.executionTime}ms
                </div>
              )}
              {result.error && (
                <div className="text-xs text-red-400 mt-1">
                  {result.error}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default LocalExecutionEngine;
