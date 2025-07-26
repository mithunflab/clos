
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

  return {
    loading,
    getUserProjects,
    createProject,
    updateProject,
    deleteProject
  };
};
