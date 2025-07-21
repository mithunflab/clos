
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Key, Save, CheckCircle, AlertCircle, ExternalLink, RefreshCw, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SmartCredential {
  name: string;
  value: string;
  description: string;
  required: boolean;
  service: string;
}

interface SmartCredentialNode {
  id: string;
  name: string;
  type: string;
  service: string;
  credentials: SmartCredential[];
  status: 'configured' | 'missing' | 'partial';
}

interface SmartCredentialManagerProps {
  workflowData?: any;
  credentialNodes?: any[];
}

const SmartCredentialManager: React.FC<SmartCredentialManagerProps> = ({
  workflowData,
  credentialNodes = []
}) => {
  const [nodes, setNodes] = useState<SmartCredentialNode[]>([]);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (credentialNodes && credentialNodes.length > 0) {
      console.log('🔍 Processing smart credential nodes:', credentialNodes);
      setNodes(credentialNodes.map(node => ({
        ...node,
        status: 'missing' as const,
        credentials: Array.isArray(node.credentials) ? node.credentials.map((cred: any) => ({
          ...cred,
          value: ''
        })) : []
      })));
    }
  }, [credentialNodes]);

  const updateCredential = (nodeId: string, credentialName: string, value: string) => {
    setNodes(prev => prev.map(node => {
      if (node.id === nodeId) {
        const updatedCredentials = node.credentials.map(cred => 
          cred.name === credentialName ? { ...cred, value } : cred
        );
        
        const requiredFilled = updatedCredentials.filter(c => c.required && c.value.trim()).length;
        const totalRequired = updatedCredentials.filter(c => c.required).length;
        
        let status: 'configured' | 'missing' | 'partial' = 'missing';
        if (requiredFilled === totalRequired && totalRequired > 0) {
          status = 'configured';
        } else if (requiredFilled > 0) {
          status = 'partial';
        }
        
        return {
          ...node,
          credentials: updatedCredentials,
          status
        };
      }
      return node;
    }));
  };

  const saveCredentials = async (nodeId: string) => {
    setSaving(true);
    try {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;

      const credentialData = node.credentials.reduce((acc, cred) => {
        if (cred.value.trim()) {
          acc[cred.name] = cred.value;
        }
        return acc;
      }, {} as Record<string, string>);

      localStorage.setItem(`smart_credentials_${nodeId}`, JSON.stringify(credentialData));
      console.log(`✅ Saved smart credentials for ${node.name}:`, Object.keys(credentialData));
      
      setEditingNode(null);
    } catch (error) {
      console.error('❌ Error saving credentials:', error);
    } finally {
      setSaving(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'configured':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'partial':
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-red-400" />;
    }
  };

  const getDocumentationLink = (service: string) => {
    if (!service) return null;
    
    const links: { [key: string]: string } = {
      'telegram': 'https://core.telegram.org/bots#how-do-i-create-a-bot',
      'slack': 'https://api.slack.com/apps',
      'discord': 'https://discord.com/developers/applications',
      'openai': 'https://platform.openai.com/api-keys',
      'anthropic': 'https://console.anthropic.com/',
      'google': 'https://console.cloud.google.com/apis/credentials',
      'youtube': 'https://console.cloud.google.com/apis/credentials',
      'gmail': 'https://console.cloud.google.com/apis/credentials',
      'googlesheets': 'https://console.cloud.google.com/apis/credentials',
      'groq': 'https://console.groq.com/keys'
    };
    return links[service.toLowerCase()];
  };

  if (nodes.length === 0) {
    return (
      <div className="text-center p-4">
        <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
        <div className="text-green-400 text-sm">
          ✨ No external credentials required!
        </div>
        <div className="text-white/60 text-xs mt-1">
          This workflow uses only built-in functions.
        </div>
      </div>
    );
  }

  const allConfigured = nodes.every(node => node.status === 'configured');
  const hasPartial = nodes.some(node => node.status === 'partial');

  return (
    <div className="space-y-4">
      <div className="text-white/90 text-sm">
        <div className="font-semibold mb-2 flex items-center space-x-2">
          <Key className="w-4 h-4" />
          <span>Smart Credential Configuration</span>
        </div>
        <div className="text-white/70 text-xs mb-3">
          {nodes.length} service{nodes.length > 1 ? 's' : ''} require{nodes.length === 1 ? 's' : ''} API credentials. Click "Configure" to enter credentials.
        </div>
      </div>

      {nodes.map((node) => (
        <motion.div
          key={node.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-black/20 border border-white/10 rounded-lg p-3"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3">
              {getStatusIcon(node.status)}
              <div>
                <div className="text-white font-medium text-sm">{node.service || node.name}</div>
                <div className="text-white/60 text-xs">
                  {node.name} • {node.credentials.length} credential{node.credentials.length > 1 ? 's' : ''}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {getDocumentationLink(node.service) && (
                <a
                  href={getDocumentationLink(node.service)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300"
                  title={`Get ${node.service} credentials`}
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingNode(editingNode === node.id ? null : node.id)}
                className="text-white/60 hover:text-white hover:bg-white/10 h-8 px-3 text-xs"
              >
                <Edit className="w-3 h-3 mr-1" />
                {editingNode === node.id ? 'Cancel' : 'Configure'}
              </Button>
            </div>
          </div>

          {editingNode === node.id && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-3 mt-3 pt-3 border-t border-white/10"
            >
              {node.credentials.map((credential) => (
                <div key={credential.name} className="space-y-2">
                  <Label className="text-white/80 text-xs flex items-center space-x-1">
                    <span>{credential.name.replace(/_/g, ' ').toUpperCase()}</span>
                    {credential.required && <span className="text-red-400">*</span>}
                  </Label>
                  <Input
                    type="password"
                    value={credential.value}
                    onChange={(e) => updateCredential(node.id, credential.name, e.target.value)}
                    placeholder={credential.description || `Enter your ${credential.name}`}
                    className="bg-white/5 border-white/10 text-white text-sm h-9"
                  />
                  {credential.description && (
                    <div className="text-white/50 text-xs">{credential.description}</div>
                  )}
                </div>
              ))}
              
              <div className="flex justify-end space-x-2 pt-2">
                <Button
                  onClick={() => saveCredentials(node.id)}
                  disabled={saving}
                  size="sm"
                  className="bg-blue-500 hover:bg-blue-600 text-white h-8 px-4 text-xs"
                >
                  {saving ? (
                    <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <Save className="w-3 h-3 mr-1" />
                  )}
                  {saving ? 'Saving...' : 'Save Credentials'}
                </Button>
              </div>
            </motion.div>
          )}
        </motion.div>
      ))}

      {/* Status Summary */}
      <div className="pt-3 border-t border-white/10">
        <div className="text-center">
          {allConfigured ? (
            <div className="text-green-400 text-sm flex items-center justify-center space-x-2">
              <CheckCircle className="w-4 h-4" />
              <span>All credentials configured! Ready to activate workflow.</span>
            </div>
          ) : hasPartial ? (
            <div className="text-yellow-400 text-sm flex items-center justify-center space-x-2">
              <AlertCircle className="w-4 h-4" />
              <span>Some credentials still needed. Click "Configure" above.</span>
            </div>
          ) : (
            <div className="text-red-400 text-sm flex items-center justify-center space-x-2">
              <AlertCircle className="w-4 h-4" />
              <span>Configure credentials above to activate workflow</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SmartCredentialManager;
