
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
  Key
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
    case 'slack':
      return Zap;
    case 'telegram':
      return Zap;
    default:
      return Settings;
  }
};

const getNodeColor = (nodeType: string, status?: string) => {
  if (status === 'error') return 'border-red-500 bg-red-500/10';
  if (status === 'completed') return 'border-green-500 bg-green-500/10';
  if (status === 'running') return 'border-blue-500 bg-blue-500/10 animate-pulse';
  
  const type = nodeType.replace('n8n-nodes-base.', '').toLowerCase();
  
  const colorMap: { [key: string]: string } = {
    'httprequest': 'border-green-400 bg-green-400/10',
    'webhook': 'border-blue-400 bg-blue-400/10',
    'code': 'border-orange-400 bg-orange-400/10',
    'email': 'border-purple-400 bg-purple-400/10',
    'mysql': 'border-red-400 bg-red-400/10',
    'postgresql': 'border-indigo-400 bg-indigo-400/10',
    'mongodb': 'border-green-400 bg-green-400/10',
    'schedule': 'border-cyan-400 bg-cyan-400/10',
    'set': 'border-yellow-400 bg-yellow-400/10',
    'if': 'border-pink-400 bg-pink-400/10',
    'slack': 'border-green-400 bg-green-400/10',
    'telegram': 'border-blue-400 bg-blue-400/10',
  };

  return colorMap[type] || 'border-gray-400 bg-gray-400/10';
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
      return <Clock className="w-3 h-3 text-gray-400" />;
  }
};

export const WorkflowNode: React.FC<WorkflowNodeProps> = ({ data, selected }) => {
  if (!data) {
    console.warn('WorkflowNode received no data');
    return null;
  }

  const Icon = getNodeIcon(data.type || data.nodeType || 'unknown');
  const colorClass = getNodeColor(data.type || data.nodeType || 'unknown', data.status);
  
  // Extract connection info to render multiple handles
  const hasMultipleOutputs = data.outputs && data.outputs > 1;
  const hasErrorOutput = data.hasErrorOutput;
  
  return (
    <div className={cn(
      "relative bg-black/40 backdrop-blur-sm border-2 rounded-lg p-3 min-w-[140px] max-w-[180px] transition-all duration-200 cursor-pointer",
      colorClass,
      selected && "ring-2 ring-white/50"
    )}>
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 border-2 bg-white/20 hover:bg-white/40 transition-colors"
        style={{ top: '50%' }}
      />

      {/* Node Content */}
      <div className="flex flex-col items-center space-y-2">
        {/* Icon and Status */}
        <div className="flex items-center justify-between w-full">
          <Icon className="w-5 h-5 text-white/80" />
          {getStatusIcon(data.status)}
        </div>

        {/* Node Name */}
        <div className="text-white font-medium text-sm text-center truncate w-full" title={data.name}>
          {data.name || 'Unnamed Node'}
        </div>

        {/* Node Type */}
        <div className="text-xs text-white/60 text-center truncate w-full">
          {(data.type || data.nodeType || 'unknown').replace('n8n-nodes-base.', '')}
        </div>
        
        {/* Credentials Status */}
        {data.credentials && Object.keys(data.credentials).length > 0 && (
          <div className="flex items-center space-x-1">
            <Key className="w-3 h-3 text-green-400" />
            <span className="text-xs text-green-400">Configured</span>
          </div>
        )}
        
        {/* Disabled indicator */}
        {data.disabled && (
          <div className="text-xs text-red-400">Disabled</div>
        )}
      </div>

      {/* Execution Details */}
      {data.status && data.status !== 'pending' && (
        <div className="mt-2 text-xs text-white/60 text-center">
          {data.executionTime && (
            <div>{data.executionTime}ms</div>
          )}
          {data.error && (
            <div className="text-red-400 truncate" title={data.error}>
              Error
            </div>
          )}
        </div>
      )}

      {/* Multiple Output Handles */}
      {hasMultipleOutputs ? (
        <>
          <Handle
            type="source"
            position={Position.Right}
            id="output-0"
            className="w-3 h-3 border-2 bg-white/20 hover:bg-white/40 transition-colors"
            style={{ top: '40%' }}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="output-1"
            className="w-3 h-3 border-2 bg-white/20 hover:bg-white/40 transition-colors"
            style={{ top: '60%' }}
          />
        </>
      ) : (
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 border-2 bg-white/20 hover:bg-white/40 transition-colors"
          style={{ top: '50%' }}
        />
      )}
      
      {/* Error Output Handle */}
      {hasErrorOutput && (
        <Handle
          type="source"
          position={Position.Bottom}
          id="error"
          className="w-3 h-3 border-2 bg-red-400/60 hover:bg-red-400/80 transition-colors"
          style={{ left: '50%' }}
        />
      )}

      {/* Execution Pulse Effect */}
      {data.status === 'running' && (
        <div className="absolute inset-0 rounded-lg border-2 border-blue-400 animate-ping opacity-20" />
      )}
    </div>
  );
};

export default WorkflowNode;
