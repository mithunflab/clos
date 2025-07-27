
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

interface ProjectFile {
  fileName: string;
  content: string;
  language: string;
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
    files: ProjectFile[]
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
        return { success: false, error: `Edge function error: ${error.message}` };
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

  const deployToRender = useCallback(async (
    projectId: string,
    projectName: string,
    githubRepoUrl: string
  ): Promise<{ success: boolean; error?: string; serviceId?: string; serviceUrl?: string }> => {
    if (!user) return { success: false, error: 'User not authenticated' };

    try {
      setLoading(true);

      console.log('Deploying to Render with:', { projectId, projectName, githubRepoUrl });

      const { data, error } = await supabase.functions.invoke('cloud-runner-manager', {
        body: {
          action: 'deploy-to-render',
          projectId,
          projectName,
          githubRepoUrl
        }
      });

      if (error) {
        console.error('Deploy to Render error:', error);
        return { success: false, error: `Edge function error: ${error.message} - ${error.details || ''}` };
      }

      console.log('Deploy response data:', data);

      if (data?.success) {
        return { 
          success: true, 
          serviceId: data.serviceId,
          serviceUrl: data.serviceUrl
        };
      } else {
        return { 
          success: false, 
          error: data?.error || 'Failed to deploy to Render' 
        };
      }
    } catch (error) {
      console.error('Error deploying to Render:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to deploy to Render' 
      };
    } finally {
      setLoading(false);
    }
  }, [user]);

  const redeployProject = useCallback(async (
    projectId: string
  ): Promise<{ success: boolean; error?: string; deployId?: string }> => {
    if (!user) return { success: false, error: 'User not authenticated' };

    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('cloud-runner-manager', {
        body: {
          action: 'redeploy-project',
          projectId
        }
      });

      if (error) {
        console.error('Redeploy error:', error);
        return { success: false, error: error.message };
      }

      if (data?.success) {
        return { 
          success: true, 
          deployId: data.deployId 
        };
      } else {
        return { 
          success: false, 
          error: data?.error || 'Failed to redeploy project' 
        };
      }
    } catch (error) {
      console.error('Error redeploying project:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to redeploy project' 
      };
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadExistingProject = useCallback(async (
    projectId: string
  ): Promise<{ success: boolean; error?: string; project?: CloudRunnerProject; files?: ProjectFile[] }> => {
    if (!user) return { success: false, error: 'User not authenticated' };

    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('cloud-runner-manager', {
        body: {
          action: 'load-existing-project',
          projectId
        }
      });

      if (error) {
        console.error('Load project error:', error);
        return { success: false, error: error.message };
      }

      if (data?.success) {
        return { 
          success: true, 
          project: data.project,
          files: data.files || []
        };
      } else {
        return { 
          success: false, 
          error: data?.error || 'Failed to load project' 
        };
      }
    } catch (error) {
      console.error('Error loading project:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to load project' 
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

  const testRenderAPI = useCallback(async (): Promise<{ success: boolean; error?: string; details?: any }> => {
    if (!user) return { success: false, error: 'User not authenticated' };

    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('cloud-runner-manager', {
        body: {
          action: 'test-render-api'
        }
      });

      if (error) {
        console.error('Test Render API error:', error);
        return { success: false, error: `Test failed: ${error.message}`, details: error };
      }

      console.log('Test Render API response:', data);
      return { 
        success: data?.success || false, 
        error: data?.error,
        details: data
      };
    } catch (error) {
      console.error('Error testing Render API:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to test Render API' 
      };
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    loading,
    getUserProjects,
    createProject,
    updateProject,
    deleteProject,
    syncToGithub,
    deployToRender,
    redeployProject,
    loadExistingProject,
    getDeploymentStatus,
    getDeploymentLogs,
    testRenderAPI
  };
};
