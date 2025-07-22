
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Workflow, Zap, Clock, TrendingUp, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useWorkflowStorageV2 } from '@/hooks/useWorkflowStorageV2';
import { useUserPlan } from '@/hooks/useUserPlan';
import { GlowingEffectDemo } from '@/components/GlowingEffectDemo';

const StatCard = ({
  icon,
  title,
  value,
  subtitle,
  glowVariant = 'primary'
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
  glowVariant?: 'primary' | 'secondary' | 'accent' | 'default';
}) => {
  return (
    <Card glowVariant={glowVariant} enableGlowEffect={false} className="transition-all duration-300 hover:scale-105">
      <CardContent className="p-6">
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl flex items-center justify-center border border-primary/20">
            {icon}
          </div>
          <div>
            <h3 className="text-card-foreground font-semibold text-lg">{title}</h3>
            <p className="text-muted-foreground text-sm">{subtitle}</p>
          </div>
        </div>
        <div className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">{value}</div>
      </CardContent>
    </Card>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { getUserWorkflows } = useWorkflowStorageV2();
  const { plan, credits } = useUserPlan();
  const [workflowStats, setWorkflowStats] = useState({
    total: 0,
    active: 0
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const workflows = await getUserWorkflows();
        setWorkflowStats({
          total: workflows.length,
          active: workflows.length // Assuming all workflows are active for now
        });
      } catch (error) {
        console.error('Error loading workflow stats:', error);
      }
    };
    loadStats();
  }, [getUserWorkflows]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-7xl mx-auto"
        >
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent mb-2">
              Welcome back
            </h1>
            <p className="text-muted-foreground text-lg">Monitor and manage your autonomous workflows</p>
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <Button
              className="bg-gradient-to-r from-primary to-secondary text-white hover:from-primary/90 hover:to-secondary/90 px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-300"
              onClick={() => navigate('/playground')}
            >
              <Plus className="w-5 h-5 mr-2" />
              Create New Workflow
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              icon={<Workflow className="w-6 h-6 text-primary" />}
              title="Total Workflows"
              value={workflowStats.total.toString()}
              subtitle="Created workflows"
              glowVariant="primary"
            />
            <StatCard
              icon={<Zap className="w-6 h-6 text-secondary" />}
              title="Active Workflows"
              value={workflowStats.active.toString()}
              subtitle="Currently running"
              glowVariant="secondary"
            />
            <StatCard
              icon={<Clock className="w-6 h-6 text-accent" />}
              title="Credits Remaining"
              value={credits?.current_credits?.toString() || '0'}
              subtitle={`${plan?.plan_type || 'free'} plan`}
              glowVariant="accent"
            />
            <StatCard
              icon={<TrendingUp className="w-6 h-6 text-primary" />}
              title="Plan Type"
              value={plan?.plan_type?.toUpperCase() || 'FREE'}
              subtitle="Current subscription"
              glowVariant="default"
            />
          </div>

          {/* Premium Features Showcase */}
          <Card glowVariant="premium" enableGlowEffect={true} className="mb-8 p-8">
            <CardHeader className="pb-6">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Premium Features
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <GlowingEffectDemo />
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card glowVariant="primary" className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-card-foreground">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  onClick={() => navigate('/workflows')}
                  className="justify-start h-12 text-base rounded-xl font-medium border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300"
                >
                  <Workflow className="w-5 h-5 mr-3 text-primary" />
                  View All Workflows
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/playground')}
                  className="justify-start h-12 rounded-xl border-secondary/20 hover:border-secondary/40 hover:bg-secondary/5 transition-all duration-300"
                >
                  <Plus className="w-5 h-5 mr-3 text-secondary" />
                  Create New Workflow
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
