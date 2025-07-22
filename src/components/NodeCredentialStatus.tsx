
import React from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Loader2, 
  Shield,
  Key
} from 'lucide-react';

interface NodeCredentialStatusProps {
  nodeId: string;
  status: 'not_required' | 'empty' | 'partial' | 'configured' | 'testing' | 'valid' | 'invalid';
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const NodeCredentialStatus: React.FC<NodeCredentialStatusProps> = ({
  nodeId,
  status,
  showLabel = true,
  size = 'md'
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'not_required':
        return {
          icon: Shield,
          color: 'text-blue-400',
          bgColor: 'bg-blue-400/10',
          label: 'No credentials required',
          pulse: false
        };
      case 'empty':
        return {
          icon: AlertCircle,
          color: 'text-red-400',
          bgColor: 'bg-red-400/10',
          label: 'Credentials needed',
          pulse: true
        };
      case 'partial':
        return {
          icon: AlertCircle,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-400/10',
          label: 'Incomplete credentials',
          pulse: true
        };
      case 'configured':
        return {
          icon: Key,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-400/10',
          label: 'Configured (not tested)',
          pulse: false
        };
      case 'testing':
        return {
          icon: Loader2,
          color: 'text-blue-400',
          bgColor: 'bg-blue-400/10',
          label: 'Testing connection...',
          pulse: false
        };
      case 'valid':
        return {
          icon: CheckCircle,
          color: 'text-green-400',
          bgColor: 'bg-green-400/10',
          label: 'Valid credentials',
          pulse: false
        };
      case 'invalid':
        return {
          icon: XCircle,
          color: 'text-red-400',
          bgColor: 'bg-red-400/10',
          label: 'Invalid credentials',
          pulse: true
        };
      default:
        return {
          icon: AlertCircle,
          color: 'text-gray-400',
          bgColor: 'bg-gray-400/10',
          label: 'Unknown status',
          pulse: false
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;
  
  const iconSize = size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5';
  const containerPadding = size === 'sm' ? 'p-1' : size === 'md' ? 'p-1.5' : 'p-2';

  console.log('🎨 NodeCredentialStatus render:', { nodeId, status, label: config.label });

  return (
    <motion.div
      key={`${nodeId}-${status}`} // Force re-render when status changes
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`inline-flex items-center space-x-2 rounded-full ${config.bgColor} ${containerPadding}`}
      title={config.label}
    >
      <div className={`relative ${config.pulse ? 'animate-pulse' : ''}`}>
        <Icon 
          className={`${iconSize} ${config.color} ${status === 'testing' ? 'animate-spin' : ''}`} 
        />
        {config.pulse && (
          <div className={`absolute inset-0 ${iconSize} ${config.color} animate-ping opacity-30`}>
            <Icon className={iconSize} />
          </div>
        )}
      </div>
      
      {showLabel && (
        <span className={`text-xs ${config.color} font-medium`}>
          {config.label}
        </span>
      )}
    </motion.div>
  );
};
