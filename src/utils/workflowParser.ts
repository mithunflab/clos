import { Node, Edge } from '@xyflow/react';
import { analyzeWorkflowConnections, createSmartConnections } from './connectionAnalyzer';

export interface N8nNode {
  id: string;
  name: string;
  type: string;
  typeVersion?: number;
  position: [number, number];
  parameters?: any;
  credentials?: any;
  webhookId?: string;
  disabled?: boolean;
}

export interface N8nConnection {
  node: string;
  type: string;
  index: number;
}

export interface N8nWorkflow {
  id?: string;
  name: string;
  description?: string;
  active?: boolean;
  nodes: N8nNode[];
  connections: {
    [key: string]: {
      main?: N8nConnection[][];
      error?: N8nConnection[][];
    };
  };
  settings?: any;
  staticData?: any;
  tags?: string[];
  triggerCount?: number;
  updatedAt?: string;
  versionId?: string;
}

export interface ReactFlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    name: string;
    nodeType: string;
    type?: string;
    parameters?: any;
    credentials?: any;
    disabled?: boolean;
    outputs?: number;
    hasErrorOutput?: boolean;
    status?: 'pending' | 'running' | 'completed' | 'error';
    executionTime?: number;
    error?: string;
    isStartNode?: boolean;
    isEndNode?: boolean;
    workflowId?: string;
    originalNode?: N8nNode;
  };
}

export interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  animated?: boolean;
  style?: any;
}

// Professional force-directed layout algorithm
const calculateN8nStyleLayout = (
  nodes: N8nNode[], 
  connectionMap: Map<string, any>
): Record<string, { x: number; y: number }> => {
  const positions: Record<string, { x: number; y: number }> = {};
  const nodeSpacing = 280;
  const layerSpacing = 180;

  // Group nodes by levels
  const levels: string[][] = [];
  const maxLevel = Math.max(...Array.from(connectionMap.values()).map(info => info.level));

  for (let i = 0; i <= maxLevel; i++) {
    levels[i] = [];
  }

  // Assign nodes to levels
  connectionMap.forEach((info, nodeName) => {
    levels[info.level].push(nodeName);
  });

  // Position nodes in a more N8N-like layout
  levels.forEach((layer, layerIndex) => {
    if (layer.length === 0) return;
    
    const layerY = 100 + layerIndex * layerSpacing;
    const totalWidth = (layer.length - 1) * nodeSpacing;
    const startX = Math.max(150, 500 - totalWidth / 2);

    layer.forEach((nodeName, index) => {
      positions[nodeName] = {
        x: startX + index * nodeSpacing,
        y: layerY
      };
    });
  });

  // Handle nodes that might not have been positioned
  nodes.forEach((node, index) => {
    if (!positions[node.name]) {
      positions[node.name] = {
        x: 150 + (index % 4) * nodeSpacing,
        y: 100 + Math.floor(index / 4) * layerSpacing
      };
    }
  });

  return positions;
};

// Enhanced connection creation with N8N-like styling
const createN8nStyleConnections = (
  workflow: N8nWorkflow,
  nodes: ReactFlowNode[],
  connectionMap: Map<string, any>
): ReactFlowEdge[] => {
  const edges: ReactFlowEdge[] = [];
  const smartConnections = createSmartConnections(workflow, connectionMap);

  smartConnections.forEach((connection, index) => {
    const sourceNode = nodes.find(n => n.data.name === connection.source);
    const targetNode = nodes.find(n => n.data.name === connection.target);
    
    if (!sourceNode || !targetNode) return;

    let edgeStyle: any;
    let animated = false;
    let sourceHandle: string | undefined;

    switch (connection.type) {
      case 'main':
        edgeStyle = {
          stroke: '#999',
          strokeWidth: 2,
          strokeOpacity: 0.8
        };
        if (connection.outputIndex && connection.outputIndex > 0) {
          sourceHandle = `output-${connection.outputIndex}`;
        }
        break;
        
      case 'error':
        edgeStyle = {
          stroke: '#ff6b6b',
          strokeWidth: 2,
          strokeDasharray: '5,5'
        };
        sourceHandle = 'error';
        animated = true;
        break;
        
      case 'logical':
        edgeStyle = {
          stroke: '#64748b',
          strokeWidth: 1.5,
          strokeDasharray: '3,3',
          strokeOpacity: 0.6
        };
        animated = false;
        break;
    }

    const edge: ReactFlowEdge = {
      id: `${connection.type}-${sourceNode.id}-${targetNode.id}-${index}`,
      source: sourceNode.id,
      target: targetNode.id,
      type: 'smoothstep',
      animated,
      style: edgeStyle,
      sourceHandle
    };

    edges.push(edge);
  });

  console.log(`✅ Created ${edges.length} connections with smart logic`);
  return edges;
};

// Enhanced node data preparation
const prepareN8nNodeData = (node: N8nNode, workflow: N8nWorkflow): ReactFlowNode['data'] => {
  const nodeType = node.type.replace('n8n-nodes-base.', '').toLowerCase();
  
  return {
    name: node.name,
    nodeType: node.type,
    type: node.type,
    parameters: node.parameters || {},
    credentials: node.credentials || {},
    disabled: node.disabled || false,
    outputs: getNodeOutputCount(node.type),
    hasErrorOutput: hasErrorHandling(node.type),
    isStartNode: isStartNode(nodeType),
    isEndNode: isEndNode(node, workflow),
    workflowId: workflow.id,
    originalNode: node
  };
};

