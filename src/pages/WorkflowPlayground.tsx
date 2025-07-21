import React, { useState, useCallback, useEffect, useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import { 
  Play, 
  Settings, 
  Plus, 
  User,
  MoreHorizontal,
  Home,
  Rocket,
  Loader2,
  Zap,
  Github
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import AIAssistantSidebar from '@/components/AIAssistantSidebar';
import CodePreview from '@/components/CodePreview';
import RealTimeN8nEngine from '@/components/RealTimeN8nEngine';
import WorkflowNode from '@/components/WorkflowNode';
import NodePropertyEditor from '@/components/NodePropertyEditor';
import { parseN8nWorkflowToReactFlow, N8nWorkflow, updateWorkflowFromNode } from '@/utils/workflowParser';
import { useWorkflowConfiguration } from '@/hooks/useWorkflowConfiguration';
import { useWorkflowDeployment } from '@/hooks/useWorkflowDeployment';
import { useWorkflowMonitoring } from '@/hooks/useWorkflowMonitoring';
import { useGitHubIntegration } from '@/hooks/useGitHubIntegration';
import N8nConfigToggle from '@/components/N8nConfigToggle';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { JsonWritingAnimation } from '@/components/JsonWritingAnimation';

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

const nodeTypes = {
  workflowNode: WorkflowNode,
};

const WorkflowPlayground = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Editor');
  const [workflowName, setWorkflowName] = useState('My workflow');
  const [showCodePreview, setShowCodePreview] = useState(false);
  const [showN8nEngine, setShowN8nEngine] = useState(false);
  const [generatedWorkflow, setGeneratedWorkflow] = useState<N8nWorkflow | null>(null);
  const [generatedCode, setGeneratedCode] = useState<any>(null);
  const [liveFiles, setLiveFiles] = useState<{[key: string]: string}>({});
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [n8nWorkflowId, setN8nWorkflowId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showNodeEditor, setShowNodeEditor] = useState(false);
  const [deploymentMessage, setDeploymentMessage] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showJsonAnimation, setShowJsonAnimation] = useState(false);
  const [animationJsonContent, setAnimationJsonContent] = useState('');
  const [showN8nConfig, setShowN8nConfig] = useState(false);
  const [isCreatingRepo, setIsCreatingRepo] = useState(false);

  const workflowConfig = useWorkflowConfiguration(workflowId);
  const workflowDeployment = useWorkflowDeployment(workflowId);
  const workflowMonitoring = useWorkflowMonitoring(workflowId);
  const { createWorkflowRepository } = useGitHubIntegration();
  
  const isActive = workflowDeployment.deploymentStatus?.status === 'active';
  const isDeploying = workflowDeployment.isDeploying;
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Define callbacks first
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds));
    },
    [setEdges]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedNode(node);
    setShowNodeEditor(true);
  }, []);

  // Memoize the ReactFlow props and prevent all re-renders unless absolutely necessary
  const reactFlowProps = useMemo(() => ({
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    fitView: true,
    nodeTypes,
    style: { backgroundColor: 'transparent' },
    nodesDraggable: true,
    nodesConnectable: true,
    elementsSelectable: true,
    preventScrolling: false,
    deleteKeyCode: null, // Prevent accidental deletions
    multiSelectionKeyCode: null, // Disable multi-selection to reduce complexity
  }), [nodes, edges, onNodesChange, onEdgesChange]);

  const handleSaveNodeProperties = useCallback((nodeId: string, nodeData: any) => {
    console.log('💾 Saving node properties:', nodeId, nodeData);
    
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              ...nodeData,
            },
          };
        }
        return node;
      })
    );

    if (generatedWorkflow) {
      const updatedWorkflow = updateWorkflowFromNode(generatedWorkflow, nodeId, nodeData);
      setGeneratedWorkflow(updatedWorkflow);
      
      const workflowJson = JSON.stringify(updatedWorkflow, null, 2);
      const fileName = `workflow_${Date.now()}.json`;
      
      setAnimationJsonContent(workflowJson);
      setShowJsonAnimation(true);
      
      setLiveFiles(prev => ({ ...prev, [fileName]: workflowJson }));
      
      setHasUnsavedChanges(true);
      console.log('✅ Workflow JSON updated and saved to file with animation');
    }
  }, [setNodes, generatedWorkflow]);

  const handleJsonUpdate = useCallback((updateData: any) => {
    console.log('🔄 Handling JSON update:', updateData);
    
    if (generatedWorkflow && updateData.nodeId) {
      const updatedWorkflow = updateWorkflowFromNode(
        generatedWorkflow, 
        updateData.nodeId, 
        updateData.updatedData
      );
      
      setGeneratedWorkflow(updatedWorkflow);
      setHasUnsavedChanges(true);
      
      const workflowJson = JSON.stringify(updatedWorkflow, null, 2);
      const fileName = `workflow_live_${Date.now()}.json`;
      
      setAnimationJsonContent(workflowJson);
      setShowJsonAnimation(true);
      
      setLiveFiles(prev => ({ ...prev, [fileName]: workflowJson }));
    }
  }, [generatedWorkflow]);

  const autoRedeploy = useCallback(async () => {
    if (!generatedWorkflow || !n8nWorkflowId || !hasUnsavedChanges) return;

    console.log('🔄 Auto-redeploying updated workflow...');
    
    try {
      const result = await workflowDeployment.deployWorkflow(generatedWorkflow);
      
      if (result && result.success) {
        setHasUnsavedChanges(false);
        addDeploymentMessageToChat('✅ **Auto-Redeployment Successful!** Changes have been updated in n8n.');
        
        await workflowMonitoring.logRealTimeEvent(
          'success',
          'Workflow auto-redeployed successfully',
          undefined,
          undefined,
          { auto_redeploy: true, timestamp: new Date().toISOString() }
        );
      }
    } catch (error) {
      console.error('❌ Auto-redeploy failed:', error);
      addDeploymentMessageToChat('⚠️ **Auto-Redeploy Failed** - Please manually redeploy your changes.');
    }
  }, [generatedWorkflow, n8nWorkflowId, hasUnsavedChanges, workflowDeployment, workflowMonitoring]);

  useEffect(() => {
    if (hasUnsavedChanges) {
      const timer = setTimeout(() => {
        autoRedeploy();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [hasUnsavedChanges, autoRedeploy]);

  const addDeploymentMessageToChat = (message: string, isError: boolean = false) => {
    setDeploymentMessage(message);
  };

  const handleCreateGitHubRepo = async () => {
    if (!generatedWorkflow) {
      addDeploymentMessageToChat('❌ Generate a workflow first to create a GitHub repository', true);
      return;
    }

    try {
      setIsCreatingRepo(true);
      console.log('🚀 Creating GitHub repository for workflow...');

      const workflowData = {
        name: generatedWorkflow.name || 'Untitled Workflow',
        workflow: generatedWorkflow,
        chat: workflowConfig.chatHistory,
        nodes: generatedWorkflow.nodes || [],
        connections: generatedWorkflow.connections || {},
        metadata: {
          created_at: new Date().toISOString(),
          workflow_id: workflowId,
          ai_model: 'gemini-2.0-flash-exp'
        }
      };

      const result = await createWorkflowRepository(workflowData, workflowId || 'temp_id');
      
      if (result && result.success) {
        const successMessage = `✅ **GitHub Repository Created!**\n\n🔗 **Repository URL:** ${result.repository?.url}\n📋 **Repository Name:** ${result.repository?.name}\n\n*Your workflow has been synced to GitHub successfully!*`;
        addDeploymentMessageToChat(successMessage);
        
        await workflowMonitoring.logRealTimeEvent(
          'success',
          `GitHub repository created: ${result.repository?.name}`,
          undefined,
          undefined,
          { 
            github_repo_url: result.repository?.url,
            github_repo_name: result.repository?.name,
            timestamp: new Date().toISOString()
          }
        );
      } else {
        throw new Error('Failed to create GitHub repository');
      }
      
    } catch (error) {
      console.error('❌ Error creating GitHub repository:', error);
      const errorMessage = `❌ **GitHub Sync Failed**\n\n${error.message || 'Unknown error occurred'}\n\nPlease check your GitHub configuration and try again.`;
      addDeploymentMessageToChat(errorMessage, true);
      
      await workflowMonitoring.logRealTimeEvent(
        'error',
        `Failed to create GitHub repository: ${error.message}`,
        undefined,
        undefined,
        { error: error.message }
      );
    } finally {
      setIsCreatingRepo(false);
    }
  };

  const handleToggleCodePreview = () => {
    console.log('🔄 Toggling code preview:', !showCodePreview);
    setShowCodePreview(!showCodePreview);
    setShowN8nEngine(false);
  };

  const handleToggleN8nEngine = () => {
    console.log('🔄 Toggling n8n engine:', !showN8nEngine);
    setShowN8nEngine(!showN8nEngine);
    setShowCodePreview(false);
  };

  const handleGenerationStart = () => {
    console.log('🚀 Generation started - switching to code preview');
    setShowCodePreview(true);
    setShowN8nEngine(false);
    setLiveFiles({});
  };

  const handleFileGenerated = (fileName: string, content: string) => {
    console.log('📝 File generated:', {
      fileName,
      contentLength: content.length,
      contentPreview: content.substring(0, 100) + '...',
      isJson: fileName.includes('.json')
    });
    
    if (fileName.includes('.json')) {
      setAnimationJsonContent(content);
      setShowJsonAnimation(true);
    }
    
    setLiveFiles(prev => {
      const updated = {
        ...prev,
        [fileName]: content
      };
      console.log('✅ Live files updated:', Object.keys(updated));
      return updated;
    });
    
    if (!showCodePreview) {
      console.log('🔄 Auto-switching to code preview');
      setShowCodePreview(true);
      setShowN8nEngine(false);
    }
  };

  const handleWorkflowGenerated = async (workflow: any, code: any) => {
    console.log('🎯 Enhanced workflow generation:', {
      workflowName: workflow?.name,
      nodeCount: workflow?.nodes?.length || 0,
      hasConnections: !!workflow?.connections,
      codeKeys: code ? Object.keys(code) : []
    });

    if (!workflow || !workflow.nodes || !Array.isArray(workflow.nodes)) {
      console.error('❌ Invalid workflow provided');
      return;
    }

    const workflowJson = JSON.stringify(workflow, null, 2);
    const timestamp = Date.now();
    const fileName = `${(workflow.name || 'generated_workflow').replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.json`;
    
    console.log('📝 Creating workflow JSON file:', fileName);
    
    setAnimationJsonContent(workflowJson);
    setShowJsonAnimation(true);

    setGeneratedWorkflow(workflow);
    setGeneratedCode({
      ...code,
      workflowJson: workflowJson
    });
    setWorkflowName(workflow.name || 'AI Generated Workflow');
    
    const newWorkflowId = workflow.deployment?.workflowId || `workflow_${timestamp}`;
    setWorkflowId(newWorkflowId);
    
    if (workflow.deployment?.workflowId) {
      setN8nWorkflowId(workflow.deployment.workflowId);
    }
    
    setLiveFiles(prev => {
      const updated = { ...prev, [fileName]: workflowJson };
      console.log('✅ Workflow JSON added to live files:', fileName);
      return updated;
    });
    
    // Save with enhanced chat history
    await workflowConfig.saveConfiguration({
      name: workflow.name,
      description: workflow.description || '',
      ai_generated: true,
      nodes_count: workflow.nodes?.length || 0,
      nodes: workflow.nodes,
      connections: workflow.connections || {}
    }, undefined, workflowConfig.chatHistory);
    
    if (workflow.nodes) {
      await workflowConfig.saveNodes(workflow.nodes);
    }
    
    try {
      console.log('🚀 Parsing workflow for canvas display...');
      const { nodes: parsedNodes, edges: parsedEdges } = parseN8nWorkflowToReactFlow(workflow);
      
      console.log('✅ Canvas parsing completed:', {
        parsedNodesCount: parsedNodes.length,
        parsedEdgesCount: parsedEdges.length
      });
      
      if (parsedNodes.length > 0) {
        setNodes(parsedNodes);
        setEdges(parsedEdges);
        
        setTimeout(() => {
          const reactFlowInstance = document.querySelector('.react-flow');
          if (reactFlowInstance) {
            const event = new Event('resize');
            window.dispatchEvent(event);
          }
        }, 500);
      }
      
      setShowCodePreview(true);
      setShowN8nEngine(false);
      
      await workflowMonitoring.logRealTimeEvent(
        'success',
        `Workflow "${workflow.name}" generated with ${parsedNodes.length} nodes`,
        undefined,
        undefined,
        { 
          generation_timestamp: new Date().toISOString(),
          node_count: parsedNodes.length,
          edge_count: parsedEdges.length,
          json_file: fileName
        }
      );
      
    } catch (error) {
      console.error('❌ Error parsing workflow:', error);
      await workflowMonitoring.logRealTimeEvent(
        'error',
        `Failed to parse workflow: ${error.message}`,
        undefined,
        undefined,
        { error: error.message, workflow: workflow }
      );
    }
  };

  const getDeployButtonText = () => {
    if (isDeploying) {
      return n8nWorkflowId ? 'Updating...' : 'Deploying...';
    }
    
    if (hasUnsavedChanges && n8nWorkflowId) {
      return 'Update Workflow';
    }
    
    return n8nWorkflowId ? 'Redeploy' : 'Deploy to N8n';
  };

  const getDeployButtonIcon = () => {
    if (isDeploying) {
      return <Loader2 className="w-4 h-4 mr-2 animate-spin" />;
    }
    
    if (hasUnsavedChanges) {
      return <Zap className="w-4 h-4 mr-2" />;
    }
    
    return <Rocket className="w-4 h-4 mr-2" />;
  };

  const handleDeploy = async () => {
    if (!generatedWorkflow) {
      addDeploymentMessageToChat('❌ Generate a workflow first using the AI Assistant', true);
      return;
    }

    try {
      console.log('🚀 Deploying workflow to n8n...', generatedWorkflow.name);
      
      const result = await workflowDeployment.deployWorkflow(generatedWorkflow);
      
      if (result && result.success) {
        if (result.workflowId) {
          console.log('🔗 Setting n8n workflow ID from deployment:', result.workflowId);
          setN8nWorkflowId(result.workflowId);
        }
        
        const successMessage = `✅ **Deployment Successful!**\n\nWorkflow "${generatedWorkflow.name}" has been deployed to n8n!\n\n🔗 **N8n Workflow URL:** ${result.workflowUrl || 'Check your n8n instance'}\n📋 **Workflow ID:** ${result.workflowId}\n\n*You can now activate the workflow using the toggle switch above.*`;
        
        addDeploymentMessageToChat(successMessage);
        
        await workflowMonitoring.logRealTimeEvent(
          'success',
          `Workflow "${generatedWorkflow.name}" deployed successfully`,
          undefined,
          undefined,
          { 
            deployment_timestamp: new Date().toISOString(),
            workflow_name: generatedWorkflow.name,
            n8n_workflow_id: result.workflowId
          }
        );
      } else if (result && typeof result === 'object' && 'error' in result) {
        const errorMessage = `❌ **Deployment Failed**\n\n${result.error || 'Unknown deployment error occurred'}\n\nPlease check your n8n configuration and try again.`;
        addDeploymentMessageToChat(errorMessage, true);
      } else {
        const errorMessage = `❌ **Deployment Failed**\n\nUnknown deployment error occurred\n\nPlease check your n8n configuration and try again.`;
        addDeploymentMessageToChat(errorMessage, true);
      }
      
    } catch (error) {
      console.error('❌ Error during deployment:', error);
      const errorMessage = `❌ **Deployment Error**\n\n${error.message || 'Unknown error occurred'}\n\nPlease try again or check the console for more details.`;
      addDeploymentMessageToChat(errorMessage, true);
      
      await workflowMonitoring.logRealTimeEvent(
        'error',
        `Failed to deploy workflow: ${error.message}`,
        undefined,
        undefined,
        { error: error.message }
      );
    }
  };

  const handleActivateWorkflow = async () => {
    if (!n8nWorkflowId) {
      alert('No n8n workflow ID found. Make sure the workflow is deployed first.');
      return;
    }

    try {
      console.log('🚀 Activating workflow with n8n ID:', n8nWorkflowId);
      
      const { data, error } = await supabase.functions.invoke('generate-n8n-workflow', {
        body: {
          action: 'activate',
          workflowId: n8nWorkflowId
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        await workflowDeployment.updateDeploymentStatus('active');
        alert('Workflow activated successfully!');
        
        await workflowMonitoring.logRealTimeEvent(
          'success',
          'Workflow activated successfully',
          undefined,
          undefined,
          { 
            activation_timestamp: new Date().toISOString(),
            n8n_workflow_id: n8nWorkflowId
          }
        );
        
        setShowN8nEngine(true);
        setShowCodePreview(false);
      } else {
        throw new Error(data.message || 'Failed to activate workflow');
      }
      
    } catch (error) {
      console.error('❌ Error activating workflow:', error);
      alert(`Failed to activate workflow: ${error.message}`);
      
      await workflowMonitoring.logRealTimeEvent(
        'error',
        `Failed to activate workflow: ${error.message}`,
        undefined,
        undefined,
        { 
          error: error.message,
          n8n_workflow_id: n8nWorkflowId
        }
      );
    }
  };

  const renderMainContent = () => {
    if (showN8nEngine) {
      return (
        <div className="w-full h-full bg-black/90 p-6">
          <RealTimeN8nEngine 
            workflowId={n8nWorkflowId || workflowId}
            workflowName={generatedWorkflow?.name}
          />
        </div>
      );
    }

    if (showCodePreview) {
      return (
        <div className="w-full h-full bg-black/90">
          <CodePreview 
            generatedWorkflow={generatedWorkflow}
            generatedCode={generatedCode}
            liveFiles={liveFiles}
            workflowId={workflowId}
          />
        </div>
      );
    }

    return (
      <div className="w-full h-full bg-black/90">
        <ReactFlow
          {...reactFlowProps}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          className="w-full h-full"
          key="workflow-canvas"
        >
          <Background 
            variant={BackgroundVariant.Dots} 
            gap={20} 
            size={1} 
            color="rgba(255, 255, 255, 0.3)"
          />
          <Controls 
            className="bg-black/40 backdrop-blur-sm border border-white/10 text-white [&>button]:text-white [&>button]:border-white/10 [&>button]:bg-transparent [&>button:hover]:bg-white/10"
          />
          <MiniMap 
            className="bg-black/40 backdrop-blur-sm border border-white/10"
            maskColor="rgba(0, 0, 0, 0.6)"
          />
        </ReactFlow>
        
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="text-white/40 text-lg mb-2">AI Workflow Generator</div>
              <div className="text-white/60 text-sm max-w-md mb-4">
                Use the AI Assistant to describe your automation needs and generate n8n workflows with real-time JSON preview
              </div>
              {generatedWorkflow && (
                <div className="text-white/40 text-xs">
                  Debug: Workflow loaded ({generatedWorkflow.nodes?.length || 0} nodes) but not displayed
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen flex bg-transparent relative">
      <JsonWritingAnimation
        jsonContent={animationJsonContent}
        isActive={showJsonAnimation}
        onComplete={() => {
          setShowJsonAnimation(false);
          setAnimationJsonContent('');
        }}
      />

      <AIAssistantSidebar 
        onToggleCodePreview={handleToggleCodePreview}
        showCodePreview={showCodePreview}
        onWorkflowGenerated={handleWorkflowGenerated}
        onGenerationStart={handleGenerationStart}
        onFileGenerated={handleFileGenerated}
        deploymentMessage={deploymentMessage}
        onDeploymentMessageShown={() => setDeploymentMessage(null)}
      />

      <div className="flex-1 flex flex-col min-h-0">
        {/* Enhanced Top Header with GitHub button */}
        <div className="bg-black/30 backdrop-blur-sm border-b border-white/10 p-4 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="text-white/60 hover:text-white hover:bg-white/10 p-2"
                title="Back to Dashboard"
              >
                <Home className="w-5 h-5" />
              </Button>
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-white/60" />
                <span className="text-white/60 text-sm">Personal</span>
              </div>
              <div className="text-white/40">›</div>
              <input
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className="bg-transparent text-white font-medium focus:outline-none border-b border-transparent focus:border-white/30 transition-colors"
              />
              {hasUnsavedChanges && (
                <div className="flex items-center space-x-2">
                  <span className="text-yellow-400 text-xs">● Unsaved changes</span>
                  <span className="text-white/40 text-xs">Auto-updating...</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-white/60 text-sm">
                  {isActive ? 'Active' : 'Inactive'}
                </span>
                <button
                  onClick={handleActivateWorkflow}
                  disabled={!n8nWorkflowId || isDeploying}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
                    isActive ? 'bg-blue-600' : 'bg-white/20'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      isActive ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <Button
                onClick={handleCreateGitHubRepo}
                disabled={!generatedWorkflow || isCreatingRepo}
                variant="outline"
                className="text-white hover:bg-white/10 bg-white/5 border-white/20 px-4"
                title="Sync to GitHub"
              >
                {isCreatingRepo ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Github className="w-4 h-4 mr-2" />
                )}
                GitHub
              </Button>
              <Button
                onClick={() => setShowN8nConfig(true)}
                variant="outline"
                className="text-white hover:bg-white/10 bg-white/5 border-white/20 p-2"
                title="Configure N8n Instance"
              >
                <Settings className="w-4 h-4" />
              </Button>
              <Button
                onClick={handleToggleN8nEngine}
                className={`text-white hover:bg-white/10 px-4 ${
                  showN8nEngine ? 'bg-white/10' : 'bg-transparent'
                }`}
                title="Toggle Real-time N8n Engine"
              >
                <Play className="w-4 h-4 mr-2" />
                N8n Engine
              </Button>
              <Button 
                onClick={handleDeploy}
                disabled={!generatedWorkflow || isDeploying}
                className={`px-6 disabled:opacity-50 ${
                  hasUnsavedChanges ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'
                } text-white`}
              >
                {getDeployButtonIcon()}
                {getDeployButtonText()}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 relative overflow-hidden min-h-0">
          {renderMainContent()}
        </div>
        
        {showNodeEditor && selectedNode && (
          <NodePropertyEditor
            node={selectedNode}
            onClose={() => setShowNodeEditor(false)}
            onSave={handleSaveNodeProperties}
            onJsonUpdate={handleJsonUpdate}
          />
        )}
      </div>

      {showN8nConfig && (
        <N8nConfigToggle 
          onClose={() => setShowN8nConfig(false)} 
          showAsModal={true}
        />
      )}
    </div>
  );
};

export default WorkflowPlayground;
