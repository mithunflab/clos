
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Plus, Play, Settings, GitBranch, Zap, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWorkflowStorageV2 } from '@/hooks/useWorkflowStorageV2';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/DashboardLayout';
import { GlowingEffect } from '@/components/ui/glowing-effect';

interface WorkflowSummary {
  id: string;
  name: string;
  created_at: string;
  nodes_count?: number;
  status?: 'active' | 'inactive' | 'draft';
  last_run?: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const { loadWorkflowsList } = useWorkflowStorageV2();
  const { user } = useAuth();

  useEffect(() => {
    const fetchWorkflows = async () => {
      try {
        const result = await loadWorkflowsList();
        if (result.success && result.workflows) {
          setWorkflows(result.workflows);
        }
      } catch (error) {
        console.error('Failed to load workflows:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchWorkflows();
    }
  }, [user, loadWorkflowsList]);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'inactive':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-3 h-3" />;
      case 'inactive':
        return <Clock className="w-3 h-3" />;
      default:
        return <AlertCircle className="w-3 h-3" />;
    }
  };

  const handleCreateWorkflow = () => {
    navigate('/playground');
  };

  const handleOpenWorkflow = (workflow: WorkflowSummary) => {
    navigate(`/playground?id=${workflow.id}`);
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Welcome back to <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">CASEL</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              Manage your AI-powered workflows and automations
            </p>
          </div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="relative"
          >
            <div className="absolute inset-0 pointer-events-none">
              <GlowingEffect
                blur={15}
                proximity={80}
                spread={60}
                className="rounded-lg"
                disabled={false}
              />
            </div>
            <Button
              onClick={handleCreateWorkflow}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-8 py-3 relative"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Workflow
            </Button>
          </motion.div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6"
        >
          {[
            { title: 'Total Workflows', value: workflows.length, icon: GitBranch, color: 'text-blue-400' },
            { title: 'Active', value: workflows.filter(w => w.status === 'active').length, icon: Play, color: 'text-green-400' },
            { title: 'Draft', value: workflows.filter(w => w.status === 'draft').length, icon: Settings, color: 'text-yellow-400' },
            { title: 'This Month', value: workflows.filter(w => {
              const created = new Date(w.created_at);
              const now = new Date();
              return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
            }).length, icon: Zap, color: 'text-purple-400' }
          ].map((stat, index) => (
            <div key={stat.title} className="relative">
              <div className="absolute inset-0 pointer-events-none">
                <GlowingEffect
                  blur={10}
                  proximity={60}
                  spread={40}
                  className="rounded-xl"
                  disabled={false}
                />
              </div>
              <Card className="relative bg-card/50 backdrop-blur-xl border-border/50 hover:bg-card/60 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        {stat.title}
                      </p>
                      <p className="text-3xl font-bold text-card-foreground">
                        {stat.value}
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg bg-muted/20 ${stat.color}`}>
                      <stat.icon className="w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </motion.div>

        {/* Workflows Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-foreground">Your Workflows</h2>
            <Button variant="outline" className="border-border/50 hover:bg-muted/50">
              View All
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="relative">
                  <div className="absolute inset-0 pointer-events-none">
                    <GlowingEffect
                      blur={8}
                      proximity={50}
                      spread={30}
                      className="rounded-xl"
                      disabled={false}
                    />
                  </div>
                  <Card className="relative bg-card/30 backdrop-blur-xl border-border/30 animate-pulse">
                    <CardContent className="p-6 space-y-4">
                      <div className="h-4 bg-muted/30 rounded w-3/4"></div>
                      <div className="h-3 bg-muted/20 rounded w-1/2"></div>
                      <div className="h-8 bg-muted/20 rounded w-full"></div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          ) : workflows.length === 0 ? (
            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              className="relative"
            >
              <div className="absolute inset-0 pointer-events-none">
                <GlowingEffect
                  blur={12}
                  proximity={70}
                  spread={50}
                  className="rounded-xl"
                  disabled={false}
                />
              </div>
              <Card className="relative bg-card/30 backdrop-blur-xl border-border/30 border-dashed">
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-muted/20 rounded-full flex items-center justify-center">
                    <Plus className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold text-card-foreground mb-2">
                    No workflows yet
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Get started by creating your first AI-powered workflow. Our assistant will guide you through the process.
                  </p>
                  <Button onClick={handleCreateWorkflow} className="bg-primary hover:bg-primary/90">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Workflow
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workflows.map((workflow, index) => (
                <motion.div
                  key={workflow.id}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="relative cursor-pointer"
                  onClick={() => handleOpenWorkflow(workflow)}
                >
                  <div className="absolute inset-0 pointer-events-none">
                    <GlowingEffect
                      blur={8}
                      proximity={50}
                      spread={30}
                      className="rounded-xl"
                      disabled={false}
                    />
                  </div>
                  <Card className="relative bg-card/50 backdrop-blur-xl border-border/50 hover:bg-card/60 transition-all duration-300 h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg font-semibold text-card-foreground line-clamp-1">
                          {workflow.name}
                        </CardTitle>
                        <Badge 
                          variant="outline" 
                          className={`ml-2 flex items-center gap-1 ${getStatusColor(workflow.status)}`}
                        >
                          {getStatusIcon(workflow.status)}
                          {workflow.status || 'draft'}
                        </Badge>
                      </div>
                      <CardDescription className="text-muted-foreground">
                        Created {new Date(workflow.created_at).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {workflow.nodes_count || 0} nodes
                        </span>
                        {workflow.last_run && (
                          <span className="text-muted-foreground">
                            Last run: {new Date(workflow.last_run).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
