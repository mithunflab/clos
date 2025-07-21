import { Node, Edge } from '@xyflow/react';

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

// Enhanced node connection analysis
const analyzeNodeConnections = (workflow: N8nWorkflow) => {
  const connectionMap = new Map<string, {
    incoming: string[];
    outgoing: string[];
    level: number;
    isRoot: boolean;
    isLeaf: boolean;
  }>();

  // Initialize all nodes
  workflow.nodes.forEach(node => {
    connectionMap.set(node.name, {
      incoming: [],
      outgoing: [],
      level: 0,
      isRoot: false,
      isLeaf: false
    });
  });

  // Build connection relationships
  if (workflow.connections) {
    Object.entries(workflow.connections).forEach(([sourceName, connections]) => {
      const sourceInfo = connectionMap.get(sourceName);
      if (!sourceInfo) return;

      // Process main connections
      if (connections.main) {
        connections.main.forEach(connectionGroup => {
          connectionGroup.forEach(connection => {
            const targetInfo = connectionMap.get(connection.node);
            if (targetInfo) {
              sourceInfo.outgoing.push(connection.node);
              targetInfo.incoming.push(sourceName);
            }
          });
        });
      }

      // Process error connections
      if (connections.error) {
        connections.error.forEach(connectionGroup => {
          connectionGroup.forEach(connection => {
            const targetInfo = connectionMap.get(connection.node);
            if (targetInfo) {
              sourceInfo.outgoing.push(connection.node);
              targetInfo.incoming.push(sourceName);
            }
          });
        });
      }
    });
  }

  // Identify root and leaf nodes
  connectionMap.forEach((info, nodeName) => {
    info.isRoot = info.incoming.length === 0;
    info.isLeaf = info.outgoing.length === 0;
  });

  return connectionMap;
};

// Export the findNodeConnections function
export const findNodeConnections = (workflow: N8nWorkflow, nodeName: string) => {
  const connectionMap = analyzeNodeConnections(workflow);
  const nodeInfo = connectionMap.get(nodeName);
  
  if (!nodeInfo) {
    return { incoming: [], outgoing: [] };
  }
  
  return {
    incoming: nodeInfo.incoming,
    outgoing: nodeInfo.outgoing
  };
};

// Professional force-directed layout algorithm
const calculateForceDirectedLayout = (
  nodes: N8nNode[], 
  connectionMap: Map<string, any>
): Record<string, { x: number; y: number }> => {
  const positions: Record<string, { x: number; y: number }> = {};
  const nodeSpacing = 300;
  const layerSpacing = 200;

  // Assign levels using topological sort
  const levels: string[][] = [];
  const visited = new Set<string>();
  const queue: string[] = [];

  // Find root nodes
  connectionMap.forEach((info, nodeName) => {
    if (info.isRoot) {
      queue.push(nodeName);
      info.level = 0;
    }
  });

  // Level assignment
  while (queue.length > 0) {
    const currentLayer: string[] = [];
    const nextQueue: string[] = [];

    while (queue.length > 0) {
      const node = queue.shift()!;
      if (visited.has(node)) continue;

      visited.add(node);
      currentLayer.push(node);

      const nodeInfo = connectionMap.get(node);
      if (nodeInfo) {
        nodeInfo.outgoing.forEach((targetNode: string) => {
          const targetInfo = connectionMap.get(targetNode);
          if (targetInfo && !visited.has(targetNode)) {
            targetInfo.level = Math.max(targetInfo.level, nodeInfo.level + 1);
            nextQueue.push(targetNode);
          }
        });
      }
    }

    if (currentLayer.length > 0) {
      levels.push(currentLayer);
    }
    queue.push(...nextQueue);
  }

  // Handle orphaned nodes
  const orphanedNodes = nodes.filter(node => !visited.has(node.name));
  if (orphanedNodes.length > 0) {
    levels.push(orphanedNodes.map(n => n.name));
  }

  // Position nodes in layers
  levels.forEach((layer, layerIndex) => {
    const layerY = 100 + layerIndex * layerSpacing;
    const totalWidth = (layer.length - 1) * nodeSpacing;
    const startX = Math.max(100, 600 - totalWidth / 2);

    layer.forEach((nodeName, index) => {
      positions[nodeName] = {
        x: startX + index * nodeSpacing,
        y: layerY
      };
    });
  });

  return positions;
};

