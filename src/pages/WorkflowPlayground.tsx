
import React, { useState, useCallback, useEffect } from 'react';
import { ReactFlow, Background, Controls, useNodesState, useEdgesState, addEdge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Play, Save, Download, Upload, Zap, Settings, Trash2, Code, ExternalLink } from 'lucide-react';
import { useWorkflowDeployment } from '@/hooks/useWorkflowDeployment';
import { useWorkflowStorageV2 } from '@/hooks/useWorkflowStorageV2';
import { useAICredits } from '@/hooks/useAICredits';
import { useCredentialStorage } from '@/hooks/useCredentialStorage';
import { motion } from 'framer-motion';

const WorkflowPlayground = () => {
  const { toast } = useToast();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [workflowName, setWorkflowName] = useState('Untitled Workflow');
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResults, setExecutionResults] = useState<any[]>([]);
  
  const { 
    deployWorkflow, 
    getDeploymentStatus, 
    loading: deploymentLoading,
    error: deploymentError 
  } = useWorkflowDeployment();
  
  const { 
    saveWorkflow, 
    deployWorkflow: deployWorkflowV2,
    workflows,
    loading: workflowLoading 
  } = useWorkflowStorageV2();
  
  const { credits, deductCredit } = useAICredits();
  const { credentials } = useCredentialStorage();

  const onConnect = useCallback((params: any) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const handleSaveWorkflow = async () => {
    if (!workflowName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a workflow name",
        variant: "destructive"
      });
      return;
    }

    const workflowData = {
      nodes,
      edges,
      name: workflowName,
      version: '1.0.0'
    };

    const workflowId = currentWorkflowId || `workflow_${Date.now()}`;
    
    try {
      const result = await saveWorkflow(workflowId, workflowName, workflowData);
      
      if (result) {
        setCurrentWorkflowId(workflowId);
        toast({
          title: "Workflow Saved",
          description: `"${workflowName}" has been saved successfully.`
        });
      } else {
        throw new Error('Failed to save workflow');
      }
    } catch (error) {
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save workflow",
        variant: "destructive"
      });
    }
  };

  const handleDeployWorkflow = async () => {
    if (!currentWorkflowId) {
      toast({
        title: "Error",
        description: "Please save the workflow first",
        variant: "destructive"
      });
      return;
    }

    if (!credits || credits.current_credits < 1) {
      toast({
        title: "Insufficient Credits",
        description: "You need at least 1 credit to deploy a workflow",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsExecuting(true);
      
      const result = await deployWorkflowV2(currentWorkflowId);
      
      if (result.success) {
        await deductCredit(1);
        toast({
          title: "Deployment Started",
          description: "Your workflow is being deployed to N8N",
        });
      } else {
        throw new Error(result.error || 'Deployment failed');
      }
    } catch (error) {
      toast({
        title: "Deployment Failed",
        description: error instanceof Error ? error.message : "Failed to deploy workflow",
        variant: "destructive"
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleExecuteWorkflow = async () => {
    if (!currentWorkflowId) {
      toast({
        title: "Error",
        description: "Please save the workflow first",
        variant: "destructive"
      });
      return;
    }

    if (!credits || credits.current_credits < 1) {
      toast({
        title: "Insufficient Credits", 
        description: "You need at least 1 credit to execute a workflow",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsExecuting(true);
      
      const result = await deployWorkflowV2(currentWorkflowId);
      
      if (result.success) {
        await deductCredit(1);
        setExecutionResults([{
          id: Date.now(),
          status: 'success',
          message: 'Workflow executed successfully',
          timestamp: new Date().toISOString()
        }]);
        
        toast({
          title: "Execution Started",
          description: "Your workflow is being executed",
        });
      } else {
        throw new Error(result.error || 'Execution failed');
      }
    } catch (error) {
      setExecutionResults([{
        id: Date.now(),
        status: 'error',
        message: error instanceof Error ? error.message : 'Execution failed',
        timestamp: new Date().toISOString()
      }]);
      
      toast({
        title: "Execution Failed",
        description: error instanceof Error ? error.message : "Failed to execute workflow",
        variant: "destructive"
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleClearWorkflow = () => {
    setNodes([]);
    setEdges([]);
    setWorkflowName('Untitled Workflow');
    setCurrentWorkflowId(null);
    setExecutionResults([]);
    
    toast({
      title: "Workflow Cleared",
      description: "Canvas has been cleared"
    });
  };

  const deploymentStatus = currentWorkflowId ? getDeploymentStatus(currentWorkflowId) : 'not-deployed';

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <Input
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="w-64 bg-background border-border"
              placeholder="Enter workflow name..."
            />
            <Badge variant="outline" className="bg-muted text-muted-foreground">
              {deploymentStatus}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleSaveWorkflow}
              disabled={workflowLoading}
              variant="outline"
              size="sm"
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            
            <Button
              onClick={handleExecuteWorkflow}
              disabled={isExecuting || !currentWorkflowId}
              variant="outline"
              size="sm"
            >
              <Play className="w-4 h-4 mr-2" />
              {isExecuting ? 'Executing...' : 'Execute'}
            </Button>
            
            <Button
              onClick={handleDeployWorkflow}
              disabled={deploymentLoading || !currentWorkflowId}
              size="sm"
            >
              <Zap className="w-4 h-4 mr-2" />
              {deploymentLoading ? 'Deploying...' : 'Deploy'}
            </Button>
            
            <Button
              onClick={handleClearWorkflow}
              variant="ghost"
              size="sm"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
            className="bg-background"
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>

        <div className="w-80 border-l border-border bg-card/50 backdrop-blur-sm overflow-y-auto">
          <div className="p-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Workflow Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge variant={deploymentStatus === 'deployed' ? 'default' : 'secondary'}>
                    {deploymentStatus}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Credits:</span>
                  <span className="text-sm font-medium">{credits?.current_credits || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Nodes:</span>
                  <span className="text-sm font-medium">{nodes.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Connections:</span>
                  <span className="text-sm font-medium">{edges.length}</span>
                </div>
              </CardContent>
            </Card>

            {executionResults.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Execution Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {executionResults.map((result) => (
                      <div key={result.id} className="p-2 bg-muted/50 rounded text-xs">
                        <div className="flex justify-between items-center">
                          <Badge variant={result.status === 'success' ? 'default' : 'destructive'}>
                            {result.status}
                          </Badge>
                          <span className="text-muted-foreground">
                            {new Date(result.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="mt-1 text-foreground">{result.message}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowPlayground;
