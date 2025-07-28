
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCloudN8nInstances } from '@/hooks/useCloudN8nInstances';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Server, ExternalLink, Eye, EyeOff, RefreshCw, CheckCircle } from 'lucide-react';
import { CloudN8nDeleteButton } from '@/components/CloudN8nDeleteButton';

interface DeploymentResult {
  serviceUrl: string;
  credentials: {
    username: string;
    password: string;
  };
  deploymentLogs?: any[];
  logsUrl?: string;
}

const CloudN8N = () => {
  const [instanceName, setInstanceName] = useState('');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [deploymentResult, setDeploymentResult] = useState<DeploymentResult | null>(null);
  const [statusChecking, setStatusChecking] = useState<Record<string, boolean>>({});
  const [deploymentStage, setDeploymentStage] = useState<string>('');
  
  const { instances, loading, error, hasAccess, createInstance, checkDeploymentStatus, deleteInstance, refetch } = useCloudN8nInstances();
  const { toast } = useToast();

  const handleCreateInstance = async () => {
    if (!instanceName.trim()) {
      toast({
        title: "Error",
        description: "Please enter an instance name",
        variant: "destructive",
      });
      return;
    }

    if (!username.trim()) {
      toast({
        title: "Error",
        description: "Please enter a username",
        variant: "destructive",
      });
      return;
    }

    if (!password.trim()) {
      toast({
        title: "Error",
        description: "Please enter a password",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    setDeploymentResult(null);
    setError(null);
    
    // Show deployment stages
    setDeploymentStage('Getting Render owner ID...');
    
    setTimeout(() => setDeploymentStage('Creating N8N service...'), 2000);
    setTimeout(() => setDeploymentStage('Triggering deployment...'), 4000);
    setTimeout(() => setDeploymentStage('Finalizing setup...'), 6000);
    
    const result = await createInstance(instanceName.trim(), username.trim(), password.trim());
    
    if (result.success) {
      setInstanceName('');
      setUsername('admin');
      setPassword('');
      setDeploymentResult({
        serviceUrl: result.serviceUrl!,
        credentials: result.credentials!,
        deploymentLogs: result.deploymentLogs,
        logsUrl: result.logsUrl
      });
      setDeploymentStage('');
      toast({
        title: "Success",
        description: "N8N instance deployment started successfully! It may take a few minutes to become fully active.",
      });
    } else {
      setDeploymentStage('');
      toast({
        title: "Error",
        description: result.error || "Failed to create instance",
        variant: "destructive",
      });
    }
    
    setIsCreating(false);
  };

  const handleCheckStatus = async (instanceId: string) => {
    setStatusChecking(prev => ({ ...prev, [instanceId]: true }));
    
    const result = await checkDeploymentStatus(instanceId);
    
    if (result.success) {
      if (result.isActive) {
        toast({
          title: "Status Updated",
          description: "Instance is now active! You can access it using the provided URL.",
        });
        refetch();
      } else {
        toast({
          title: "Status Check",
          description: `Instance status: ${result.status}. It may take a few more minutes to become active.`,
        });
      }
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to check status",
        variant: "destructive",
      });
    }
    
    setStatusChecking(prev => ({ ...prev, [instanceId]: false }));
  };

  const handleInstanceDeleted = () => {
    refetch();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'creating': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'creating': return 'Deploying';
      case 'error': return 'Error';
      default: return 'Unknown';
    }
  };

  const generatePassword = () => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setPassword(password);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Cloud N8N Instances
            </CardTitle>
            <CardDescription>
              Manage your cloud-hosted N8N automation instances
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                You don't have access to N8N instances. Please purchase an N8N instance to get started.
              </p>
              <Button>
                Purchase N8N Instance
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Cloud N8N Instances
          </CardTitle>
          <CardDescription>
            Deploy and manage your cloud-hosted N8N automation instances on Render
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Create New Instance Form */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="text-lg font-semibold">Deploy New N8N Instance</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="instanceName">Instance Name</Label>
                  <Input
                    id="instanceName"
                    type="text"
                    placeholder="Enter instance name"
                    value={instanceName}
                    onChange={(e) => setInstanceName(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-20"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center space-x-1 pr-3">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPassword(!showPassword)}
                        className="h-7 w-7 p-0"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generatePassword}
                    className="w-full"
                  >
                    Generate Password
                  </Button>
                </div>
              </div>
              
              {/* Deployment Progress */}
              {isCreating && deploymentStage && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm font-medium">{deploymentStage}</span>
                  </div>
                </div>
              )}
              
              <Button 
                onClick={handleCreateInstance}
                disabled={isCreating || !instanceName.trim() || !username.trim() || !password.trim()}
                className="w-full"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deploying to Render...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Deploy N8N Instance
                  </>
                )}
              </Button>
            </div>

            {/* Deployment Result */}
            {deploymentResult && (
              <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-900/20">
                <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Instance Deployed Successfully!
                </h4>
                <div className="space-y-2 text-sm">
                  <p><strong>URL:</strong> <a href={deploymentResult.serviceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{deploymentResult.serviceUrl}</a></p>
                  <p><strong>Username:</strong> {deploymentResult.credentials.username}</p>
                  <p><strong>Password:</strong> {deploymentResult.credentials.password}</p>
                  <p className="text-yellow-600 dark:text-yellow-400">
                    <strong>Note:</strong> It may take 5-10 minutes for the service to be fully active. You can check the status using the refresh button on your instance.
                  </p>
                  {deploymentResult.logsUrl && (
                    <p className="text-xs text-muted-foreground">
                      <strong>Deployment logs:</strong> <a href={deploymentResult.logsUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View on Render</a>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-900/20">
                <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">Error</h4>
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            {/* Instances List */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Your N8N Instances</h3>
              
              {instances.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No N8N instances found. Deploy your first instance to get started.
                  </p>
                </div>
              ) : (
                instances.map((instance) => (
                  <Card key={instance.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{instance.instance_name}</h3>
                            <Badge 
                              variant="secondary" 
                              className={`${getStatusColor(instance.status)} text-white`}
                            >
                              {getStatusText(instance.status)}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {instance.status === 'creating' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCheckStatus(instance.id)}
                              disabled={statusChecking[instance.id]}
                            >
                              {statusChecking[instance.id] ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          
                          {instance.instance_url && instance.status === 'active' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => window.open(instance.instance_url, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Open
                            </Button>
                          )}
                          
                          <CloudN8nDeleteButton
                            instanceId={instance.id}
                            instanceName={instance.instance_name}
                            renderServiceId={instance.render_service_id}
                            onDelete={handleInstanceDeleted}
                          />
                        </div>
                      </div>
                      
                      {instance.instance_url && (
                        <p className="text-sm text-muted-foreground mt-2">
                          URL: <a href={instance.instance_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{instance.instance_url}</a>
                        </p>
                      )}
                      
                      <p className="text-xs text-muted-foreground mt-1">
                        Created: {new Date(instance.created_at).toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CloudN8N;
