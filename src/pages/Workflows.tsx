import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Clock, CheckCircle, AlertCircle, Bot, ExternalLink, Cloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useWorkflowStorageV2 } from '@/hooks/useWorkflowStorageV2';
import { useCloudRunnerProjects } from '@/hooks/useCloudRunnerProjects';
import { useUserPlan } from '@/hooks/useUserPlan';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
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
interface CloudRunnerProject {
  id: string;
  project_name: string;
  deployment_status: string;
  github_repo_url?: string;
  render_service_url?: string;
  created_at: string;
  updated_at: string;
}
const Workflows = () => {
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const {
    plan
  } = useUserPlan();
  const {
    deleteWorkflow,
    getUserWorkflowCount,
    getWorkflowLimit
  } = useWorkflowStorageV2();
  const {
    getUserProjects,
    deleteProject
  } = useCloudRunnerProjects();
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [cloudProjects, setCloudProjects] = useState<CloudRunnerProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [workflowCount, setWorkflowCount] = useState(0);
  const {
    toast
  } = useToast();
  useEffect(() => {
    if (user) {
      loadWorkflows();
      loadCloudProjects();
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
      const {
        data: workflowsData,
        error
      } = await supabase.from('workflow_data').select('*').eq('user_id', user?.id).order('updated_at', {
        ascending: false
      });
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
  const loadCloudProjects = async () => {
    try {
      const projects = await getUserProjects();
      setCloudProjects(projects);
    } catch (error) {
      console.error('Error loading cloud projects:', error);
      setCloudProjects([]);
    }
  };
  const handleDeleteWorkflow = async (workflowId: string) => {
    try {
      await deleteWorkflow(workflowId);
      setWorkflows(workflows.filter(w => w.id !== workflowId));
      await loadWorkflowCount(); // Refresh count
      toast({
        title: "Success",
        description: "Workflow deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting workflow:', error);
      toast({
        title: "Error",
        description: "Failed to delete workflow",
        variant: "destructive"
      });
    }
  };
  const handleDeleteCloudProject = async (projectId: string) => {
    try {
      await deleteProject(projectId);
      setCloudProjects(cloudProjects.filter(p => p.id !== projectId));
      toast({
        title: "Success",
        description: "Cloud project deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting cloud project:', error);
      toast({
        title: "Error",
        description: "Failed to delete cloud project",
        variant: "destructive"
      });
    }
  };
  const handleEditWorkflow = (workflowId: string) => {
    navigate(`/playground?id=${workflowId}`);
  };
  const handleEditCloudProject = (projectId: string) => {
    navigate(`/cloud-runner?id=${projectId}`);
  };
  const handleCreateWorkflow = () => {
    const workflowLimit = getWorkflowLimit();
    if (workflowLimit !== -1 && workflowCount >= workflowLimit) {
      toast({
        title: "Workflow Limit Reached",
        description: `You have reached the maximum number of workflows (${workflowLimit}) for your ${plan?.plan_type} plan. Please upgrade to create more workflows.`,
        variant: "destructive"
      });
      return;
    }
    navigate('/playground');
  };
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
      case 'deployed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'inactive':
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'deployed':
        return 'bg-green-500/20 text-green-600 border-green-500/30 dark:text-green-400';
      case 'inactive':
      case 'error':
        return 'bg-red-500/20 text-red-600 border-red-500/30 dark:text-red-400';
      default:
        return 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30 dark:text-yellow-400';
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
    if (limit === -1) return 'text-green-600 dark:text-green-400';
    if (workflowCount >= limit) return 'text-red-600 dark:text-red-400';
    if (workflowCount >= limit * 0.8) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };
  if (loading) {
    return <div className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto p-6 max-w-7xl">
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.5
      }}>
          {/* Header */}
          <Card glowVariant="premium" enableGlowEffect={true} className="shadow-xl mb-8">
            <CardContent className="p-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center border border-border">
                    <Bot className="w-8 h-8 text-foreground" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold text-foreground mb-2">
                      Workflows
                    </h1>
                    <p className="text-muted-foreground text-lg">
                      Manage your automation workflows 
                      
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => navigate('/cloud-runner')} variant="outline" className="bg-secondary text-secondary-foreground hover:bg-secondary/80 px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-300">
                    <Cloud className="w-5 h-5 mr-2" />
                    New Cloud Runner
                  </Button>
                  <Button onClick={handleCreateWorkflow} className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-300">
                    <Plus className="w-5 h-5 mr-2" />
                    Create Workflow
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="workflows" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="workflows" className="flex items-center gap-2">
                <Bot className="w-4 h-4" />
                N8N Workflows ({workflows.length})
              </TabsTrigger>
              <TabsTrigger value="cloud-runner" className="flex items-center gap-2">
                <Cloud className="w-4 h-4" />
                Cloud Runner ({cloudProjects.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="workflows" className="space-y-6">
              {workflows.length === 0 ? <Card glowVariant="primary" enableGlowEffect={false} className="shadow-lg hover:shadow-xl transition-all duration-300 glow-border">
                  <CardContent className="text-center py-16">
                    <motion.div initial={{
                  scale: 0.9,
                  opacity: 0
                }} animate={{
                  scale: 1,
                  opacity: 1
                }} transition={{
                  duration: 0.5,
                  delay: 0.2
                }}>
                      <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6 border border-border">
                        <Bot className="w-10 h-10 text-foreground" />
                      </div>
                      <h3 className="text-2xl font-bold text-foreground mb-3">
                        No workflows yet
                      </h3>
                      <p className="text-muted-foreground mb-8 text-lg">
                        Create your first workflow to get started with automation
                      </p>
                      <Button onClick={handleCreateWorkflow} className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3 shadow-lg hover:shadow-xl transition-all duration-300">
                        <Plus className="w-5 h-5 mr-2" />
                        Create Your First Workflow
                      </Button>
                    </motion.div>
                  </CardContent>
                </Card> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {workflows.map((workflow, index) => <motion.div key={workflow.id} initial={{
                opacity: 0,
                y: 20
              }} animate={{
                opacity: 1,
                y: 0
              }} transition={{
                duration: 0.5,
                delay: index * 0.1
              }}>
                      <Card glowVariant="primary" enableGlowEffect={true} className="shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 glow-border">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-xl mb-2 text-card-foreground font-bold">
                                {workflow.name}
                              </CardTitle>
                              <CardDescription className="text-muted-foreground">
                                {workflow.description}
                              </CardDescription>
                            </div>
                            <Badge className={`${getStatusColor(workflow.status)} flex items-center gap-2 px-3 py-1 border text-sm font-medium`}>
                              {getStatusIcon(workflow.status)}
                              <span className="capitalize">{workflow.status}</span>
                            </Badge>
                          </div>
                        </CardHeader>
                        
                        <CardContent>
                          <div className="space-y-4">
                            <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
                              <div className="text-sm text-muted-foreground space-y-1">
                                <div className="flex justify-between">
                                  <span>Created:</span>
                                  <span className="font-medium">{formatDate(workflow.created_at)}</span>
                                </div>
                                {workflow.updated_at && <div className="flex justify-between">
                                    <span>Updated:</span>
                                    <span className="font-medium">{formatDate(workflow.updated_at)}</span>
                                  </div>}
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Button variant="outline" size="sm" onClick={() => handleEditWorkflow(workflow.id)} className="flex-1 bg-muted/10 border-border hover:bg-muted/20 transition-all duration-300">
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </Button>
                              
                              <Button variant="outline" size="sm" onClick={() => handleDeleteWorkflow(workflow.id)} className="bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20 hover:border-destructive/50 transition-all duration-300">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                              
                              {workflow.deployment_url && <Button variant="outline" size="sm" onClick={() => window.open(workflow.deployment_url, '_blank')} className="bg-muted/10 border-border hover:bg-muted/20 transition-all duration-300">
                                  <ExternalLink className="w-4 h-4" />
                                </Button>}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>)}
                </div>}
            </TabsContent>

            <TabsContent value="cloud-runner" className="space-y-6">
              {cloudProjects.length === 0 ? <Card glowVariant="primary" enableGlowEffect={false} className="shadow-lg hover:shadow-xl transition-all duration-300 glow-border">
                  <CardContent className="text-center py-16">
                    <motion.div initial={{
                  scale: 0.9,
                  opacity: 0
                }} animate={{
                  scale: 1,
                  opacity: 1
                }} transition={{
                  duration: 0.5,
                  delay: 0.2
                }}>
                      <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6 border border-border">
                        <Cloud className="w-10 h-10 text-foreground" />
                      </div>
                      <h3 className="text-2xl font-bold text-foreground mb-3">
                        No cloud projects yet
                      </h3>
                      <p className="text-muted-foreground mb-8 text-lg">
                        Create your first Python automation project
                      </p>
                      <Button onClick={() => navigate('/cloud-runner')} className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3 shadow-lg hover:shadow-xl transition-all duration-300">
                        <Cloud className="w-5 h-5 mr-2" />
                        Create Your First Project
                      </Button>
                    </motion.div>
                  </CardContent>
                </Card> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {cloudProjects.map((project, index) => <motion.div key={project.id} initial={{
                opacity: 0,
                y: 20
              }} animate={{
                opacity: 1,
                y: 0
              }} transition={{
                duration: 0.5,
                delay: index * 0.1
              }}>
                      <Card glowVariant="primary" enableGlowEffect={true} className="shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 glow-border">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-xl mb-2 text-card-foreground font-bold">
                                {project.project_name}
                              </CardTitle>
                              <CardDescription className="text-muted-foreground">
                                Python automation project
                              </CardDescription>
                            </div>
                            <Badge className={`${getStatusColor(project.deployment_status)} flex items-center gap-2 px-3 py-1 border text-sm font-medium`}>
                              {getStatusIcon(project.deployment_status)}
                              <span className="capitalize">{project.deployment_status}</span>
                            </Badge>
                          </div>
                        </CardHeader>
                        
                        <CardContent>
                          <div className="space-y-4">
                            <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
                              <div className="text-sm text-muted-foreground space-y-1">
                                <div className="flex justify-between">
                                  <span>Created:</span>
                                  <span className="font-medium">{formatDate(project.created_at)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Updated:</span>
                                  <span className="font-medium">{formatDate(project.updated_at)}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Button variant="outline" size="sm" onClick={() => handleEditCloudProject(project.id)} className="flex-1 bg-muted/10 border-border hover:bg-muted/20 transition-all duration-300">
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </Button>
                              
                              <Button variant="outline" size="sm" onClick={() => handleDeleteCloudProject(project.id)} className="bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20 hover:border-destructive/50 transition-all duration-300">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                              
                              {project.github_repo_url && <Button variant="outline" size="sm" onClick={() => window.open(project.github_repo_url, '_blank')} className="bg-muted/10 border-border hover:bg-muted/20 transition-all duration-300">
                                  <ExternalLink className="w-4 h-4" />
                                </Button>}

                              {project.render_service_url && <Button variant="outline" size="sm" onClick={() => window.open(project.render_service_url, '_blank')} className="bg-muted/10 border-border hover:bg-muted/20 transition-all duration-300">
                                  <Cloud className="w-4 h-4" />
                                </Button>}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>)}
                </div>}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>;
};
export default Workflows;