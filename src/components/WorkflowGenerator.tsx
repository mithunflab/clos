
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Loader2, Play, Brain, CheckCircle, AlertCircle, FileCode } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface WorkflowGeneratorProps {
  onWorkflowGenerated: (workflow: any, code: any) => void;
  onNodesGenerated: (nodes: any[]) => void;
}

export const WorkflowGenerator: React.FC<WorkflowGeneratorProps> = ({
  onWorkflowGenerated,
  onNodesGenerated
}) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<{
    stage: string;
    message: string;
    type: 'info' | 'success' | 'error';
    modelUsed?: string;
  } | null>(null);

  const generateWorkflow = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setGenerationStatus({
      stage: 'Initializing',
      message: 'Generating complex multi-node workflow...',
      type: 'info'
    });

    try {
      console.log('🚀 Generating complex workflow for prompt:', prompt);

      const { data, error } = await supabase.functions.invoke('generate-complex-workflow', {
        body: {
          prompt: prompt,
          complexity: 'high',
          minNodes: 8,
          maxNodes: 15,
          includeIntegrations: true
        }
      });

      console.log('📨 Complex workflow response:', data, error);

      if (error) {
        console.error('❌ Workflow generation error:', error);
        throw new Error(error.message || 'Failed to generate workflow');
      }

      if (!data.success) {
        console.error('❌ Workflow generation failed:', data.error);
        throw new Error(data.error || 'Workflow generation failed');
      }

      console.log('✅ Complex workflow generated successfully:', {
        nodeCount: data.workflow?.nodes?.length || 0,
        modelUsed: data.modelUsed,
        hasCredentialNodes: data.credentialNodes?.length > 0
      });

      setGenerationStatus({
        stage: 'Complete',
        message: `Generated ${data.workflow?.nodes?.length || 0} node workflow using ${data.modelUsed || 'AI'}`,
        type: 'success',
        modelUsed: data.modelUsed
      });

      // Pass only the JSON workflow data
      onWorkflowGenerated(data.workflow, {
        workflowJson: JSON.stringify(data.workflow, null, 2)
      });
      
      // Convert to React Flow nodes for visualization
      if (data.workflow?.nodes) {
        const reactFlowNodes = convertToReactFlowNodes(data.workflow.nodes);
        onNodesGenerated(reactFlowNodes);
      }

      setPrompt('');

    } catch (error) {
      console.error('❌ Error generating workflow:', error);
      setGenerationStatus({
        stage: 'Error',
        message: error.message || 'Failed to generate workflow',
        type: 'error'
      });
    } finally {
      setIsGenerating(false);
      
      setTimeout(() => {
        setGenerationStatus(null);
      }, 5000);
    }
  };

  const convertToReactFlowNodes = (n8nNodes: any[]) => {
    return n8nNodes.map((node, index) => ({
      id: node.id || `node-${index}`,
      type: 'default',
      position: { 
        x: node.position?.[0] || 100 + (index % 4) * 300, 
        y: node.position?.[1] || 100 + Math.floor(index / 4) * 150 
      },
      data: {
        label: (
          <div className="text-center p-2">
            <div className="font-semibold text-sm text-white">{node.name}</div>
            <div className="text-xs text-white/70">{node.type.replace('n8n-nodes-base.', '')}</div>
          </div>
        )
      },
      style: {
        background: getNodeColor(node.type),
        border: '2px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '8px',
        color: 'white',
        minWidth: '180px',
        minHeight: '80px'
      }
    }));
  };

  const getNodeColor = (nodeType: string) => {
    const colorMap: { [key: string]: string } = {
      'httpRequest': '#4CAF50',
      'webhook': '#2196F3',
      'code': '#FF9800',
      'set': '#9C27B0',
      'if': '#F44336',
      'schedule': '#00BCD4',
      'emailSend': '#795548',
      'slack': '#E91E63',
      'googleSheets': '#4CAF50',
      'telegram': '#0088cc',
      'discord': '#5865F2',
      'openAi': '#10A37F',
      'anthropic': '#D4A574',
      'mysql': '#FF5722',
      'postgresql': '#3F51B5'
    };

    const nodeKey = nodeType.replace('n8n-nodes-base.', '').toLowerCase();
    return colorMap[nodeKey] || '#607D8B';
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      generateWorkflow();
    }
  };

  const complexExamples = [
    "Build a comprehensive customer support automation: Monitor multiple email inboxes, categorize tickets with AI, route to appropriate teams, create Slack notifications, update CRM records, send automated responses, and generate daily reports with analytics",
    "Create an advanced e-commerce order processing pipeline: Handle payments via multiple gateways, update inventory across platforms, send SMS notifications, generate shipping labels, track deliveries, handle returns, update accounting systems, and trigger follow-up marketing campaigns",
    "Design a multi-platform content distribution system: Generate blog posts with AI, optimize for SEO, publish to WordPress, share on social media platforms, create video thumbnails, schedule posts, monitor engagement metrics, and compile performance reports",
    "Build a complex lead nurturing workflow: Capture leads from multiple sources, score based on behavior, segment into categories, send personalized email sequences, update CRM with interactions, notify sales teams, schedule follow-ups, and track conversion metrics",
    "Create an advanced project management automation: Monitor GitHub repositories, trigger builds on commits, run automated tests, deploy to staging environments, notify team members, update project management tools, generate release notes, and send status reports",
    "Design a comprehensive financial monitoring system: Connect multiple bank accounts, categorize transactions with AI, detect anomalies, generate budget reports, send alerts for unusual spending, update accounting software, and create monthly financial summaries"
  ];

  return (
    <div className="space-y-4">
      {generationStatus && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3 rounded-lg border ${
            generationStatus.type === 'success' 
              ? 'bg-green-500/20 border-green-500/30 text-green-300' 
              : generationStatus.type === 'error'
              ? 'bg-red-500/20 border-red-500/30 text-red-300'
              : 'bg-blue-500/20 border-blue-500/30 text-blue-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            {generationStatus.type === 'success' ? (
              <CheckCircle className="w-4 h-4" />
            ) : generationStatus.type === 'error' ? (
              <AlertCircle className="w-4 h-4" />
            ) : (
              <Loader2 className="w-4 h-4 animate-spin" />
            )}
            <div>
              <div className="font-medium">{generationStatus.stage}</div>
              <div className="text-sm opacity-90">{generationStatus.message}</div>
              {generationStatus.modelUsed && (
                <div className="text-xs opacity-75 mt-1 flex items-center space-x-1">
                  <Brain className="w-3 h-3" />
                  <span>Model: {generationStatus.modelUsed}</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      <div className="space-y-3">
        <div className="flex items-center space-x-2 mb-2">
          <FileCode className="w-5 h-5 text-white/60" />
          <h3 className="text-white font-medium">Generate Complex Multi-Node Workflow</h3>
          <div className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
            JSON Only + Smart Credentials
          </div>
        </div>
        
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Describe a complex automation workflow with multiple integrations...

Examples:
• Multi-step customer onboarding with email sequences, CRM updates, and team notifications
• Advanced e-commerce automation with inventory management, payment processing, and analytics
• Comprehensive content creation pipeline with AI generation, publishing, and performance tracking
• Complex lead nurturing system with scoring, segmentation, and multi-channel outreach

Be specific about integrations and steps for the most complex results."
          className="w-full h-40 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/20 text-sm resize-none"
          disabled={isGenerating}
        />
        
        <Button
          onClick={generateWorkflow}
          disabled={!prompt.trim() || isGenerating}
          className="w-full bg-green-500 hover:bg-green-600 text-white"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating Complex Workflow...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Generate Multi-Node JSON Workflow
            </>
          )}
        </Button>
      </div>

      <div className="space-y-2">
        <div className="text-white/60 text-sm font-medium">Complex Workflow Examples:</div>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {complexExamples.map((example, index) => (
            <button
              key={index}
              onClick={() => setPrompt(example)}
              disabled={isGenerating}
              className="w-full text-left p-2 bg-white/5 hover:bg-white/10 rounded text-white/80 text-xs transition-colors disabled:opacity-50 leading-relaxed"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WorkflowGenerator;
