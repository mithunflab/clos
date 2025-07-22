
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Key, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  ExternalLink,
  Shield,
  ShieldCheck,
  TestTube,
  Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  analyzeDynamicNodeCredentials, 
  validateDynamicCredentialValue,
  getDynamicCredentialStatus,
  type DynamicCredentialField 
} from '@/utils/dynamicNodeAnalyzer';
import { NodeCredentialStatus } from './NodeCredentialStatus';
import { CredentialField } from './CredentialField';
import { useCredentialStorage } from '@/hooks/useCredentialStorage';
import { useCredentialTester } from '@/hooks/useCredentialTester';
import { toast } from 'sonner';

interface CredentialManagerProps {
  nodeType: string;
  credentials: Record<string, any>;
  onCredentialsChange: (credentials: Record<string, any>) => void;
  onStatusChange: (status: 'not_required' | 'empty' | 'partial' | 'configured' | 'invalid') => void;
  nodeData?: any;
  nodeId?: string;
  workflowId?: string;
}

export const CredentialManager: React.FC<CredentialManagerProps> = ({
  nodeType,
  credentials,
  onCredentialsChange,
  onStatusChange,
  nodeData,
  nodeId = `node_${nodeType}_${Date.now()}`,
  workflowId
}) => {
  const [fieldValidation, setFieldValidation] = useState<Record<string, boolean>>({});
  const [localCredentials, setLocalCredentials] = useState<Record<string, any>>(credentials);
  const [lastTestResult, setLastTestResult] = useState<{ success?: boolean; message?: string }>({});
  
  const { loading: saving, saveCredentialsToStorage, loadCredentialsFromStorage } = useCredentialStorage();
  const { testing, testCredentials } = useCredentialTester();

  // Use dynamic analysis instead of hardcoded database
  const requirement = analyzeDynamicNodeCredentials(nodeData || { nodeType, type: nodeType });
  const credentialStatus = getDynamicCredentialStatus(requirement, localCredentials);

  console.log('🔄 CredentialManager render:', {
    nodeId,
    nodeType,
    serviceName: requirement.serviceName,
    requiresCredentials: requirement.requiresCredentials,
    fieldsCount: requirement.fields.length,
    calculatedStatus: credentialStatus,
    credentialsCount: Object.keys(localCredentials).length
  });

  // Load saved credentials on mount
  useEffect(() => {
    console.log('🚀 Loading credentials for node:', nodeId);
    const savedCredentials = loadCredentialsFromStorage(nodeId);
    if (Object.keys(savedCredentials).length > 0) {
      console.log('📥 Found saved credentials, updating component');
      setLocalCredentials(savedCredentials);
      onCredentialsChange(savedCredentials);
    }
  }, [nodeId, loadCredentialsFromStorage]);

  // Update status when credentials change
  useEffect(() => {
    console.log('📊 Status change detected:', { 
      newStatus: credentialStatus 
    });
    onStatusChange(credentialStatus);
  }, [localCredentials, nodeType, onStatusChange, credentialStatus]);

  // Validate fields when credentials change
  useEffect(() => {
    const validation: Record<string, boolean> = {};
    requirement.fields.forEach(field => {
      const value = localCredentials[field.name];
      validation[field.name] = validateDynamicCredentialValue(field, String(value || ''));
    });
    setFieldValidation(validation);
  }, [localCredentials, requirement]);

  const handleCredentialChange = (fieldName: string, value: string) => {
    console.log('🔄 Credential field changed:', { fieldName, value: value ? '[REDACTED]' : 'empty' });
    
    const updatedCredentials = {
      ...localCredentials,
      [fieldName]: value
    };
    
    setLocalCredentials(updatedCredentials);
    onCredentialsChange(updatedCredentials);
    
    // Clear previous test results when credentials change
    setLastTestResult({});
  };

  const handleSaveCredentials = async () => {
    console.log('💾 Saving credentials for node:', nodeId);
    toast.info('Saving credentials...');
    
    const success = await saveCredentialsToStorage(nodeId, nodeType, localCredentials, workflowId);
    
    if (success) {
      toast.success('Credentials saved successfully!');
      console.log('✅ Credentials saved successfully');
    } else {
      toast.error('Failed to save credentials');
      console.error('❌ Failed to save credentials');
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
    
    const result = await testCredentials(nodeType, localCredentials);
    setLastTestResult(result);
    
    if (result.success) {
      toast.success('Connection test successful!');
      console.log('✅ Connection test passed');
    } else {
      toast.error(`Connection test failed: ${result.message}`);
      console.error('❌ Connection test failed:', result.message);
    }
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

  const isTestingCurrentNode = Object.values(testing).some(Boolean);

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Key className="w-5 h-5" />
            <span>{requirement.serviceName} Credentials</span>
          </div>
          <NodeCredentialStatus nodeId={nodeId} status={credentialStatus} />
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
              <CredentialField
                field={field}
                value={String(localCredentials[field.name] || '')}
                onChange={(value) => handleCredentialChange(field.name, value)}
                isValid={fieldValidation[field.name]}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {lastTestResult.message && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-3 border rounded-lg ${
              lastTestResult.success 
                ? 'bg-green-500/10 border-green-400/20' 
                : 'bg-red-500/10 border-red-400/20'
            }`}
          >
            <p className={`text-sm flex items-start space-x-2 ${
              lastTestResult.success ? 'text-green-400' : 'text-red-400'
            }`}>
              {lastTestResult.success ? (
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              )}
              <span>{lastTestResult.message}</span>
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
              onClick={handleSaveCredentials}
              disabled={saving || credentialStatus === 'empty' || credentialStatus === 'not_required'}
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {saving ? 'Saving...' : 'Save'}
            </Button>
            
            <Button
              onClick={handleTestConnection}
              disabled={isTestingCurrentNode || credentialStatus === 'empty' || credentialStatus === 'not_required'}
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              {isTestingCurrentNode ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <TestTube className="w-4 h-4 mr-2" />
              )}
              {isTestingCurrentNode ? 'Testing...' : 'Test'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
