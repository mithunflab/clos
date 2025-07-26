
import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Loader2, 
  Globe, 
  Code, 
  Mail, 
  Database,
  Webhook,
  Timer,
  Settings,
  Zap,
  Key,
  MessageSquare,
  Bot,
  Server
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WorkflowNodeData {
  name: string;
  type: string;
  parameters?: any;
  status?: 'pending' | 'running' | 'completed' | 'error';
  executionTime?: number;
  data?: any;
  error?: string;
  [key: string]: any;
}

interface WorkflowNodeProps {
  data: WorkflowNodeData;
  selected?: boolean;
}

const getNodeIcon = (nodeType: string) => {
  const type = nodeType.replace('n8n-nodes-base.', '').toLowerCase();
  
  switch (type) {
    case 'httprequest':
      return Globe;
    case 'webhook':
      return Webhook;
    case 'code':
      return Code;
    case 'email':
      return Mail;
    case 'mysql':
    case 'postgresql':
    case 'mongodb':
      return Database;
    case 'schedule':
      return Timer;
    case 'telegram':
      return MessageSquare;
    case 'groq':
      return Bot;
    case 'slack':
      return MessageSquare;
    case 'set':
      return Settings;
    case 'if':
      return Zap;
    default:
      return Server;
  }
};

const getNodeColor = (nodeType: string, status?: string) => {
  // Status-based colors (N8N style)
  if (status === 'error') return {
    border: 'border-red-400',
    bg: 'bg-red-50/10',
    accent: 'text-red-400'
  };
  if (status === 'completed') return {
    border: 'border-green-400',
    bg: 'bg-green-50/10', 
    accent: 'text-green-400'
  };
  if (status === 'running') return {
    border: 'border-blue-400',
    bg: 'bg-blue-50/10',
    accent: 'text-blue-400'
  };
  
  const type = nodeType.replace('n8n-nodes-base.', '').toLowerCase();
  
  // N8N-like node type colors
  const colorMap: { [key: string]: { border: string, bg: string, accent: string } } = {
    'httprequest': { border: 'border-orange-400', bg: 'bg-orange-50/10', accent: 'text-orange-400' },
    'webhook': { border: 'border-purple-400', bg: 'bg-purple-50/10', accent: 'text-purple-400' },
    'code': { border: 'border-yellow-400', bg: 'bg-yellow-50/10', accent: 'text-yellow-400' },
    'email': { border: 'border-pink-400', bg: 'bg-pink-50/10', accent: 'text-pink-400' },
    'mysql': { border: 'border-blue-400', bg: 'bg-blue-50/10', accent: 'text-blue-400' },
    'postgresql': { border: 'border-indigo-400', bg: 'bg-indigo-50/10', accent: 'text-indigo-400' },
    'mongodb': { border: 'border-green-400', bg: 'bg-green-50/10', accent: 'text-green-400' },
    'schedule': { border: 'border-cyan-400', bg: 'bg-cyan-50/10', accent: 'text-cyan-400' },
    'telegram': { border: 'border-blue-500', bg: 'bg-blue-50/10', accent: 'text-blue-500' },
    'groq': { border: 'border-violet-400', bg: 'bg-violet-50/10', accent: 'text-violet-400' },
    'set': { border: 'border-gray-400', bg: 'bg-gray-50/10', accent: 'text-gray-400' },
    'if': { border: 'border-emerald-400', bg: 'bg-emerald-50/10', accent: 'text-emerald-400' },
    'slack': { border: 'border-green-400', bg: 'bg-green-50/10', accent: 'text-green-400' },
  };

  return colorMap[type] || { border: 'border-slate-400', bg: 'bg-slate-50/10', accent: 'text-slate-400' };
};

const getStatusIcon = (status?: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-3 h-3 text-green-400" />;
    case 'running':
      return <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />;
    case 'error':
      return <AlertCircle className="w-3 h-3 text-red-400" />;
    default:
      return <Clock className="w-3 h-3 text-gray-500" />;
  }
};

