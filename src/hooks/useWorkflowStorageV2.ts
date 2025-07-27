
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface WorkflowData {
  name: string;
  nodes: any[];
  connections: any;
  chat?: any[];
}

export const useWorkflowStorageV2 = () => {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const saveWorkflow = useCallback(async (
    workflowId: string,
    workflowName: string,
    workflowData: WorkflowData
  ) => {
    if (!user) {
      toast.error('Please sign in to save workflows');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('workflows')
        .upsert({
          id: workflowId,
          user_id: user.id,
          name: workflowName,
          workflow_data: workflowData,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Workflow saved successfully:', data);
      return data;
    } catch (err: any) {
      console.error('❌ Error saving workflow:', err);
      setError(err.message);
      toast.error('Failed to save workflow');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadWorkflow = useCallback(async (workflowId: string) => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('id', workflowId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: false, error: 'Workflow not found' };
        }
        throw error;
      }

      const workflowData = typeof data.workflow_data === 'string' 
        ? JSON.parse(data.workflow_data) 
        : data.workflow_data;

      return {
        success: true,
        workflow: workflowData,
        chat: workflowData?.chat || []
      };
    } catch (err: any) {
      console.error('❌ Error loading workflow:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [user]);

  const deployWorkflow = useCallback(async (workflowId: string) => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      setLoading(true);
      setError(null);

      // Simulate deployment process
      await new Promise(resolve => setTimeout(resolve, 2000));

      return {
        success: true,
        message: 'Workflow deployed successfully'
      };
    } catch (err: any) {
      console.error('❌ Error deploying workflow:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateDeploymentStatus = useCallback(async (workflowId: string, status: string) => {
    // Implementation for updating deployment status
    console.log('Updating deployment status:', workflowId, status);
  }, []);

  return {
    workflows,
    loading,
    error,
    saveWorkflow,
    loadWorkflow,
    deployWorkflow,
    updateDeploymentStatus
  };
};
