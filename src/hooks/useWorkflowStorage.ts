
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface WorkflowData {
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchWorkflows = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('workflow_data' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

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
        .from('workflow_data' as any)
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

  const deleteWorkflow = async (workflowId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('workflow_data' as any)
        .delete()
        .eq('user_id', user.id)
        .eq('workflow_id', workflowId);

      if (error) throw error;
      
      await fetchWorkflows();
      return true;
    } catch (err) {
      console.error('Error deleting workflow:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete workflow');
      return false;
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, [user]);

  return {
    workflows,
    loading,
    error,
    saveWorkflow,
    deleteWorkflow,
    refetch: fetchWorkflows
  };
};
