
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface WorkflowData {
  id: string;
  user_id: string;
  workflow_id: string;
  workflow_name: string;
  workflow_json: any;
  created_at: string;
  updated_at: string;
}

export const useWorkflowStorageV2 = () => {
  const [workflows, setWorkflows] = useState<WorkflowData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchWorkflows = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('workflow_data')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setWorkflows(data || []);
    } catch (err) {
      console.error('Error fetching workflows:', err);
      setError(err instanceof Error ? err.message : 'Failed to load workflows');
    } finally {
      setLoading(false);
    }
  };

  const saveWorkflow = async (workflowId: string, workflowName: string, workflowJson: any) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('workflow_data')
        .upsert({
          user_id: user.id,
          workflow_id: workflowId,
          workflow_name: workflowName,
          workflow_json: workflowJson
        })
        .select()
        .single();

      if (error) throw error;
      await fetchWorkflows();
      return data;
    } catch (err) {
      console.error('Error saving workflow:', err);
      setError(err instanceof Error ? err.message : 'Failed to save workflow');
      return null;
    }
  };

  const deployWorkflow = async (workflowId: string) => {
    if (!user) return { success: false, error: 'User not authenticated' };

    try {
      const workflow = workflows.find(w => w.workflow_id === workflowId);
      if (!workflow) {
        return { success: false, error: 'Workflow not found' };
      }

      const { data, error } = await supabase.functions.invoke('generate-n8n-workflow', {
        body: {
          workflow: workflow.workflow_json,
          workflowId: workflowId,
          userId: user.id
        }
      });

      if (error) throw error;
      
      if (data?.success) {
        await fetchWorkflows();
        return { 
          success: true, 
          workflowId: data.workflowId,
          deploymentUrl: data.deploymentUrl 
        };
      } else {
        return { success: false, error: data?.error || 'Deployment failed' };
      }
    } catch (err) {
      console.error('Error deploying workflow:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to deploy workflow' };
    }
  };

  const getWorkflow = (workflowId: string) => {
    return workflows.find(workflow => workflow.workflow_id === workflowId);
  };

  const getWorkflowDeploymentInfo = (workflowId: string) => {
    const workflow = workflows.find(w => w.workflow_id === workflowId);
    return {
      deploymentStatus: 'not-deployed',
      n8nWorkflowId: null,
      n8nUrl: null,
      createdAt: workflow?.created_at || null,
      updatedAt: workflow?.updated_at || null
    };
  };

  useEffect(() => {
    fetchWorkflows();
  }, [user]);

  return {
    workflows,
    loading,
    error,
    saveWorkflow,
    deployWorkflow,
    getWorkflow,
    getWorkflowDeploymentInfo,
    refetch: fetchWorkflows
  };
};
