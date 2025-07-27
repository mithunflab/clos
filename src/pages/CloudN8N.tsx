
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Cloud, Plus, ExternalLink, Settings, Trash2, Crown, ShoppingCart } from 'lucide-react';
import { useCloudN8nInstances } from '@/hooks/useCloudN8nInstances';
import { useUserPlan } from '@/hooks/useUserPlan';
import { toast } from 'sonner';
import PurchaseModal from '@/components/PurchaseModal';

const CloudN8N = () => {
  const [instanceName, setInstanceName] = useState('');
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const { instances, loading, createInstance } = useCloudN8nInstances();
  const { plan } = useUserPlan();

  const handleCreateInstance = async () => {
    if (!instanceName.trim()) {
      toast.error('Please enter an instance name');
      return;
    }

    const success = await createInstance(instanceName.trim());
    if (success) {
      toast.success('N8N instance creation started!');
      setInstanceName('');
    } else {
      toast.error('Failed to create N8N instance');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'creating':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const canCreateInstance = () => {
    if (plan?.plan_type === 'pro' || plan?.plan_type === 'custom') {
      return true;
    }
    // Free users can create instances if they have purchased any
    return instances.length > 0;
  };

  const showCreateForm = () => {
    return canCreateInstance() || instances.length > 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto max-w-6xl">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-muted rounded-lg w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-48 bg-muted rounded-xl"></div>
              <div className="h-48 bg-muted rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Cloud className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold">Cloud N8N Instances</h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Manage your cloud-hosted N8N workflow automation instances
          </p>
        </div>

        {/* Purchase N8N Button for users without access */}
        {!canCreateInstance() && instances.length === 0 && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <ShoppingCart className="h-6 w-6" />
                Get Your N8N Instance
              </CardTitle>
              <CardDescription>
                Purchase a cloud N8N instance to start automating your workflows
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => setShowPurchaseModal(true)} className="w-full">
                <Cloud className="h-4 w-4 mr-2" />
                Purchase N8N Instance - $20/month
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Create Instance Form */}
        {showCreateForm() && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create New N8N Instance
              </CardTitle>
              <CardDescription>
                {plan?.plan_type === 'pro' || plan?.plan_type === 'custom' 
                  ? 'Pro users get 1 free instance. Additional instances cost $20/month.'
                  : 'Create additional N8N instances for $20/month each.'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="instanceName">Instance Name</Label>
                <Input
                  id="instanceName"
                  placeholder="Enter instance name (e.g., my-workflows)"
                  value={instanceName}
                  onChange={(e) => setInstanceName(e.target.value)}
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={handleCreateInstance}
                  disabled={!instanceName.trim()}
                  className="flex-1"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Instance
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => setShowPurchaseModal(true)}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Buy More
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instances List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Your N8N Instances</h2>
          
          {instances.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Cloud className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No instances yet</h3>
                <p className="text-muted-foreground">
                  Create your first N8N instance to get started with workflow automation
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {instances.map((instance) => (
                <Card key={instance.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{instance.instance_name}</CardTitle>
                      <Badge className={getStatusColor(instance.status)}>
                        {instance.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      Created: {new Date(instance.created_at).toLocaleDateString()}
                    </div>
                    
                    {instance.instance_url && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="flex-1"
                        >
                          <a
                            href={instance.instance_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Open N8N
                          </a>
                        </Button>
                        
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                        
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    
                    {instance.status === 'creating' && (
                      <div className="text-sm text-muted-foreground">
                        Your instance is being created. This may take a few minutes...
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Plan Benefits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              N8N Instance Benefits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">Free Plan</h4>
                <p className="text-sm text-muted-foreground">
                  Purchase N8N instances for $20/month each
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Pro Plan</h4>
                <p className="text-sm text-muted-foreground">
                  1 free N8N instance included, additional instances $20/month
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <PurchaseModal 
        isOpen={showPurchaseModal} 
        onClose={() => setShowPurchaseModal(false)} 
      />
    </div>
  );
};

export default CloudN8N;
