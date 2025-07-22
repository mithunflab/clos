
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Key, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Eye, 
  EyeOff, 
  ExternalLink,
  Info,
  Shield,
  ShieldCheck,
  ShieldX,
  TestTube
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  analyzeDynamicNodeCredentials, 
  validateDynamicCredentialValue,
  getDynamicCredentialStatus,
  type DynamicCredentialField 
} from '@/utils/dynamicNodeAnalyzer';
import { useCredentialManager } from '@/hooks/useCredentialManager';
import { NodeCredentialStatus } from './NodeCredentialStatus';
import { toast } from 'sonner';

interface CredentialManagerProps {
  nodeType: string;
  credentials: Record<string, any>;
  onCredentialsChange: (credentials: Record<string, any>) => void;
  onStatusChange: (status: 'not_required' | 'empty' | 'partial' | 'configured' | 'invalid') => void;
  nodeData?: any;
  nodeId?: string;
}

export const CredentialManager: React.FC<CredentialManagerProps> = ({
  nodeType,
  credentials,
  onCredentialsChange,
  onStatusChange,
  nodeData,
  nodeId = `node_${nodeType}_${Date.now()}`
}) => {
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [fieldValidation, setFieldValidation] = useState<Record<string, boolean>>({});
  const [localCredentials, setLocalCredentials] = useState<Record<string, any>>(credentials);
  
  const {
    saveCredentials,
    loadCredentials,
    testConnection,
    getCredentialStatus,
    isTestingConnection,
    updateCredentialStatus
  } = useCredentialManager();

  // Use dynamic analysis instead of hardcoded database
  const requirement = analyzeDynamicNodeCredentials(nodeData || { nodeType, type: nodeType });
  const credentialStatus = getDynamicCredentialStatus(requirement, localCredentials);
  const currentStatus = getCredentialStatus(nodeId);

  console.log('🔄 CredentialManager render:', {
    nodeId,
    nodeType,
    serviceName: requirement.serviceName,
    requiresCredentials: requirement.requiresCredentials,
    fieldsCount: requirement.fields.length,
    calculatedStatus: credentialStatus,
    currentStatus: currentStatus.status,
    credentialsCount: Object.keys(localCredentials).length
  });

  // Load saved credentials on mount
  useEffect(() => {
    console.log('🚀 Loading credentials for node:', nodeId);
    const savedCredentials = loadCredentials(nodeId, nodeType);
    if (Object.keys(savedCredentials).length > 0) {
      console.log('📥 Found saved credentials, updating component');
      setLocalCredentials(savedCredentials);
      onCredentialsChange(savedCredentials);
    }
  }, [nodeId, nodeType, loadCredentials]);

  // Update status when credentials change
  useEffect(() => {
    console.log('📊 Status change detected:', { 
      oldStatus: currentStatus.status, 
      newStatus: credentialStatus 
    });
    onStatusChange(credentialStatus);
    
    // Update the credential manager status in real-time
    updateCredentialStatus(nodeId, {
      nodeId,
      nodeType,
      credentials: localCredentials,
      status: credentialStatus
    });
  }, [localCredentials, nodeType, onStatusChange, credentialStatus, currentStatus.status, nodeId, updateCredentialStatus]);

  // Validate fields when credentials change
  useEffect(() => {
    const validation: Record<string, boolean> = {};
    requirement.fields.forEach(field => {
      const value = localCredentials[field.name];
      validation[field.name] = validateDynamicCredentialValue(field, String(value || ''));
    });
    setFieldValidation(validation);
  }, [localCredentials, requirement]);

  const handleCredentialChange = async (fieldName: string, value: string) => {
    console.log('🔄 Credential field changed:', { fieldName, value: value ? '[REDACTED]' : 'empty' });
    
    const updatedCredentials = {
      ...localCredentials,
      [fieldName]: value
    };
    
    setLocalCredentials(updatedCredentials);
    onCredentialsChange(updatedCredentials);
    
    // Auto-save credentials immediately
    const success = await saveCredentials(nodeId, nodeType, updatedCredentials);
    if (success) {
      console.log('✅ Auto-saved credentials for field:', fieldName);
    }
  };

  const handleTestConnection = async () => {
    if (!requirement.requiresCredentials) {
      console.log('⚠️ No credentials required for this node type');
      toast.info('This node type does not require credentials');
      return;
    }
    
    console.log('🧪 Starting connection test for node:', nodeId);
    toast.info('Testing connection...');
    
    const success = await testConnection(nodeId, nodeType, localCredentials);
    
    if (success) {
      toast.success('Connection test successful!');
      console.log('✅ Connection test passed');
    } else {
      toast.error(`Connection test failed: ${currentStatus.errorMessage || 'Please check your credentials'}`);
      console.error('❌ Connection test failed:', currentStatus.errorMessage);
    }
  };

  const togglePasswordVisibility = (fieldName: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
  };

  // If no credentials required
  if (!requirement.requiresCredentials || requirement.fields.length === 0) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>{requirement.serviceName}</span>
            </div>
            <NodeCredentialStatus nodeId={nodeId} status="not_required" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <ShieldCheck className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <p className="text-blue-400 text-sm mb-2">
              ✨ This node works without credentials
            </p>
            <p className="text-white/60 text-xs">
              {requirement.serviceName} nodes don't require external authentication
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Key className="w-5 h-5" />
            <span>{requirement.serviceName} Credentials</span>
          </div>
          <NodeCredentialStatus nodeId={nodeId} status={currentStatus.status} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <AnimatePresence>
          {requirement.fields.map((field: DynamicCredentialField) => (
            <motion.div
              key={field.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <Label htmlFor={field.name} className="text-white flex items-center space-x-2">
                <span>{field.label}</span>
                {field.required && <span className="text-red-400">*</span>}
                {!fieldValidation[field.name] && localCredentials[field.name] && (
                  <AlertCircle className="w-3 h-3 text-red-400" />
                )}
              </Label>
              
              <div className="relative">
                {field.type === 'select' ? (
                  <Select
                    value={String(localCredentials[field.name] || '')}
                    onValueChange={(value) => handleCredentialChange(field.name, value)}
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder={field.placeholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={field.name}
                    type={
                      field.type === 'password' && !showPasswords[field.name] 
                        ? 'password' 
                        : field.type === 'number' 
                        ? 'number'
                        : field.type === 'email'
                        ? 'email'
                        : field.type === 'url'
                        ? 'url'
                        : 'text'
                    }
                    placeholder={field.placeholder}
                    value={String(localCredentials[field.name] || '')}
                    onChange={(e) => handleCredentialChange(field.name, e.target.value)}
                    className={`bg-white/10 border-white/20 text-white placeholder-white/40 pr-10 ${
                      !fieldValidation[field.name] && localCredentials[field.name] 
                        ? 'border-red-400 focus:border-red-400' 
                        : ''
                    }`}
                    required={field.required}
                  />
                )}
                
                {field.type === 'password' && (
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility(field.name)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white"
                  >
                    {showPasswords[field.name] ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
              
              {field.description && (
                <p className="text-xs text-white/50 flex items-start space-x-1">
                  <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>{field.description}</span>
                </p>
              )}
              
              {!fieldValidation[field.name] && localCredentials[field.name] && (
                <p className="text-xs text-red-400 flex items-start space-x-1">
                  <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>Invalid format for {field.label.toLowerCase()}</span>
                </p>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {currentStatus.errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-red-500/10 border border-red-400/20 rounded-lg"
          >
            <p className="text-red-400 text-sm flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{currentStatus.errorMessage}</span>
            </p>
          </motion.div>
        )}
        
        <div className="flex justify-between items-center pt-4">
          {requirement.helpUrl && (
            <a
              href={requirement.helpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-blue-400 hover:text-blue-300 text-sm"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Get {requirement.serviceName} credentials</span>
            </a>
          )}
          
          <div className="flex items-center space-x-2 ml-auto">
            <Button
              onClick={handleTestConnection}
              disabled={isTestingConnection[nodeId] || credentialStatus === 'empty' || credentialStatus === 'not_required'}
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              {isTestingConnection[nodeId] ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <TestTube className="w-4 h-4 mr-2" />
              )}
              {isTestingConnection[nodeId] ? 'Testing...' : 'Test Connection'}
            </Button>
          </div>
        </div>
        
        {currentStatus.lastTested && (
          <div className="text-xs text-white/50 text-center">
            Last tested: {new Date(currentStatus.lastTested).toLocaleString()}
            {currentStatus.testResult && (
              <span className="text-green-400 ml-2">✓ Valid</span>
            )}
            {currentStatus.testResult === false && (
              <span className="text-red-400 ml-2">✗ Invalid</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
