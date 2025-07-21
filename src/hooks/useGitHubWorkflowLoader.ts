import { useState } from 'react';
import { useAuth } from './useAuth';

export const useGitHubWorkflowLoader = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const loadWorkflowFromGitHub = async (githubRepoUrl: string, githubRepoName: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Loading workflow directly from GitHub...', { githubRepoUrl, githubRepoName });

      // Extract owner and repo from URL
      const urlParts = githubRepoUrl.split('/');
      const owner = urlParts[urlParts.length - 2];
      const repo = urlParts[urlParts.length - 1];

      // Fetch workflow.json directly from GitHub's raw content API
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/workflow.json`;
      
      console.log('📥 Fetching from:', rawUrl);

      const response = await fetch(rawUrl);
      
      if (!response.ok) {
        console.error('❌ Failed to fetch workflow from GitHub:', response.status, response.statusText);
        throw new Error(`Failed to load workflow from GitHub: ${response.status}`);
      }

      const workflowContent = await response.json();
      
      console.log('✅ Workflow loaded successfully from GitHub:', workflowContent);

      return {
        success: true,
        workflowData: workflowContent.workflow || workflowContent,
        workflow: workflowContent.workflow || workflowContent,
        chat: workflowContent.chat || [],
        nodes: workflowContent.nodes || [],
        connections: workflowContent.connections || {},
        metadata: workflowContent.metadata || {}
      };

    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load workflow from GitHub';
      console.error('❌ GitHub workflow load failed:', errorMessage);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    loadWorkflowFromGitHub
  };
};