// Enhanced node type detection
const getNodeOutputCount = (nodeType: string): number => {
  const type = nodeType.replace('n8n-nodes-base.', '').toLowerCase();
  const multiOutputNodes = ['if', 'switch', 'merge', 'split', 'merge'];
  return multiOutputNodes.some(t => type.includes(t)) ? 2 : 1;
};

const hasErrorHandling = (nodeType: string): boolean => {
  const type = nodeType.replace('n8n-nodes-base.', '').toLowerCase();
  const errorNodes = ['httprequest', 'webhook', 'email', 'mysql', 'postgresql', 'mongodb', 'telegram'];
  return errorNodes.some(t => type.includes(t));
};

const isStartNode = (nodeType: string): boolean => {
  return ['webhook', 'schedule', 'trigger', 'start', 'manual', 'telegram'].some(t => nodeType.includes(t));
};

const isEndNode = (node: N8nNode, workflow: N8nWorkflow): boolean => {
  if (!workflow.connections) return true;
  const nodeConnections = workflow.connections[node.name];
  return !nodeConnections || (!nodeConnections.main && !nodeConnections.error);
};

// Export the findNodeConnections function
export const findNodeConnections = (workflow: N8nWorkflow, nodeName: string) => {
  const connectionMap = analyzeWorkflowConnections(workflow);
  const nodeInfo = connectionMap.get(nodeName);
  
  if (!nodeInfo) {
    return { incoming: [], outgoing: [] };
  }
  
  return {
    incoming: nodeInfo.incoming,
    outgoing: nodeInfo.outgoing
  };
};

// Main parsing function with N8N-style improvements
export const parseN8nWorkflowToReactFlow = (workflow: N8nWorkflow): {
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
} => {
  console.log('🚀 N8N-style parsing started for workflow:', workflow.name);
  
  if (!workflow.nodes || workflow.nodes.length === 0) {
    console.warn('⚠️ No nodes found in workflow');
    return { nodes: [], edges: [] };
  }

  // Analyze connections with smart logic
  const connectionMap = analyzeWorkflowConnections(workflow);
  console.log('📊 Smart connection analysis complete:', connectionMap.size, 'nodes analyzed');

  // Calculate N8N-style layout
  const positions = calculateN8nStyleLayout(workflow.nodes, connectionMap);
  console.log('📐 N8N-style layout calculated');

  // Create enhanced nodes with N8N styling
  const nodes: ReactFlowNode[] = workflow.nodes.map((node) => {
    const position = positions[node.name] || {
      x: 150 + Math.random() * 200,
      y: 100 + Math.random() * 200
    };

    return {
      id: node.id,
      type: 'workflowNode',
      position,
      data: prepareN8nNodeData(node, workflow)
    };
  });

  // Create N8N-style connections with smart logic
  const edges = createN8nStyleConnections(workflow, nodes, connectionMap);

  const connectedNodeIds = new Set([...edges.map(e => e.source), ...edges.map(e => e.target)]);
  const totalConnected = connectedNodeIds.size;
  const totalNodes = nodes.length;

  console.log('✅ N8N-style parsing completed:', {
    totalNodes,
    totalEdges: edges.length,
    connectedNodes: totalConnected,
    isolatedNodes: totalNodes - totalConnected,
    connectionCoverage: `${Math.round((totalConnected / totalNodes) * 100)}%`
  });

  return { nodes, edges };
};

// Utility functions for node status updates
export const updateNodeStatus = (
  nodes: Node[],
  nodeId: string,
  status: 'pending' | 'running' | 'completed' | 'error',
  additionalData?: { executionTime?: number; data?: any; error?: string }
): Node[] => {
  return nodes.map(node => {
    if (node.id === nodeId) {
      return {
        ...node,
        data: {
          ...node.data,
          status,
          ...additionalData
        }
      };
    }
    return node;
  });
};

export const animateEdge = (
  edges: Edge[],
  edgeId: string,
  animated: boolean
): Edge[] => {
  return edges.map(edge => {
    if (edge.id === edgeId) {
      return {
        ...edge,
        animated,
        style: {
          ...edge.style,
          stroke: animated ? '#10b981' : 'rgba(255, 255, 255, 0.6)',
          strokeWidth: animated ? 3 : 2
        }
      };
    }
    return edge;
  });
};

// Update workflow JSON when node properties change
export const updateWorkflowFromNode = (
  workflow: N8nWorkflow,
  nodeId: string,
  updatedData: Partial<ReactFlowNode['data']>
): N8nWorkflow => {
  const updatedWorkflow = { ...workflow };
  
  const nodeIndex = updatedWorkflow.nodes.findIndex(n => n.id === nodeId);
  if (nodeIndex === -1) return workflow;

  const node = updatedWorkflow.nodes[nodeIndex];
  updatedWorkflow.nodes[nodeIndex] = {
    ...node,
    parameters: updatedData.parameters || node.parameters,
    credentials: updatedData.credentials || node.credentials,
    disabled: updatedData.disabled ?? node.disabled
  };

  return updatedWorkflow;
};
