
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Cloud, Server, Trash2, ExternalLink } from 'lucide-react';
import { useCloudN8nInstances } from '@/hooks/useCloudN8nInstances';
import { useUserPlan } from '@/hooks/useUserPlan';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

const CloudN8n = () => {
  const [instanceName, setInstanceName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { instances, loading, createInstance, deleteInstance } = useCloudN8nInstances();
  const { plan } = useUserPlan();

  const canCreateInstance = plan?.plan_type === 'pro' || plan?.plan_type === 'custom';

  const handleCreateInstance = async () => {
    if (!instanceName.trim()) {
      toast.error('Please enter an instance name');
      return;
    }

    if (!canCreateInstance) {
      toast.error('Upgrade to Pro or Custom plan to create N8N instances');
      return;
    }

    setIsCreating(true);
    const success = await createInstance(instanceName.trim());
    
    if (success) {
      toast.success('N8N instance creation started');
      setInstanceName('');
    } else {
      toast.error('Failed to create N8N instance');
    }
    setIsCreating(false);
  };

  const handleDeleteInstance = async (instanceId: string) => {
    if (!confirm('Are you sure you want to delete this N8N instance?')) return;

    const success = await deleteInstance(instanceId);
    if (success) {
      toast.success('N8N instance deleted');
    } else {
      toast.error('Failed to delete N8N instance');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'deploying':
        return 'bg-blue-100 text-blue-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Cloud className="h-8 w-8" />
              Cloud N8N
            </h1>
            <p className="text-muted-foreground mt-2">
              Create and manage your N8N instances in the cloud
            </p>
          </div>
        </div>

        {!canCreateInstance && (
          <Alert className="mb-6">
            <AlertDescription>
              Cloud N8N instances are available for Pro and Custom plan subscribers only. 
              Upgrade your plan to create and manage N8N instances in the cloud.
            </AlertDescription>
          </Alert>
        )}

        {/* Create Instance Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create New N8N Instance
            </CardTitle>
            <CardDescription>
              Deploy a new N8N instance to the cloud with automatic setup and configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="instance-name">Instance Name</Label>
                <Input
                  id="instance-name"
                  value={instanceName}
                  onChange={(e) => setInstanceName(e.target.value)}
                  placeholder="Enter instance name"
                  disabled={!canCreateInstance}
                />
              </div>
              <Button
                onClick={handleCreateInstance}
                disabled={isCreating || !canCreateInstance}
                className="flex items-center gap-2"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Create Instance
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Instances List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Your N8N Instances
            </CardTitle>
            <CardDescription>
              Manage your deployed N8N instances
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading instances...</span>
              </div>
            ) : instances.length === 0 ? (
              <div className="text-center py-8">
                <Server className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No N8N instances found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Create your first instance to get started
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {instances.map((instance) => (
                  <div
                    key={instance.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Server className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <h3 className="font-semibold">{instance.instance_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Created {new Date(instance.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(instance.deployment_status)}>
                        {instance.deployment_status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {instance.render_service_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <a
                            href={instance.render_service_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Open
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteInstance(instance.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CloudN8n;
