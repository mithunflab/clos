import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Clock, CheckCircle, AlertCircle, Bot, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useWorkflowStorageV2 } from '@/hooks/useWorkflowStorageV2';
import { useUserPlan } from '@/hooks/useUserPlan';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GlowingEffect } from '@/components/ui/glowing-effect';

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
  const { plan } = useUserPlan();
  const { deleteWorkflow, getUserWorkflowCount, getWorkflowLimit } = useWorkflowStorageV2();
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [workflowCount, setWorkflowCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadWorkflows();
      loadWorkflowCount();
    }
  }, [user]);

  const loadWorkflowCount = async () => {
    try {
      const count = await getUserWorkflowCount();
      setWorkflowCount(count);
    } catch (error) {
      console.error('Error loading workflow count:', error);
    }
  };

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      
      const { data: workflowsData, error } = await supabase
        .from('workflow_data')
        .select('*')
        .eq('user_id', user?.id)
        .order('updated_at', { ascending: false });
      
      if (error) {
        console.error('❌ Error loading workflows from Supabase:', error);
        setWorkflows([]);
        return;
      }
      
      if (workflowsData && workflowsData.length > 0) {
        const formattedWorkflows = workflowsData.map((workflow: any) => ({
          id: workflow.workflow_id,
          name: workflow.workflow_name || 'Untitled Workflow',
          description: workflow.metadata?.description || 'Automation workflow',
          status: (workflow.deployment_status === 'active' ? 'active' : 'draft') as 'active' | 'inactive' | 'draft',
          created_at: workflow.created_at,
          updated_at: workflow.updated_at,
          workflow_data: null,
          n8n_workflow_id: workflow.n8n_workflow_id,
          deployment_url: workflow.n8n_url
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
      await loadWorkflowCount(); // Refresh count
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
    navigate(`/playground?id=${workflowId}`);
  };

  const handleCreateWorkflow = () => {
    const workflowLimit = getWorkflowLimit();
    
    if (workflowLimit !== -1 && workflowCount >= workflowLimit) {
      toast({
        title: "Workflow Limit Reached",
        description: `You have reached the maximum number of workflows (${workflowLimit}) for your ${plan?.plan_type} plan. Please upgrade to create more workflows.`,
        variant: "destructive",
      });
      return;
    }
    
    navigate('/playground');
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
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'inactive':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
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

  const getWorkflowLimitText = () => {
    const limit = getWorkflowLimit();
    if (limit === -1) return 'Unlimited';
    return `${workflowCount}/${limit}`;
  };

  const getWorkflowLimitColor = () => {
    const limit = getWorkflowLimit();
    if (limit === -1) return 'text-green-400';
    if (workflowCount >= limit) return 'text-red-400';
    if (workflowCount >= limit * 0.8) return 'text-yellow-400';
    return 'text-green-400';
  };

  if (loading) {
    return (
      <div className="min-h-screen text-white">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <Bot className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Workflows</h1>
              <p className="text-white/70">
                Manage your automation workflows 
                <span className={`ml-2 font-medium ${getWorkflowLimitColor()}`}>
                  ({getWorkflowLimitText()})
                </span>
              </p>
            </div>
          </div>
          <Button 
            onClick={handleCreateWorkflow}
            className="flex items-center space-x-2 bg-white text-black hover:bg-white/90"
          >
            <Plus className="w-4 h-4" />
            <span>Create Workflow</span>
          </Button>
        </div>

        {/* Workflows Grid */}
        {workflows.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bot className="w-8 h-8 text-white/70" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No workflows yet</h3>
            <p className="text-white/70 mb-6">
              Create your first workflow to get started with automation
            </p>
            <Button 
              onClick={handleCreateWorkflow}
              className="bg-white text-black hover:bg-white/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Workflow
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workflows.map((workflow) => (
              <div key={workflow.id} className="relative min-h-[18rem]">
                <div className="relative h-full rounded-[1.25rem] border-[0.75px] border-border p-2">
                  <GlowingEffect
                    spread={40}
                    glow={true}
                    disabled={false}
                    proximity={64}
                    inactiveZone={0.01}
                    borderWidth={3}
                  />
                  <Card className="relative h-full bg-black/30 backdrop-blur-sm border border-white/10 hover:bg-black/40 transition-all duration-200 rounded-xl shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-1 text-white">{workflow.name}</CardTitle>
                          <CardDescription className="text-sm text-white/60">
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
                        <div className="text-xs text-white/60">
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
                            className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteWorkflow(workflow.id)}
                            className="bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          
                          {workflow.deployment_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(workflow.deployment_url, '_blank')}
                              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Workflows;
