
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Workflow, Zap, Clock, TrendingUp, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useWorkflowStorageV2 } from '@/hooks/useWorkflowStorageV2';
import { useUserPlan } from '@/hooks/useUserPlan';
import { GlowingEffect } from '@/components/ui/glowing-effect';

const StatCard = ({
  icon,
  title,
  value,
  subtitle
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
}) => {
  return (
    <div className="relative min-h-[8rem]">
      <div className="relative h-full rounded-[1.25rem] border-[0.75px] border-border p-2">
        <GlowingEffect
          spread={40}
          glow={true}
          disabled={false}
          proximity={64}
          inactiveZone={0.01}
          borderWidth={2}
        />
        <div className="relative h-full bg-card backdrop-blur-sm border border-border rounded-2xl p-6 hover:bg-card/80 transition-all duration-300">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center">
              {icon}
            </div>
            <div>
              <h3 className="text-card-foreground font-semibold text-lg">{title}</h3>
              <p className="text-muted-foreground text-sm">{subtitle}</p>
            </div>
          </div>
          <div className="text-3xl font-bold text-card-foreground">{value}</div>
        </div>
      </div>
    </div>
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
      <div className="relative z-10 p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-7xl mx-auto"
        >
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">Welcome back</h1>
            <p className="text-muted-foreground text-lg">Monitor and manage your autonomous workflows</p>
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3"
              onClick={() => navigate('/playground')}
            >
              <Plus className="w-5 h-5 mr-2" />
              Create New Workflow
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              icon={<Workflow className="w-6 h-6 text-foreground" />}
              title="Total Workflows"
              value={workflowStats.total.toString()}
              subtitle="Created workflows"
            />
            <StatCard
              icon={<Zap className="w-6 h-6 text-foreground" />}
              title="Active Workflows"
              value={workflowStats.active.toString()}
              subtitle="Currently running"
            />
            <StatCard
              icon={<Clock className="w-6 h-6 text-foreground" />}
              title="Credits Remaining"
              value={credits?.current_credits?.toString() || '0'}
              subtitle={`${plan?.plan_type || 'free'} plan`}
            />
            <StatCard
              icon={<TrendingUp className="w-6 h-6 text-foreground" />}
              title="Plan Type"
              value={plan?.plan_type?.toUpperCase() || 'FREE'}
              subtitle="Current subscription"
            />
          </div>

          {/* Quick Links */}
          <div className="relative">
            <div className="relative rounded-[1.25rem] border-[0.75px] border-border p-2">
              <GlowingEffect
                spread={40}
                glow={true}
                disabled={false}
                proximity={64}
                inactiveZone={0.01}
                borderWidth={2}
              />
              <div className="relative bg-card backdrop-blur-sm border border-border rounded-2xl p-6">
                <h2 className="text-2xl font-bold text-card-foreground mb-6">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    onClick={() => navigate('/workflows')}
                    className="justify-start h-12 text-base rounded-2xl font-medium"
                  >
                    <Workflow className="w-5 h-5 mr-3" />
                    View All Workflows
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/playground')}
                    className="justify-start h-12 rounded-2xl"
                  >
                    <Plus className="w-5 h-5 mr-3" />
                    Create New Workflow
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
