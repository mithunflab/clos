
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Play, Edit, Trash2, Clock, CheckCircle, AlertCircle, Bot, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useGitHubIntegration } from '@/hooks/useGitHubIntegration';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WorkflowItem {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'draft';
  created_at: string;
  updated_at: string;
  workflow_data?: any;
  n8n_workflow_id?: string;
  deployment_url?: string;
}

const Workflows = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { deleteWorkflow } = useGitHubIntegration();
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadWorkflows();
    }
  }, [user]);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      
      // Load workflows directly from Supabase
      const { data: workflowsData, error } = await supabase
        .from('user_workflows')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Error loading workflows from Supabase:', error);
        setWorkflows([]);
        return;
      }
      
      if (workflowsData && workflowsData.length > 0) {
        const formattedWorkflows = workflowsData.map((workflow: any) => ({
          id: workflow.workflow_id,
          name: workflow.workflow_name || 'Untitled Workflow',
          description: workflow.description || 'Automation workflow',
          status: (workflow.deployment_status === 'active' ? 'active' : 'draft') as 'active' | 'inactive' | 'draft',
          created_at: workflow.created_at,
          updated_at: workflow.last_updated,
          workflow_data: null, // Don't load workflow data until editing
          n8n_workflow_id: workflow.n8n_workflow_id,
          deployment_url: workflow.deployment_url
        }));
        
        setWorkflows(formattedWorkflows);
        console.log('✅ Loaded workflows from Supabase:', formattedWorkflows);
      } else {
        console.log('ℹ️ No workflows found');
        setWorkflows([]);
      }
    } catch (error) {
      console.error('❌ Error loading workflows:', error);
      setWorkflows([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    try {
      await deleteWorkflow(workflowId);
      setWorkflows(workflows.filter(w => w.id !== workflowId));
      toast({
        title: "Success",
        description: "Workflow deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting workflow:', error);
      toast({
        title: "Error",
        description: "Failed to delete workflow",
        variant: "destructive",
      });
    }
  };

  const handleEditWorkflow = (workflowId: string) => {
    navigate(`/workflows/${workflowId}/edit`);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'inactive':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="h-full bg-background">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-background overflow-y-auto">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <Bot className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Workflows</h1>
              <p className="text-muted-foreground">Manage your automation workflows</p>
            </div>
          </div>
          <Button onClick={() => navigate('/workflows/new')} className="flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Create Workflow</span>
          </Button>
        </div>

        {/* Workflows Grid */}
        {workflows.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Bot className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No workflows yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first workflow to get started with automation
            </p>
            <Button onClick={() => navigate('/workflows/new')}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Workflow
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workflows.map((workflow) => (
              <Card key={workflow.id} className="hover:shadow-lg transition-shadow duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-1">{workflow.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {workflow.description}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(workflow.status)}>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(workflow.status)}
                        <span className="capitalize">{workflow.status}</span>
                      </div>
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-xs text-muted-foreground">
                      <div>Created: {formatDate(workflow.created_at)}</div>
                      {workflow.updated_at && (
                        <div>Updated: {formatDate(workflow.updated_at)}</div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditWorkflow(workflow.id)}
                        className="flex-1"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      
                      {workflow.deployment_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(workflow.deployment_url, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteWorkflow(workflow.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Workflows;
