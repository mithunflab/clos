
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface CloudRunnerProject {
  id: string;
  user_id: string;
  project_name: string;
  github_repo_name?: string;
  github_repo_url?: string;
  render_service_id?: string;
  render_service_url?: string;
  deployment_status: string;
  session_file_uploaded: boolean;
  created_at: string;
  updated_at: string;
}

export const useCloudRunnerProjects = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const getUserProjects = useCallback(async (): Promise<CloudRunnerProject[]> => {
    if (!user) return [];

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('cloud_runner_projects')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching projects:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching projects:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createProject = useCallback(async (
    projectName: string,
    githubRepoName?: string,
    githubRepoUrl?: string
  ): Promise<CloudRunnerProject | null> => {
    if (!user) return null;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('cloud_runner_projects')
        .insert({
          user_id: user.id,
          project_name: projectName,
          github_repo_name: githubRepoName,
          github_repo_url: githubRepoUrl,
          deployment_status: 'draft'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating project:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error creating project:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateProject = useCallback(async (
    projectId: string,
    updates: Partial<CloudRunnerProject>
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      setLoading(true);

      const { error } = await supabase
        .from('cloud_runner_projects')
        .update(updates)
        .eq('id', projectId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating project:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating project:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const deleteProject = useCallback(async (projectId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      setLoading(true);

      const { error } = await supabase
        .from('cloud_runner_projects')
        .delete()
        .eq('id', projectId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting project:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting project:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const syncToGithub = useCallback(async (
    projectId: string,
    repoName: string,
    files: any[]
  ): Promise<{ success: boolean; error?: string; syncedFiles?: number }> => {
    if (!user) return { success: false, error: 'User not authenticated' };

    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('cloud-runner-manager', {
        body: {
          action: 'sync-to-git',
          projectId,
          repoName,
          files
        }
      });

      if (error) {
        console.error('Sync to GitHub error:', error);
        return { success: false, error: error.message };
      }

      if (data?.success) {
        return { 
          success: true, 
          syncedFiles: data.syncedFiles 
        };
      } else {
        return { 
          success: false, 
          error: data?.error || 'Failed to sync to GitHub' 
        };
      }
    } catch (error) {
      console.error('Error syncing to GitHub:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to sync to GitHub' 
      };
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getDeploymentStatus = useCallback(async (
    serviceId: string
  ): Promise<{ success: boolean; status?: string; error?: string }> => {
    if (!user) return { success: false, error: 'User not authenticated' };

    try {
      const { data, error } = await supabase.functions.invoke('cloud-runner-manager', {
        body: {
          action: 'get-deployment-status',
          projectId: serviceId
        }
      });

      if (error) {
        console.error('Get deployment status error:', error);
        return { success: false, error: error.message };
      }

      if (data?.success) {
        return { 
          success: true, 
          status: data.status 
        };
      } else {
        return { 
          success: false, 
          error: data?.error || 'Failed to get deployment status' 
        };
      }
    } catch (error) {
      console.error('Error getting deployment status:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to get deployment status' 
      };
    }
  }, [user]);

  const getDeploymentLogs = useCallback(async (
    serviceId: string
  ): Promise<{ success: boolean; logs?: string; error?: string }> => {
    if (!user) return { success: false, error: 'User not authenticated' };

    try {
      const { data, error } = await supabase.functions.invoke('cloud-runner-manager', {
        body: {
          action: 'get-deployment-logs',
          projectId: serviceId
        }
      });

      if (error) {
        console.error('Get deployment logs error:', error);
        return { success: false, error: error.message };
      }

      if (data?.success) {
        return { 
          success: true, 
          logs: data.logs 
        };
      } else {
        return { 
          success: false, 
          error: data?.error || 'Failed to get deployment logs' 
        };
      }
    } catch (error) {
      console.error('Error getting deployment logs:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to get deployment logs' 
      };
    }
  }, [user]);

  return {
    loading,
    getUserProjects,
    createProject,
    updateProject,
    deleteProject,
    syncToGithub,
    getDeploymentStatus,
    getDeploymentLogs
  };
};
