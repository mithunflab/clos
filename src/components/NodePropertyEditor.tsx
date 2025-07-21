import React, { useState, useEffect } from 'react';
import { Node } from '@xyflow/react';
import { X, Settings, Database, Globe, Mail, Webhook, Code, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CredentialManager } from './CredentialManager';

interface NodePropertyEditorProps {
  node: Node;
  onClose: () => void;
  onSave: (nodeId: string, nodeData: any) => void;
  onJsonUpdate?: (updatedWorkflow: any) => void;
}

const NodePropertyEditor: React.FC<NodePropertyEditorProps> = ({ 
  node, 
  onClose, 
  onSave,
  onJsonUpdate 
}) => {
  const [nodeData, setNodeData] = useState(node.data);
  const [credentials, setCredentials] = useState<Record<string, any>>({});
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [credentialStatus, setCredentialStatus] = useState<'not_required' | 'empty' | 'partial' | 'configured' | 'invalid'>('empty');

  useEffect(() => {
    setNodeData(node.data);
    setCredentials(node.data.credentials || {});
    setParameters(node.data.parameters || {});
  }, [node]);

  const handleCredentialChange = (updatedCredentials: Record<string, any>) => {
    console.log('🔄 Credential change in NodePropertyEditor:', updatedCredentials);
    setCredentials(updatedCredentials);
    
    // Trigger immediate JSON update
    const updatedNodeData = {
      ...nodeData,
      credentials: updatedCredentials,
      parameters,
      disabled: nodeData.disabled
    };

    if (onJsonUpdate) {
      onJsonUpdate({
        nodeId: node.id,
        updatedData: updatedNodeData
      });
    }
  };

  const handleParameterChange = (paramName: string, value: any) => {
    const updatedParameters = {
      ...parameters,
      [paramName]: value
    };
    setParameters(updatedParameters);

    // Trigger immediate JSON update
    const updatedNodeData = {
      ...nodeData,
      credentials,
      parameters: updatedParameters,
      disabled: nodeData.disabled
    };

    if (onJsonUpdate) {
      onJsonUpdate({
        nodeId: node.id,
        updatedData: updatedNodeData
      });
    }
  };

  const handleSave = () => {
    const updatedNodeData = {
      ...nodeData,
      credentials,
      parameters,
      disabled: nodeData.disabled
    };

    onSave(node.id, updatedNodeData);
    
    if (onJsonUpdate) {
      onJsonUpdate({
        nodeId: node.id,
        updatedData: updatedNodeData
      });
    }
    
    onClose();
  };

  const getNodeIcon = () => {
    const type = String(nodeData.nodeType || '').replace('n8n-nodes-base.', '').toLowerCase();
    
    if (type.includes('google') || type.includes('youtube')) return <Globe className="w-5 h-5" />;
    if (type.includes('database') || type.includes('mysql') || type.includes('postgres')) return <Database className="w-5 h-5" />;
    if (type.includes('email') || type.includes('mail')) return <Mail className="w-5 h-5" />;
    if (type.includes('webhook') || type.includes('http')) return <Webhook className="w-5 h-5" />;
    if (type.includes('code') || type.includes('function')) return <Code className="w-5 h-5" />;
    return <Settings className="w-5 h-5" />;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center space-x-3">
            {getNodeIcon()}
            <div>
              <h2 className="text-xl font-semibold text-white">{String(nodeData.name || 'Node')}</h2>
              <p className="text-sm text-white/60">{String(nodeData.nodeType || '').replace('n8n-nodes-base.', '')}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white/60 hover:text-white"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <Tabs defaultValue="credentials" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-white/5">
              <TabsTrigger value="credentials" className="text-white/70 data-[state=active]:text-white">
                Credentials
              </TabsTrigger>
              <TabsTrigger value="parameters" className="text-white/70 data-[state=active]:text-white">
                Parameters
              </TabsTrigger>
              <TabsTrigger value="settings" className="text-white/70 data-[state=active]:text-white">
                Settings
              </TabsTrigger>
            </TabsList>

            {/* Credentials Tab */}
            <TabsContent value="credentials" className="space-y-4">
              <CredentialManager
                nodeType={String(nodeData.nodeType || '')}
                credentials={credentials}
                onCredentialsChange={handleCredentialChange}
                onStatusChange={setCredentialStatus}
                nodeData={nodeData} // Pass the full nodeData for dynamic analysis
              />
            </TabsContent>

            {/* Parameters Tab */}
            <TabsContent value="parameters" className="space-y-4">
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Node Parameters</CardTitle>
                  <CardDescription className="text-white/60">
                    Configure specific parameters for this node
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(parameters).map(([key, value]) => (
                    <div key={key} className="space-y-2">
                      <Label htmlFor={key} className="text-white capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </Label>
                      {typeof value === 'boolean' ? (
                        <Switch
                          checked={Boolean(value)}
                          onCheckedChange={(checked) => handleParameterChange(key, checked)}
                        />
                      ) : typeof value === 'object' ? (
                        <Textarea
                          id={key}
                          value={JSON.stringify(value, null, 2)}
                          onChange={(e) => {
                            try {
                              const parsed = JSON.parse(e.target.value);
                              handleParameterChange(key, parsed);
                            } catch {
                              // Invalid JSON, keep as string for now
                            }
                          }}
                          className="bg-white/10 border-white/20 text-white placeholder-white/40"
                          rows={4}
                        />
                      ) : (
                        <Input
                          id={key}
                          value={String(value || '')}
                          onChange={(e) => handleParameterChange(key, e.target.value)}
                          className="bg-white/10 border-white/20 text-white placeholder-white/40"
                        />
                      )}
                    </div>
                  ))}
                  
                  {/* Add new parameter */}
                  <div className="pt-4 border-t border-white/10">
                    <Button
                      onClick={() => {
                        const paramName = prompt('Enter parameter name:');
                        if (paramName) {
                          handleParameterChange(paramName, '');
                        }
                      }}
                      variant="outline"
                      size="sm"
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                      Add Parameter
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-4">
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Node Settings</CardTitle>
                  <CardDescription className="text-white/60">
                    General node configuration options
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white">Node Disabled</Label>
                      <p className="text-sm text-white/60">Disable this node from execution</p>
                    </div>
                    <Switch
                      checked={Boolean(nodeData.disabled || false)}
                      onCheckedChange={(checked) => setNodeData(prev => ({ ...prev, disabled: checked }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="nodeName" className="text-white">Node Name</Label>
                    <Input
                      id="nodeName"
                      value={String(nodeData.name || '')}
                      onChange={(e) => setNodeData(prev => ({ ...prev, name: e.target.value }))}
                      className="bg-white/10 border-white/20 text-white placeholder-white/40"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-white/10">
          <Button
            variant="outline"
            onClick={onClose}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NodePropertyEditor;
