import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCloudN8nInstances } from '@/hooks/useCloudN8nInstances';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Server, ExternalLink, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { CloudN8nDeleteButton } from '@/components/CloudN8nDeleteButton';

interface DeploymentResult {
  serviceUrl: string;
  credentials: {
    username: string;
    password: string;
  };
}

const CloudN8N = () => {
  const [instanceName, setInstanceName] = useState('');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [deploymentResult, setDeploymentResult] = useState<DeploymentResult | null>(null);
  const [statusChecking, setStatusChecking] = useState<Record<string, boolean>>({});
  
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
    
    // Ensure we pass string values, not booleans
    const instanceNameStr = String(instanceName.trim());
    const usernameStr = String(username.trim());
    const passwordStr = String(password.trim());
    
    console.log('Creating instance with:', { 
      instanceName: instanceNameStr, 
      username: usernameStr, 
      password: '***' 
    });
    
    const result = await createInstance(instanceNameStr, usernameStr, passwordStr);
    
    if (result.success) {
      setInstanceName('');
      setUsername('admin');
      setPassword('');
      setDeploymentResult({
        serviceUrl: result.serviceUrl!,
        credentials: result.credentials!
      });
      toast({
        title: "Success",
        description: "N8N instance deployment started successfully",
      });
    } else {
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
          description: "Instance is now active!",
        });
        refetch();
      } else {
        toast({
          title: "Status Check",
          description: `Instance status: ${result.status}`,
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
                <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                  Instance Deployed Successfully!
                </h4>
                <div className="space-y-2 text-sm">
                  <p><strong>URL:</strong> {deploymentResult.serviceUrl}</p>
                  <p><strong>Username:</strong> {deploymentResult.credentials.username}</p>
                  <p><strong>Password:</strong> {deploymentResult.credentials.password}</p>
                  <p className="text-yellow-600 dark:text-yellow-400">
                    Note: It may take a few minutes for the service to be fully active.
                  </p>
                </div>
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
                              {instance.status}
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
                          URL: {instance.instance_url}
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