export const WorkflowNode: React.FC<WorkflowNodeProps> = ({ data, selected }) => {
  if (!data) {
    console.warn('WorkflowNode received no data');
    return null;
  }

  const Icon = getNodeIcon(data.type || data.nodeType || 'unknown');
  const colors = getNodeColor(data.type || data.nodeType || 'unknown', data.status);
  
  // Extract connection info to render multiple handles
  const hasMultipleOutputs = data.outputs && data.outputs > 1;
  const hasErrorOutput = data.hasErrorOutput;
  
  // Get clean node name
  const displayNodeType = (data.type || data.nodeType || 'unknown')
    .replace('n8n-nodes-base.', '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();

  return (
    <div 
      className={cn(
        "relative bg-black/80 backdrop-blur-sm border-2 rounded-lg shadow-lg transition-all duration-200 cursor-pointer min-w-[160px] max-w-[200px]",
        colors.border,
        colors.bg,
        selected && "ring-2 ring-white/30 shadow-xl",
        data.disabled && "opacity-60"
      )}
      style={{
        boxShadow: selected ? '0 0 20px rgba(255,255,255,0.1)' : '0 4px 12px rgba(0,0,0,0.3)'
      }}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 border-2 border-white/30 bg-black/60 hover:bg-white/20 hover:border-white/60 transition-all duration-200"
        style={{ left: -6, top: '50%' }}
      />

      {/* Node Header */}
      <div className="flex items-center justify-between p-3 pb-2">
        <div className={cn("flex items-center space-x-2", colors.accent)}>
          <Icon className="w-4 h-4" />
          <span className="text-xs font-medium text-white/90">
            {displayNodeType}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          {getStatusIcon(data.status)}
          {data.credentials && Object.keys(data.credentials).length > 0 && (
            <Key className="w-3 h-3 text-green-400" />
          )}
        </div>
      </div>

      {/* Node Body */}
      <div className="px-3 pb-3">
        {/* Node Name */}
        <div className="text-white font-semibold text-sm mb-1 truncate" title={data.name}>
          {data.name || 'Unnamed Node'}
        </div>

        {/* Node Status Info */}
        {data.status && data.status !== 'pending' && (
          <div className="text-xs text-white/70 space-y-1">
            {data.executionTime && (
              <div className="flex items-center justify-between">
                <span>Runtime:</span>
                <span className="font-mono">{data.executionTime}ms</span>
              </div>
            )}
            {data.error && (
              <div className="text-red-400 truncate text-xs" title={data.error}>
                ⚠ {data.error}
              </div>
            )}
          </div>
        )}

        {/* Disabled indicator */}
        {data.disabled && (
          <div className="text-xs text-amber-400 mt-1 flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            Disabled
          </div>
        )}

        {/* Parameters preview (if any) */}
        {data.parameters && Object.keys(data.parameters).length > 0 && (
          <div className="text-xs text-white/50 mt-1 truncate">
            {Object.keys(data.parameters).length} parameter{Object.keys(data.parameters).length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Output Handles */}
      {hasMultipleOutputs ? (
        <>
          <Handle
            type="source"
            position={Position.Right}
            id="output-0"
            className="w-3 h-3 border-2 border-white/30 bg-black/60 hover:bg-white/20 hover:border-white/60 transition-all duration-200"
            style={{ right: -6, top: '35%' }}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="output-1"
            className="w-3 h-3 border-2 border-white/30 bg-black/60 hover:bg-white/20 hover:border-white/60 transition-all duration-200"
            style={{ right: -6, top: '65%' }}
          />
        </>
      ) : (
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 border-2 border-white/30 bg-black/60 hover:bg-white/20 hover:border-white/60 transition-all duration-200"
          style={{ right: -6, top: '50%' }}
        />
      )}
      
      {/* Error Output Handle */}
      {hasErrorOutput && (
        <Handle
          type="source"
          position={Position.Bottom}
          id="error"
          className="w-3 h-3 border-2 border-red-400/60 bg-red-400/20 hover:bg-red-400/40 transition-all duration-200"
          style={{ bottom: -6, left: '50%' }}
        />
      )}

      {/* Execution Animation */}
      {data.status === 'running' && (
        <div className="absolute inset-0 rounded-lg border-2 border-blue-400/40 animate-pulse" />
      )}
    </div>
  );
};

export default WorkflowNode;
