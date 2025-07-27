
import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCloudN8nInstances } from '@/hooks/useCloudN8nInstances';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Server, ExternalLink } from 'lucide-react';
import { CloudN8nDeleteButton } from '@/components/CloudN8nDeleteButton';

const CloudN8N = () => {
  const [instanceName, setInstanceName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { instances, loading, error, hasAccess, createInstance, refetch } = useCloudN8nInstances();
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

    setIsCreating(true);
    const success = await createInstance(instanceName.trim());
    
    if (success) {
      setInstanceName('');
      toast({
        title: "Success",
        description: "N8N instance creation started",
      });
    }
    
    setIsCreating(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'creating': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const handleInstanceDeleted = () => {
    refetch();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!hasAccess) {
    return (
      <DashboardLayout>
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
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
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
            <div className="space-y-6">
              {/* Create New Instance */}
              <div className="flex gap-4">
                <Input
                  placeholder="Enter instance name"
                  value={instanceName}
                  onChange={(e) => setInstanceName(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={handleCreateInstance}
                  disabled={isCreating || !instanceName.trim()}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Instance
                    </>
                  )}
                </Button>
              </div>

              {/* Instances List */}
              <div className="space-y-4">
                {instances.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      No N8N instances found. Create your first instance to get started.
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
    </DashboardLayout>
  );
};

export default CloudN8N;
