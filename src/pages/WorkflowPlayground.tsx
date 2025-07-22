import React, { useState, useCallback, useEffect, useMemo, memo } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
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
  Zap
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
import { useAutoSave } from '@/hooks/useAutoSave';
import { useWorkflowStorageV2 } from '@/hooks/useWorkflowStorageV2';
import { useAuth } from '@/hooks/useAuth';
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

const WorkflowPlayground = memo(() => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
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
  const [isLoadingWorkflow, setIsLoadingWorkflow] = useState(false);
  const [isWorkflowLoaded, setIsWorkflowLoaded] = useState(false);

  // Only initialize hooks when needed to prevent unnecessary computations
  const workflowConfig = useWorkflowConfiguration(workflowId);
  const workflowDeployment = useWorkflowDeployment(workflowId);
  const workflowMonitoring = useWorkflowMonitoring(workflowId);
  const { saveWorkflow, loadWorkflow, updateDeploymentStatus } = useWorkflowStorageV2();
  const { user, loading: authLoading } = useAuth();
  
  const isActive = workflowDeployment.deploymentStatus?.status === 'active';
  const isDeploying = workflowDeployment.isDeploying;
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Add auto-save for workflow changes
  const { saving } = useAutoSave({
    workflowId: workflowId || '',
    workflowData: generatedWorkflow,
    chatHistory: workflowConfig.chatHistory,
    delay: 2000
  });

  // Define handleWorkflowGenerated with proper memoization to prevent loops
  const handleWorkflowGenerated = useCallback(async (workflow: any, code: any) => {
    console.log('🎯 Processing workflow generation:', {
      workflowName: workflow?.name,
      nodeCount: workflow?.nodes?.length || 0,
      hasConnections: !!workflow?.connections,
      isLoadedWorkflow: isWorkflowLoaded
    });

    if (!workflow || !workflow.nodes || !Array.isArray(workflow.nodes)) {
      console.error('❌ Invalid workflow provided');
      return;
    }

    // Set the workflow data
    setGeneratedWorkflow(workflow);
    setGeneratedCode(code);
    setWorkflowName(workflow.name || 'Generated Workflow');
    
    // Generate workflow ID if not exists
    const currentWorkflowId = workflowId || `workflow_${Date.now()}`;
    setWorkflowId(currentWorkflowId);
    
    if (workflow.deployment?.workflowId) {
      setN8nWorkflowId(workflow.deployment.workflowId);
    }
    
    // Create the JSON file for preview
    const workflowJson = JSON.stringify(workflow, null, 2);
    const fileName = `${(workflow.name || 'workflow').replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.json`;
    
    console.log('📝 Creating workflow JSON file:', fileName);
    
    // Add to liveFiles for code preview
    setLiveFiles(prev => ({
      ...prev,
      [fileName]: workflowJson
    }));
    
    // Auto-save to Supabase
    try {
      console.log('💾 Auto-saving workflow to Supabase...');
      const workflowData = {
        name: workflow.name || 'Generated Workflow',
        workflow: workflow,
        chat: workflowConfig.chatHistory || []
      };
      
      await saveWorkflow(workflowData, currentWorkflowId);
      console.log('✅ Workflow auto-saved to Supabase');
      
      // Update workflow configuration
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
      
    } catch (error) {
      console.error('❌ Failed to auto-save workflow:', error);
    }
    
    // Parse and display on canvas
    try {
      console.log('🚀 Parsing workflow for canvas display...');
      const { nodes: parsedNodes, edges: parsedEdges } = parseN8nWorkflowToReactFlow(workflow);
      
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
  }, [isWorkflowLoaded, workflowConfig, workflowMonitoring, setNodes, setEdges, workflowId, saveWorkflow]);

  // Load workflow if ID is provided in URL - wait for auth to complete
  useEffect(() => {
    const workflowIdFromUrl = searchParams.get('id');
    const stateData = location.state?.workflowData;
    
    if (authLoading || !user) return;
    
    if (workflowIdFromUrl && !stateData && workflowIdFromUrl !== workflowId) {
      console.log('🔄 Loading workflow from URL parameter:', workflowIdFromUrl);
      setWorkflowId(workflowIdFromUrl);
      setIsLoadingWorkflow(true);
      setIsWorkflowLoaded(true);
      
      const loadWorkflowData = async () => {
        try {
          console.log('🔄 Loading workflow from Supabase...', workflowIdFromUrl);
          
          const result = await loadWorkflow(workflowIdFromUrl);
          
          if (result?.success && result.workflowData) {
            console.log('✅ Workflow loaded from Supabase:', result.workflowData);
            
            // Set the loaded workflow with proper type structure
            const workflowWithNodes = {
              ...result.workflowData,
              nodes: result.workflowData.workflow?.nodes || result.nodes || [],
              connections: result.workflowData.workflow?.connections || result.connections || {}
            };
            setGeneratedWorkflow(workflowWithNodes);
            setWorkflowName(result.workflowData.name || 'Loaded Workflow');
            
            // Create JSON file for preview - use the loaded workflow data directly
            const workflowData = result.workflowData || result.workflow;
            console.log('📝 Full result from loadWorkflow:', result);
            console.log('📝 Workflow data to display:', workflowData);
            
            const workflowJson = JSON.stringify(workflowData, null, 2);
            const fileName = `${(workflowData.name || 'workflow').replace(/[^a-zA-Z0-9]/g, '_')}_loaded.json`;
            
            console.log('📝 Creating JSON file for loaded workflow:', fileName);
            console.log('📝 JSON content preview:', workflowJson.substring(0, 200) + '...');
            
            setLiveFiles({
              [fileName]: workflowJson
            });
            
            // Set deployment info if available
            if (result.n8nWorkflowId) {
              setN8nWorkflowId(result.n8nWorkflowId);
            }
            
            // Update chat history from loaded data
            if (result.chat && Array.isArray(result.chat)) {
              console.log('📝 Restoring chat history:', result.chat.length, 'messages');
              workflowConfig.updateChatHistory(result.chat);
            }
            
            // Parse and display on canvas
            const { nodes: parsedNodes, edges: parsedEdges } = parseN8nWorkflowToReactFlow(workflowWithNodes);
            if (parsedNodes.length > 0) {
              setNodes(parsedNodes);
              setEdges(parsedEdges);
            }
            
            setShowCodePreview(true);
            setShowN8nEngine(false);
          } else {
            console.log('⚠️ No workflow data found or failed to load');
            setIsWorkflowLoaded(false);
          }
        } catch (error) {
          console.error('❌ Failed to load workflow from Supabase:', error);
          setIsWorkflowLoaded(false);
        } finally {
          setIsLoadingWorkflow(false);
        }
      };
      
      loadWorkflowData();
    } else if (stateData && !workflowId) {
      console.log('✅ Using workflow data from navigation state:', stateData);
      setIsLoadingWorkflow(true);
      setIsWorkflowLoaded(true);
      handleWorkflowGenerated(stateData, {});
      setIsLoadingWorkflow(false);
    }
  }, [searchParams, location.state, workflowId, loadWorkflow, authLoading, user, handleWorkflowGenerated, setNodes, setEdges, workflowConfig]);

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
      
      // Update JSON file
      const workflowJson = JSON.stringify(updatedWorkflow, null, 2);
      const fileName = `workflow_edit_${Date.now()}.json`;
      
      setLiveFiles(prev => ({ ...prev, [fileName]: workflowJson }));
      setHasUnsavedChanges(true);
      
      console.log('✅ Workflow updated');
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
      
      // Update JSON file
      const workflowJson = JSON.stringify(updatedWorkflow, null, 2);
      const fileName = `workflow_live_${Date.now()}.json`;
      
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

  const handleSaveWorkflow = async () => {
    if (!generatedWorkflow) {
      addDeploymentMessageToChat('❌ Generate a workflow first to save it', true);
      return;
    }

    try {
      setIsCreatingRepo(true);
      console.log('💾 Saving workflow to Supabase...');

      const workflowData = {
        name: generatedWorkflow.name || workflowName || 'Untitled Workflow',
        workflow: generatedWorkflow,
        chat: workflowConfig.chatHistory
      };

      const currentWorkflowId = workflowId || `workflow_${Date.now()}`;
      const result = await saveWorkflow(workflowData, currentWorkflowId);
      
      if (result && result.success) {
        const successMessage = `✅ **Workflow Saved!**\n\n📋 **Workflow Name:** ${workflowData.name}\n💾 **Storage:** Supabase\n\n*Your workflow has been saved successfully!*`;
        addDeploymentMessageToChat(successMessage);
        
        // Update workflow ID if it was generated
        if (!workflowId) {
          setWorkflowId(currentWorkflowId);
        }
        
        await workflowMonitoring.logRealTimeEvent(
          'success',
          `Workflow saved: ${workflowData.name}`,
          undefined,
          undefined,
          { 
            workflow_name: workflowData.name,
            workflow_id: currentWorkflowId,
            timestamp: new Date().toISOString()
          }
        );
      } else {
        throw new Error('Failed to save workflow');
      }
      
    } catch (error) {
      console.error('❌ Error saving workflow:', error);
      const errorMessage = `❌ **Save Failed**\n\n${error.message || 'Unknown error occurred'}\n\nPlease try again.`;
      addDeploymentMessageToChat(errorMessage, true);
      
      await workflowMonitoring.logRealTimeEvent(
        'error',
        `Failed to save workflow: ${error.message}`,
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

  const handleGenerationStart = useCallback(() => {
    console.log('🚀 Generation started - resetting workflow state');
    setShowCodePreview(true);
    setShowN8nEngine(false);
    setLiveFiles({});
    setIsWorkflowLoaded(false); // Reset for new generation
  }, []);

  const handleFileGenerated = useCallback((fileName: string, content: string) => {
    console.log('📝 File generated:', {
      fileName,
      contentLength: content.length,
      isWorkflowLoaded
    });
    
    // Process file generation for both new and loaded workflows
    if (fileName.includes('.json')) {
      setAnimationJsonContent(content);
      setShowJsonAnimation(true);
    }
    
    setLiveFiles(prev => ({
      ...prev,
      [fileName]: content
    }));
    
    if (!showCodePreview) {
      console.log('🔄 Auto-switching to code preview');
      setShowCodePreview(true);
      setShowN8nEngine(false);
    }
  }, [isWorkflowLoaded, showCodePreview]);

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
    if (isLoadingWorkflow) {
      return (
        <div className="w-full h-full bg-black/90 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
            <div className="text-white text-lg">Loading workflow...</div>
            <div className="text-white/60 text-sm">Fetching data from Supabase</div>
          </div>
        </div>
      );
    }

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
            workflow={generatedWorkflow}
            generatedCode={generatedCode}
            liveFiles={Object.entries(liveFiles).map(([fileName, content]) => ({ fileName, content }))}
          />
        </div>
      );
    }

    return (
      <div className="w-full h-full bg-background">
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
              <div className="text-muted-foreground text-lg mb-2">AI Workflow Generator</div>
              <div className="text-muted-foreground text-sm max-w-md mb-4">
                Use the AI Assistant to describe your automation needs and generate n8n workflows with real-time JSON preview
              </div>
              {generatedWorkflow && (
                <div className="text-muted-foreground text-xs">
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
    <div className="h-screen flex bg-background relative">
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
        currentWorkflow={generatedWorkflow}
        initialChatHistory={workflowConfig.chatHistory}
      />

      <div className="flex-1 flex flex-col min-h-0">
        {/* Enhanced Top Header */}
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
                onClick={handleSaveWorkflow}
                disabled={!generatedWorkflow || isCreatingRepo}
                variant="outline"
                className="text-white hover:bg-white/10 bg-white/5 border-white/20 px-4"
                title="Save Workflow"
              >
                {isCreatingRepo ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Save
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
});

export default WorkflowPlayground;