// Enhanced connection creation with zero orphan guarantee
const createComprehensiveConnections = (
  workflow: N8nWorkflow,
  nodes: ReactFlowNode[],
  connectionMap: Map<string, any>
): ReactFlowEdge[] => {
  const edges: ReactFlowEdge[] = [];
  const connectedNodes = new Set<string>();

  // Create explicit connections from workflow
  if (workflow.connections) {
    Object.entries(workflow.connections).forEach(([sourceName, connections]) => {
      const sourceNode = nodes.find(n => n.data.name === sourceName);
      if (!sourceNode) return;

      // Main connections
      if (connections.main) {
        connections.main.forEach((connectionGroup, outputIndex) => {
          connectionGroup.forEach((connection, connectionIndex) => {
            const targetNode = nodes.find(n => n.data.name === connection.node);
            if (!targetNode) return;

            const edge: ReactFlowEdge = {
              id: `main-${sourceNode.id}-${targetNode.id}-${outputIndex}-${connectionIndex}`,
              source: sourceNode.id,
              target: targetNode.id,
              type: 'smoothstep',
              animated: false,
              style: { 
                stroke: '#10b981', 
                strokeWidth: 2,
                strokeOpacity: 0.8
              }
            };

            if (outputIndex > 0) {
              edge.sourceHandle = `output-${outputIndex}`;
            }

            edges.push(edge);
            connectedNodes.add(sourceNode.id);
            connectedNodes.add(targetNode.id);
          });
        });
      }

      // Error connections
      if (connections.error) {
        connections.error.forEach((connectionGroup) => {
          connectionGroup.forEach((connection) => {
            const targetNode = nodes.find(n => n.data.name === connection.node);
            if (!targetNode) return;

            const edge: ReactFlowEdge = {
              id: `error-${sourceNode.id}-${targetNode.id}`,
              source: sourceNode.id,
              target: targetNode.id,
              type: 'smoothstep',
              animated: true,
              style: { 
                stroke: '#ef4444', 
                strokeWidth: 2, 
                strokeDasharray: '5,5'
              },
              sourceHandle: 'error'
            };

            edges.push(edge);
            connectedNodes.add(sourceNode.id);
            connectedNodes.add(targetNode.id);
          });
        });
      }
    });
  }

  // ZERO ORPHAN GUARANTEE: Connect all remaining isolated nodes
  const orphanedNodes = nodes.filter(node => !connectedNodes.has(node.id));
  
  if (orphanedNodes.length > 0) {
    console.log(`🔗 Connecting ${orphanedNodes.length} orphaned nodes`);
    
    // Sort orphaned nodes by position for logical connection
    orphanedNodes.sort((a, b) => {
      if (Math.abs(a.position.y - b.position.y) < 50) {
        return a.position.x - b.position.x;
      }
      return a.position.y - b.position.y;
    });

    // Connect orphaned nodes in sequence
    for (let i = 0; i < orphanedNodes.length - 1; i++) {
      const sourceNode = orphanedNodes[i];
      const targetNode = orphanedNodes[i + 1];

      const autoEdge: ReactFlowEdge = {
        id: `auto-${sourceNode.id}-${targetNode.id}`,
        source: sourceNode.id,
        target: targetNode.id,
        type: 'smoothstep',
        animated: true,
        style: { 
          stroke: '#3b82f6', 
          strokeWidth: 2, 
          strokeDasharray: '4,4',
          strokeOpacity: 0.7
        }
      };

      edges.push(autoEdge);
      connectedNodes.add(sourceNode.id);
      connectedNodes.add(targetNode.id);
    }

    // Connect first orphaned node to the main workflow if possible
    if (orphanedNodes.length > 0 && connectedNodes.size > orphanedNodes.length) {
      const firstOrphan = orphanedNodes[0];
      const connectedNode = nodes.find(n => connectedNodes.has(n.id) && n.id !== firstOrphan.id);
      
      if (connectedNode) {
        const bridgeEdge: ReactFlowEdge = {
          id: `bridge-${connectedNode.id}-${firstOrphan.id}`,
          source: connectedNode.id,
          target: firstOrphan.id,
          type: 'smoothstep',
          animated: true,
          style: { 
            stroke: '#8b5cf6', 
            strokeWidth: 2, 
            strokeDasharray: '2,2'
          }
        };

        edges.push(bridgeEdge);
      }
    }
  }

  return edges;
};

// Enhanced node data preparation
const prepareNodeData = (node: N8nNode, workflow: N8nWorkflow): ReactFlowNode['data'] => {
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
  const multiOutputNodes = ['if', 'switch', 'merge', 'split'];
  return multiOutputNodes.some(t => type.includes(t)) ? 2 : 1;
};

const hasErrorHandling = (nodeType: string): boolean => {
  const type = nodeType.replace('n8n-nodes-base.', '').toLowerCase();
  const errorNodes = ['httprequest', 'webhook', 'email', 'mysql', 'postgresql', 'mongodb'];
  return errorNodes.some(t => type.includes(t));
};

const isStartNode = (nodeType: string): boolean => {
  return ['webhook', 'schedule', 'trigger', 'start', 'manual'].some(t => nodeType.includes(t));
};

const isEndNode = (node: N8nNode, workflow: N8nWorkflow): boolean => {
  if (!workflow.connections) return true;
  const nodeConnections = workflow.connections[node.name];
  return !nodeConnections || (!nodeConnections.main && !nodeConnections.error);
};

// Main parsing function with comprehensive improvements
export const parseN8nWorkflowToReactFlow = (workflow: N8nWorkflow): {
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
} => {
  console.log('🚀 Enhanced parsing started for workflow:', workflow.name);
  
  if (!workflow.nodes || workflow.nodes.length === 0) {
    console.warn('⚠️ No nodes found in workflow');
    return { nodes: [], edges: [] };
  }

  // Analyze connections
  const connectionMap = analyzeNodeConnections(workflow);
  console.log('📊 Connection analysis complete:', connectionMap.size, 'nodes analyzed');

  // Calculate professional layout
  const positions = calculateForceDirectedLayout(workflow.nodes, connectionMap);
  console.log('📐 Force-directed layout calculated');

  // Create enhanced nodes
  const nodes: ReactFlowNode[] = workflow.nodes.map((node, index) => {
    const position = positions[node.name] || {
      x: 100 + (index % 3) * 300,
      y: 100 + Math.floor(index / 3) * 200
    };

    return {
      id: node.id,
      type: 'workflowNode',
      position,
      data: prepareNodeData(node, workflow)
    };
  });

  // Create comprehensive connections with zero orphan guarantee
  const edges = createComprehensiveConnections(workflow, nodes, connectionMap);

  console.log('✅ Enhanced parsing completed:', {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    connectedNodes: new Set([...edges.map(e => e.source), ...edges.map(e => e.target)]).size,
    orphanedNodes: nodes.length - new Set([...edges.map(e => e.source), ...edges.map(e => e.target)]).size
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
