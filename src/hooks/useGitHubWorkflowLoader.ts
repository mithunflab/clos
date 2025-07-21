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

      // Try multiple possible file locations and branch names
      const possiblePaths = [
        `https://raw.githubusercontent.com/${owner}/${repo}/main/workflow.json`,
        `https://raw.githubusercontent.com/${owner}/${repo}/master/workflow.json`,
        `https://raw.githubusercontent.com/${owner}/${repo}/main/src/workflow.json`,
        `https://raw.githubusercontent.com/${owner}/${repo}/master/src/workflow.json`
      ];

      let workflowContent = null;
      let lastError = null;

      for (const rawUrl of possiblePaths) {
        try {
          console.log('📥 Trying to fetch from:', rawUrl);
          const response = await fetch(rawUrl);
          
          if (response.ok) {
            workflowContent = await response.json();
            console.log('✅ Workflow loaded successfully from GitHub:', workflowContent);
            break;
          } else {
            console.log(`❌ Failed to fetch from ${rawUrl}: ${response.status}`);
            lastError = `Failed to load workflow from GitHub: ${response.status}`;
          }
        } catch (fetchError) {
          console.log(`❌ Error fetching from ${rawUrl}:`, fetchError);
          lastError = fetchError instanceof Error ? fetchError.message : 'Network error';
        }
      }

      if (!workflowContent) {
        // If no workflow.json found, return empty structure but don't throw error
        console.log('⚠️ No workflow.json found, returning empty workflow structure');
        return {
          success: false,
          workflowData: { nodes: [], connections: {} },
          workflow: { nodes: [], connections: {} },
          chat: [],
          nodes: [],
          connections: {},
          metadata: {},
          error: 'Workflow file not found in repository'
        };
      }

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
      
      // Return empty structure instead of throwing
      return {
        success: false,
        workflowData: { nodes: [], connections: {} },
        workflow: { nodes: [], connections: {} },
        chat: [],
        nodes: [],
        connections: {},
        metadata: {},
        error: errorMessage
      };
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