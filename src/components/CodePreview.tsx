
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileCode, Eye, Code, Download, Copy, CheckCircle, Loader2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import JsonWorkflowViewer from './JsonWorkflowViewer';

interface CodePreviewProps {
  generatedWorkflow?: any;
  generatedCode?: any;
  liveFiles?: {[key: string]: string};
  workflowId?: string | null;
}

const CodePreview: React.FC<CodePreviewProps> = ({ 
  generatedWorkflow, 
  generatedCode,
  liveFiles = {},
  workflowId 
}) => {
  const [activeTab, setActiveTab] = useState('json');
  const [copied, setCopied] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  // Track when files are being updated for animation
  useEffect(() => {
    if (Object.keys(liveFiles).length > 0) {
      setIsUpdating(true);
      setLastUpdateTime(new Date());
      const timer = setTimeout(() => setIsUpdating(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [liveFiles]);

  // Enhanced workflow JSON retrieval with proper fallback
  const getWorkflowJson = () => {
    console.log('🚨 DEBUG: CodePreview getWorkflowJson called with:', {
      hasGeneratedCode: !!generatedCode,
      hasGeneratedWorkflow: !!generatedWorkflow,
      liveFilesKeys: Object.keys(liveFiles),
      liveFilesCount: Object.keys(liveFiles).length
    });
    
    // Priority 1: Check for the most recent JSON file in liveFiles
    const jsonFiles = Object.keys(liveFiles).filter(key => key.endsWith('.json'));
    if (jsonFiles.length > 0) {
      // Get the most recent JSON file (by timestamp in filename)
      const latestFile = jsonFiles.sort((a, b) => {
        const timestampA = a.match(/_(\d+)\.json$/)?.[1] || '0';
        const timestampB = b.match(/_(\d+)\.json$/)?.[1] || '0';
        return parseInt(timestampB) - parseInt(timestampA);
      })[0];
      
      if (latestFile && liveFiles[latestFile]) {
        console.log('✅ Using latest live JSON file:', latestFile);
        return liveFiles[latestFile];
      }
    }
    
    // Priority 2: Check generatedCode for workflowJson
    if (generatedCode?.workflowJson) {
      console.log('✅ Using generatedCode.workflowJson');
      return generatedCode.workflowJson;
    }
    
    // Priority 3: Generate JSON from generatedWorkflow
    if (generatedWorkflow) {
      console.log('✅ Generating JSON from generatedWorkflow');
      return JSON.stringify(generatedWorkflow, null, 2);
    }
    
    console.log('❌ No workflow JSON found anywhere');
    return null;
  };

  const workflowJson = useMemo(() => getWorkflowJson(), [liveFiles, generatedCode, generatedWorkflow]);

  const copyToClipboard = async () => {
    if (workflowJson) {
      try {
        await navigator.clipboard.writeText(workflowJson);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const downloadJson = () => {
    if (workflowJson) {
      const blob = new Blob([workflowJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${generatedWorkflow?.name || 'workflow'}_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="h-full flex flex-col bg-black/20 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Code className="w-5 h-5 text-blue-400" />
            <h3 className="text-white font-semibold">Live Workflow JSON</h3>
            <AnimatePresence>
              {isUpdating && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center space-x-1"
                >
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs text-yellow-400">Live Update</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {lastUpdateTime && (
            <span className="text-xs text-white/40">
              Updated {lastUpdateTime.toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          {workflowJson && (
            <>
              <Button
                onClick={copyToClipboard}
                size="sm"
                variant="ghost"
                className="text-white/60 hover:text-white hover:bg-white/10 h-8 px-3"
              >
                {copied ? (
                  <CheckCircle className="w-3 h-3 mr-1 text-green-400" />
                ) : (
                  <Copy className="w-3 h-3 mr-1" />
                )}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
              <Button
                onClick={downloadJson}
                size="sm"
                variant="ghost"
                className="text-white/60 hover:text-white hover:bg-white/10 h-8 px-3"
              >
                <Download className="w-3 h-3 mr-1" />
                Download
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Live Files Status */}
      <AnimatePresence>
        {Object.keys(liveFiles).length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-2 bg-blue-500/10 border-b border-blue-500/20"
          >
            <div className="flex items-center space-x-2">
              <FileCode className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-blue-400">
                {Object.keys(liveFiles).length} live file(s) • Real-time sync active
              </span>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 1 }}
                className="flex-1 h-1 bg-blue-500/30 rounded-full overflow-hidden"
              >
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: '0%' }}
                  transition={{ duration: 1, repeat: isUpdating ? Infinity : 0 }}
                  className="h-full bg-blue-500 rounded-full"
                />
              </motion.div>
            </div>
            <div className="text-xs text-blue-300 mt-1">
              Files: {Object.keys(liveFiles).join(', ')}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {workflowJson ? (
            <motion.div
              key={`json-content-${lastUpdateTime?.getTime() || 'initial'}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <JsonWorkflowViewer 
                workflowJson={workflowJson}
                workflowName={generatedWorkflow?.name || 'Live Workflow'}
              />
            </motion.div>
          ) : (
            <motion.div
              key="empty-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex items-center justify-center"
            >
              <div className="text-center">
                <FileCode className="w-16 h-16 text-white/40 mx-auto mb-4" />
                <h3 className="text-white/60 text-lg mb-2">No Workflow Generated Yet</h3>
                <p className="text-white/40">
                  Use WorkflowAI to describe your automation needs and generate n8n workflows
                </p>
                <div className="mt-4 text-xs text-white/30">
                  Live JSON files will appear here with real-time synchronization
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CodePreview;
