
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause, 
  Settings, 
  Trash2, 
  Plus, 
  Edit,
  ExternalLink,
  Calendar,
  Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGitHubIntegration } from '@/hooks/useGitHubIntegration';

interface WorkflowItem {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'draft';
  created_at: string;
  updated_at: string;
  workflow_data: any;
  n8n_workflow_id?: string;
  deployment_url?: string;
}

const Workflows = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getUserWorkflows, deleteWorkflow, loadWorkflow } = useGitHubIntegration();
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadWorkflows();
    }
  }, [user]);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      
      // Load workflows from GitHub integration - returns array directly
      const workflowsData = await getUserWorkflows();
      
      if (workflowsData && workflowsData.length > 0) {
        const formattedWorkflows = workflowsData.map((workflow: any) => ({
          id: workflow.workflow_id || workflow.id,
          name: workflow.workflow_name || 'Untitled Workflow',
          description: workflow.description || 'No description',
          status: workflow.status || 'draft',
          created_at: workflow.created_at,
          updated_at: workflow.last_updated || workflow.updated_at,
          workflow_data: workflow.workflow_data,
          n8n_workflow_id: workflow.n8n_workflow_id,
          deployment_url: workflow.deployment_url || (workflow.n8n_workflow_id ? `https://n8n.casel.cloud/workflow/${workflow.n8n_workflow_id}` : null)
        }));
        
        setWorkflows(formattedWorkflows);
        console.log('✅ Loaded workflows:', formattedWorkflows);
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

  const handleEditWorkflow = async (workflowId: string) => {
    console.log('🔄 Navigating to edit workflow:', workflowId);
    // Navigate immediately with workflowId, let playground handle loading
    navigate(`/workflow-playground?id=${workflowId}`);
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    if (window.confirm('Are you sure you want to delete this workflow?')) {
      try {
        const result = await deleteWorkflow(workflowId);
        if (result.success) {
          await loadWorkflows(); // Refresh the list
        } else {
          alert('Failed to delete workflow');
        }
      } catch (error) {
        console.error('Error deleting workflow:', error);
        alert('Error deleting workflow');
      }
    }
  };

  const handleToggleStatus = async (workflowId: string, currentStatus: string) => {
    // This would toggle the workflow status in N8N
    console.log('Toggle status for workflow:', workflowId, currentStatus);
    // Implementation would go here
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading workflows...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Workflows</h1>
          <p className="text-gray-600 mt-2">
            Manage your automation workflows and deployments
          </p>
        </div>
        <Button 
          onClick={() => navigate('/workflow-playground')}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create New Workflow
        </Button>
      </div>

      {workflows.length === 0 ? (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Activity className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No workflows yet</h3>
            <p className="text-gray-600 mb-6">
              Create your first automation workflow to get started
            </p>
            <Button 
              onClick={() => navigate('/workflow-playground')}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Your First Workflow
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {workflows.map((workflow) => (
            <Card key={workflow.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1">{workflow.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {workflow.description}
                    </CardDescription>
                  </div>
                  <Badge 
                    variant="secondary" 
                    className={getStatusColor(workflow.status)}
                  >
                    {workflow.status}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="text-sm text-gray-600 space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Created: {formatDate(workflow.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    <span>Updated: {formatDate(workflow.updated_at)}</span>
                  </div>
                  {workflow.n8n_workflow_id && (
                    <div className="flex items-center gap-2">
                      <ExternalLink className="w-4 h-4" />
                      <span>N8N ID: {workflow.n8n_workflow_id}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditWorkflow(workflow.id)}
                    className="flex items-center gap-1"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleStatus(workflow.id, workflow.status)}
                    className="flex items-center gap-1"
                  >
                    {workflow.status === 'active' ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    {workflow.status === 'active' ? 'Pause' : 'Activate'}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteWorkflow(workflow.id)}
                    className="flex items-center gap-1 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                </div>

                {workflow.deployment_url && (
                  <div className="pt-2 border-t">
                    <a
                      href={workflow.deployment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View in N8N
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Workflows;
