
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useCredentialStorage = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const saveCredentialsToStorage = useCallback(async (
    nodeId: string, 
    nodeType: string, 
    credentials: Record<string, any>,
    workflowId?: string
  ) => {
    if (!user) {
      console.warn('⚠️ No user found, cannot save credentials');
      return false;
    }

    try {
      setLoading(true);
      console.log('💾 Saving credentials to storage...', { nodeId, nodeType });

      // Save to localStorage as backup
      const credentialKey = `credentials_${nodeId}_${user.id}`;
      localStorage.setItem(credentialKey, JSON.stringify(credentials));

      // If workflowId is provided, update the workflow file in storage
      if (workflowId) {
        const bucketName = `user-workflows-${user.id}`;
        const workflowFileName = `${workflowId}.json`;

        try {
          // Download existing workflow file
          const { data: existingFile, error: downloadError } = await supabase.storage
            .from(bucketName)
            .download(workflowFileName);

          if (!downloadError && existingFile) {
            const existingContent = await existingFile.text();
            const workflowData = JSON.parse(existingContent);

            // Update the specific node's credentials in the workflow
            if (workflowData.workflow && workflowData.workflow.nodes) {
              workflowData.workflow.nodes = workflowData.workflow.nodes.map((node: any) => {
                if (node.id === nodeId) {
                  return {
                    ...node,
                    credentialData: credentials // Store credentials in the node
                  };
                }
                return node;
              });

              // Update metadata
              workflowData.metadata = {
                ...workflowData.metadata,
                updatedAt: new Date().toISOString()
              };

              // Re-upload the updated workflow file
              const updatedBlob = new Blob([JSON.stringify(workflowData, null, 2)], {
                type: 'application/json'
              });

              const { error: uploadError } = await supabase.storage
                .from(bucketName)
                .upload(workflowFileName, updatedBlob, {
                  upsert: true,
                  contentType: 'application/json'
                });

              if (uploadError) {
                console.error('❌ Failed to update workflow file:', uploadError);
              } else {
                console.log('✅ Workflow file updated with credentials');
              }
            }
          }
        } catch (storageError) {
          console.warn('⚠️ Could not update workflow file, but localStorage saved:', storageError);
        }
      }

      console.log('✅ Credentials saved successfully');
      return true;

    } catch (error) {
      console.error('❌ Error saving credentials:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadCredentialsFromStorage = useCallback((nodeId: string) => {
    if (!user) {
      console.warn('⚠️ No user found, cannot load credentials');
      return {};
    }

    try {
      const credentialKey = `credentials_${nodeId}_${user.id}`;
      const stored = localStorage.getItem(credentialKey);
      const credentials = stored ? JSON.parse(stored) : {};
      
      console.log('📥 Loaded credentials from storage:', { 
        nodeId, 
        credentialCount: Object.keys(credentials).length 
      });
      
      return credentials;
    } catch (error) {
      console.error('❌ Error loading credentials:', error);
      return {};
    }
  }, [user]);

  return {
    loading,
    saveCredentialsToStorage,
    loadCredentialsFromStorage
  };
};
