
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Cloud, Lock, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { useUserPlan } from '@/hooks/useUserPlan';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface N8nService {
  id: string;
  name: string;
  url: string;
  status: 'creating' | 'active' | 'error';
  createdAt: string;
}

const CloudN8N = () => {
  const { user } = useAuth();
  const { plan } = useUserPlan();
  const [serviceName, setServiceName] = useState('');
  const [password, setPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [services, setServices] = useState<N8nService[]>([]);
  const [error, setError] = useState<string | null>(null);

  const canCreateService = plan?.plan_type === 'pro' || plan?.plan_type === 'custom';

  useEffect(() => {
    // Simulate loading existing services - in real app this would fetch from database
    const mockServices: N8nService[] = [];
    setServices(mockServices);
  }, []);

  const createN8nService = async () => {
    if (!serviceName || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!canCreateService) {
      toast.error('This feature is only available for Pro and Custom users');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('cloud-runner-manager', {
        body: {
          action: 'create-n8n-service',
          serviceName: serviceName,
          password: password,
          renderPayload: {
            service: {
              name: serviceName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
              type: "web_service",
              env: "docker",
              serviceDetails: {
                image: {
                  imagePath: "n8nio/n8n:latest"
                }
              },
              envVars: [
                { key: "N8N_BASIC_AUTH_ACTIVE", value: "true" },
                { key: "N8N_BASIC_AUTH_USER", value: "admin" },
                { key: "N8N_BASIC_AUTH_PASSWORD", value: password },
                { key: "PORT", value: "10000" }
              ]
            }
          }
        }
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        const newService: N8nService = {
          id: data.serviceId,
          name: serviceName,
          url: data.serviceUrl,
          status: 'creating',
          createdAt: new Date().toISOString()
        };

        setServices(prev => [...prev, newService]);
        setServiceName('');
        setPassword('');
        toast.success('N8N service is being created!');

        // Simulate status updates
        setTimeout(() => {
          setServices(prev => prev.map(s => 
            s.id === data.serviceId ? { ...s, status: 'active' } : s
          ));
        }, 30000);
      } else {
        throw new Error(data?.error || 'Failed to create N8N service');
      }
    } catch (err) {
      console.error('Error creating N8N service:', err);
      setError(err instanceof Error ? err.message : 'Failed to create N8N service');
      toast.error('Failed to create N8N service');
    } finally {
      setIsCreating(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'creating':
        return <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />;
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'creating':
        return 'bg-yellow-100 text-yellow-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Cloud className="h-8 w-8" />
            Cloud N8N
          </h1>
          <p className="text-muted-foreground mt-1">
            Deploy and manage your N8N workflows in the cloud
          </p>
        </div>
        <Badge variant={canCreateService ? "default" : "secondary"}>
          {plan?.plan_type || 'free'} plan
        </Badge>
      </div>

      {/* Create New Service Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Create New N8N Service
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!canCreateService && (
            <Alert>
              <Lock className="h-4 w-4" />
              <AlertDescription>
                This feature is only available for Pro and Custom users. 
                Upgrade your plan to create N8N services in the cloud.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="serviceName">Service Name</Label>
              <Input
                id="serviceName"
                placeholder="my-n8n-service"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                disabled={!canCreateService || isCreating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Admin Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={!canCreateService || isCreating}
              />
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={createN8nService}
            disabled={!canCreateService || isCreating || !serviceName || !password}
            className="w-full"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating N8N Service...
              </>
            ) : (
              <>
                <Cloud className="mr-2 h-4 w-4" />
                Create N8N Service
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Services List */}
      <Card>
        <CardHeader>
          <CardTitle>Your N8N Services</CardTitle>
        </CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Cloud className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No N8N services created yet</p>
              <p className="text-sm">Create your first N8N service to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(service.status)}
                    <div>
                      <h3 className="font-medium">{service.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Created {new Date(service.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(service.status)}>
                      {service.status}
                    </Badge>
                    {service.status === 'active' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(service.url, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open N8N
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Features Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="font-medium">Instant Deployment</h4>
                <p className="text-sm text-muted-foreground">
                  Deploy N8N in minutes with Docker containers
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="font-medium">Secure Authentication</h4>
                <p className="text-sm text-muted-foreground">
                  Built-in basic auth with custom passwords
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="font-medium">Cloud Hosting</h4>
                <p className="text-sm text-muted-foreground">
                  Reliable cloud infrastructure with Render
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CloudN8N;
