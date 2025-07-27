
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

export const useWorkflowStorage = () => {
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
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('workflow_data')
        .upsert({
          user_id: user.id,
          workflow_id: workflowId,
          workflow_name: workflowName,
          workflow_json: workflowJson
        });

      if (error) throw error;
      await fetchWorkflows();
      return true;
    } catch (err) {
      console.error('Error saving workflow:', err);
      setError(err instanceof Error ? err.message : 'Failed to save workflow');
      return false;
    }
  };

  const getWorkflow = (workflowId: string) => {
    return workflows.find(workflow => workflow.workflow_id === workflowId);
  };

  useEffect(() => {
    fetchWorkflows();
  }, [user]);

  return {
    workflows,
    loading,
    error,
    saveWorkflow,
    getWorkflow,
    refetch: fetchWorkflows
  };
};
