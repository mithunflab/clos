
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface WorkflowData {
  name: string;
  workflow: any;
  chat?: any[];
}

export const useGitHubIntegration = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const createWorkflowRepository = async (workflowData: WorkflowData, workflowId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      setLoading(true);
      setError(null);

      console.log('🚀 Creating workflow repository...', { workflowId, workflowName: workflowData.name });

      const { data, error } = await supabase.functions.invoke('github-manager', {
        body: {
          action: 'create-repo',
          workflowData,
          workflowId
        }
      });

      if (error) {
        console.error('❌ Supabase function error:', error);
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to create repository');
      }

      console.log('✅ Repository created successfully:', data);
      return data;
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create repository';
      console.error('❌ GitHub repository creation failed:', errorMessage);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateWorkflow = async (workflowData: WorkflowData, workflowId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Updating workflow...', { workflowId, workflowName: workflowData.name });

      const { data, error } = await supabase.functions.invoke('github-manager', {
        body: {
          action: 'update-workflow',
          workflowData,
          workflowId
        }
      });

      if (error) {
        console.error('❌ Supabase function error:', error);
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to update workflow');
      }

      console.log('✅ Workflow updated successfully:', data);
      return data;
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update workflow';
      console.error('❌ GitHub workflow update failed:', errorMessage);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkflow = async (workflowId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      setLoading(true);
      setError(null);

      console.log('📥 Loading workflow from GitHub...', { workflowId });

      const { data, error } = await supabase.functions.invoke('github-manager', {
        body: {
          action: 'load-workflow',
          workflowId
        }
      });

      if (error) {
        console.error('❌ Supabase function error:', error);
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to load workflow');
      }

      console.log('✅ Workflow loaded successfully:', data);
      return data;
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load workflow';
      console.error('❌ GitHub workflow load failed:', errorMessage);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getUserWorkflows = async () => {
    if (!user) return [];

    try {
      console.log('📋 Fetching user workflows from database...');
      
      const { data, error } = await supabase
        .from('user_workflows')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Database error fetching workflows:', error);
        throw error;
      }

      console.log('✅ Successfully fetched workflows:', data?.length || 0);
      return data || [];
    } catch (err) {
      console.error('❌ Error fetching user workflows:', err);
      return [];
    }
  };

  return {
    loading,
    error,
    createWorkflowRepository,
    updateWorkflow,
    loadWorkflow,
    getUserWorkflows
  };
};
