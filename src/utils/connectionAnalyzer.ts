
import { N8nWorkflow, N8nNode } from './workflowParser';

export interface NodeConnectionInfo {
  incoming: string[];
  outgoing: string[];
  level: number;
  isRoot: boolean;
  isLeaf: boolean;
  hasMainConnections: boolean;
  hasErrorConnections: boolean;
}

export const analyzeWorkflowConnections = (workflow: N8nWorkflow) => {
  const connectionMap = new Map<string, NodeConnectionInfo>();
  const processedNodes = new Set<string>();

  // Initialize all nodes
  workflow.nodes.forEach(node => {
    connectionMap.set(node.name, {
      incoming: [],
      outgoing: [],
      level: 0,
      isRoot: false,
      isLeaf: false,
      hasMainConnections: false,
      hasErrorConnections: false
    });
  });

  // Process explicit connections from workflow
  if (workflow.connections) {
    Object.entries(workflow.connections).forEach(([sourceName, connections]) => {
      const sourceInfo = connectionMap.get(sourceName);
      if (!sourceInfo) return;

      // Process main connections
      if (connections.main && connections.main.length > 0) {
        sourceInfo.hasMainConnections = true;
        connections.main.forEach(connectionGroup => {
          connectionGroup.forEach(connection => {
            const targetInfo = connectionMap.get(connection.node);
            if (targetInfo) {
              sourceInfo.outgoing.push(connection.node);
              targetInfo.incoming.push(sourceName);
              processedNodes.add(sourceName);
              processedNodes.add(connection.node);
            }
          });
        });
      }

      // Process error connections
      if (connections.error && connections.error.length > 0) {
        sourceInfo.hasErrorConnections = true;
        connections.error.forEach(connectionGroup => {
          connectionGroup.forEach(connection => {
            const targetInfo = connectionMap.get(connection.node);
            if (targetInfo) {
              sourceInfo.outgoing.push(connection.node);
              targetInfo.incoming.push(sourceName);
              processedNodes.add(sourceName);
              processedNodes.add(connection.node);
            }
          });
        });
      }
    });
  }

  // Find isolated nodes and create logical connections
  const isolatedNodes = workflow.nodes.filter(node => !processedNodes.has(node.name));
  const connectedNodes = workflow.nodes.filter(node => processedNodes.has(node.name));

  console.log(`📊 Connection Analysis: ${connectedNodes.length} connected, ${isolatedNodes.length} isolated nodes`);

  // Create logical connections for isolated nodes
  if (isolatedNodes.length > 0) {
    // Sort nodes by position for logical flow
    const sortedNodes = [...workflow.nodes].sort((a, b) => {
      const posA = a.position || [0, 0];
      const posB = b.position || [0, 0];
      
      // Primary sort by Y position (top to bottom)
      if (Math.abs(posA[1] - posB[1]) > 50) {
        return posA[1] - posB[1];
      }
      // Secondary sort by X position (left to right)
      return posA[0] - posB[0];
    });

    // Connect isolated nodes in sequence based on position
    for (let i = 0; i < isolatedNodes.length - 1; i++) {
      const sourceNode = isolatedNodes[i];
      const targetNode = isolatedNodes[i + 1];
      
      const sourceInfo = connectionMap.get(sourceNode.name);
      const targetInfo = connectionMap.get(targetNode.name);
      
      if (sourceInfo && targetInfo) {
        sourceInfo.outgoing.push(targetNode.name);
        targetInfo.incoming.push(sourceNode.name);
        sourceInfo.hasMainConnections = true;
      }
    }

    // Connect first isolated node to main workflow if possible
    if (isolatedNodes.length > 0 && connectedNodes.length > 0) {
      const firstIsolated = isolatedNodes[0];
      // Find the best connection point in the main workflow
      const rootNodes = connectedNodes.filter(node => {
        const info = connectionMap.get(node.name);
        return info && info.incoming.length === 0;
      });

      if (rootNodes.length > 0) {
        const targetRoot = rootNodes[0];
        const firstIsolatedInfo = connectionMap.get(firstIsolated.name);
        const targetRootInfo = connectionMap.get(targetRoot.name);
        
        if (firstIsolatedInfo && targetRootInfo) {
          firstIsolatedInfo.outgoing.push(targetRoot.name);
          targetRootInfo.incoming.push(firstIsolated.name);
          firstIsolatedInfo.hasMainConnections = true;
        }
      }
    }
  }

  // Calculate levels and identify root/leaf nodes
  connectionMap.forEach((info, nodeName) => {
    info.isRoot = info.incoming.length === 0;
    info.isLeaf = info.outgoing.length === 0;
  });

  // Assign levels using topological sort
  const visited = new Set<string>();
  const queue: string[] = [];

  // Start with root nodes
  connectionMap.forEach((info, nodeName) => {
    if (info.isRoot) {
      queue.push(nodeName);
      info.level = 0;
    }
  });

  while (queue.length > 0) {
    const currentNode = queue.shift()!;
    if (visited.has(currentNode)) continue;
    
    visited.add(currentNode);
    const currentInfo = connectionMap.get(currentNode);
    
    if (currentInfo) {
      currentInfo.outgoing.forEach(targetNode => {
        const targetInfo = connectionMap.get(targetNode);
        if (targetInfo && !visited.has(targetNode)) {
          targetInfo.level = Math.max(targetInfo.level, currentInfo.level + 1);
          queue.push(targetNode);
        }
      });
    }
  }

  return connectionMap;
};

export const createSmartConnections = (workflow: N8nWorkflow, connectionMap: Map<string, NodeConnectionInfo>) => {
  const connections: Array<{
    source: string;
    target: string;
    type: 'main' | 'error' | 'logical';
    outputIndex?: number;
  }> = [];

  // Add explicit workflow connections
  if (workflow.connections) {
    Object.entries(workflow.connections).forEach(([sourceName, nodeConnections]) => {
      // Main connections
      if (nodeConnections.main) {
        nodeConnections.main.forEach((connectionGroup, outputIndex) => {
          connectionGroup.forEach(connection => {
            connections.push({
              source: sourceName,
              target: connection.node,
              type: 'main',
              outputIndex
            });
          });
        });
      }

      // Error connections
      if (nodeConnections.error) {
        nodeConnections.error.forEach(connectionGroup => {
          connectionGroup.forEach(connection => {
            connections.push({
              source: sourceName,
              target: connection.node,
              type: 'error'
            });
          });
        });
      }
    });
  }

  // Add logical connections for isolated nodes
  connectionMap.forEach((info, nodeName) => {
    info.outgoing.forEach(targetName => {
      // Only add if not already in explicit connections
      const existsInExplicit = connections.some(conn => 
        conn.source === nodeName && conn.target === targetName
      );
      
      if (!existsInExplicit && !info.hasMainConnections) {
        connections.push({
          source: nodeName,
          target: targetName,
          type: 'logical'
        });
      }
    });
  });

  return connections;
};
