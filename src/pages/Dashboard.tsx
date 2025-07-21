
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Workflow, Zap, Clock, TrendingUp, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useGitHubIntegration } from '@/hooks/useGitHubIntegration';
import { useUserPlan } from '@/hooks/useUserPlan';

const StatCard = ({ icon, title, value, subtitle }: { 
  icon: React.ReactNode; 
  title: string; 
  value: string; 
  subtitle: string; 
}) => {
  return (
    <div className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-black/40 transition-all duration-300">
      <div className="flex items-center space-x-4 mb-4">
        <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
          {icon}
        </div>
        <div>
          <h3 className="text-white font-semibold text-lg">{title}</h3>
          <p className="text-white/60 text-sm">{subtitle}</p>
        </div>
      </div>
      <div className="text-3xl font-bold text-white">{value}</div>
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { getUserWorkflows } = useGitHubIntegration();
  const { plan } = useUserPlan();
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
    <div className="min-h-screen bg-transparent text-white">
      <div className="relative z-10 p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-7xl mx-auto"
        >
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Welcome back</h1>
            <p className="text-white/70 text-lg">Monitor and manage your autonomous workflows</p>
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <Button 
              className="bg-white text-black hover:bg-white/90 px-6 py-3"
              onClick={() => navigate('/playground')}
            >
              <Plus className="w-5 h-5 mr-2" />
              Create New Workflow
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              icon={<Workflow className="w-6 h-6 text-white" />}
              title="Total Workflows"
              value={workflowStats.total.toString()}
              subtitle="Created workflows"
            />
            <StatCard
              icon={<Zap className="w-6 h-6 text-white" />}
              title="Active Workflows"
              value={workflowStats.active.toString()}
              subtitle="Currently running"
            />
            <StatCard
              icon={<Clock className="w-6 h-6 text-white" />}
              title="Credits Remaining"
              value={plan?.credits?.toString() || '0'}
              subtitle={`Out of ${plan?.max_credits || 0}`}
            />
            <StatCard
              icon={<TrendingUp className="w-6 h-6 text-white" />}
              title="Plan Type"
              value={plan?.plan_type?.toUpperCase() || 'FREE'}
              subtitle="Current subscription"
            />
          </div>

          {/* Quick Links */}
          <div className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 justify-start h-12"
                onClick={() => navigate('/workflows')}
              >
                <Workflow className="w-5 h-5 mr-3" />
                View All Workflows
              </Button>
              <Button
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 justify-start h-12"
                onClick={() => navigate('/playground')}
              >
                <Plus className="w-5 h-5 mr-3" />
                Create New Workflow
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
