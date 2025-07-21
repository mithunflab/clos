import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useUserPlan } from './useUserPlan';

export interface WorkflowData {
  name: string;
  workflow: any;
  chat?: any[];
}

export const useWorkflowStorageV2 = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { plan } = useUserPlan();

  // Get or create user-specific bucket
  const getUserBucket = async (): Promise<string> => {
    if (!user) throw new Error('User not authenticated');
    
    const bucketName = `user-workflows-${user.id}`;
    
    // Check if bucket exists, if not create it
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.id === bucketName);
    
    if (!bucketExists) {
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: false,
        allowedMimeTypes: ['application/json'],
        fileSizeLimit: 1024 * 1024 * 10 // 10MB limit
      });
      
      if (createError) {
        console.error('Error creating bucket:', createError);
        throw createError;
      }
      
      console.log('✅ Created user bucket:', bucketName);
    }
    
    return bucketName;
  };

  // Count workflows by counting JSON files in user's bucket
  const getUserWorkflowCount = async (): Promise<number> => {
    if (!user) return 0;

    try {
      const bucketName = await getUserBucket();
      const { data: files, error } = await supabase.storage
        .from(bucketName)
        .list('', {
          limit: 100,
          offset: 0
        });

      if (error) {
        console.error('Error listing files:', error);
        return 0;
      }

      // Count only workflow JSON files (not chat files)
      const workflowFiles = files?.filter(file => 
        file.name.endsWith('.json') && !file.name.includes('_chat')
      ) || [];

      return workflowFiles.length;
    } catch (err) {
      console.error('Error getting workflow count:', err);
      return 0;
    }
  };

  const getWorkflowLimit = (): number => {
    if (!plan) return 5;
    
    switch (plan.plan_type) {
      case 'free':
        return 5;
      case 'pro':
        return 10;
      case 'custom':
        return -1; // unlimited
      default:
        return 5;
    }
  };

  const checkWorkflowLimit = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const currentCount = await getUserWorkflowCount();
      const maxAllowed = getWorkflowLimit();
      
      // If unlimited (-1), allow creation
      if (maxAllowed === -1) {
        return true;
      }
      
      // Check if under limit
      return currentCount < maxAllowed;
    } catch (err) {
      console.error('Error checking workflow limit:', err);
      return false;
    }
  };

  const saveWorkflow = async (workflowData: WorkflowData, workflowId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      setLoading(true);
      setError(null);

      console.log('💾 Saving workflow to user bucket...', { workflowId, name: workflowData.name });

      // Check if this is a new workflow (check if file exists)
      const bucketName = await getUserBucket();
      const workflowFileName = `${workflowId}.json`;
      
      const { data: existingFile } = await supabase.storage
        .from(bucketName)
        .list('', {
          search: workflowFileName
        });

      const isNewWorkflow = !existingFile || existingFile.length === 0;

      // If it's a new workflow, check limits
      if (isNewWorkflow) {
        const canCreate = await checkWorkflowLimit();
        if (!canCreate) {
          const limitMessage = plan?.plan_type === 'free' 
            ? 'Free plan allows maximum 5 workflows. Please upgrade to create more.'
            : plan?.plan_type === 'pro' 
            ? 'Pro plan allows maximum 10 workflows. Please upgrade to custom plan for unlimited workflows.'
            : 'Workflow limit exceeded for your plan.';
          
          throw new Error(limitMessage);
        }
      }

      // Create workflow JSON file with proper formatting
      const workflowFileContent = {
        name: workflowData.name,
        workflow: workflowData.workflow,
        metadata: {
          workflowId,
          userId: user.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: '2.0.0'
        }
      };

      // Upload workflow JSON to user bucket
      const workflowBlob = new Blob([JSON.stringify(workflowFileContent, null, 2)], {
        type: 'application/json'
      });

      const { error: workflowUploadError } = await supabase.storage
        .from(bucketName)
        .upload(workflowFileName, workflowBlob, {
          upsert: true,
          contentType: 'application/json'
        });

      if (workflowUploadError) {
        console.error('❌ Workflow upload error:', workflowUploadError);
        throw new Error(`Failed to upload workflow: ${workflowUploadError.message}`);
      }

      console.log('✅ Workflow JSON saved to bucket:', workflowFileName);

      // Save chat history if exists
      let chatStoragePath = null;
      if (workflowData.chat && workflowData.chat.length > 0) {
        const chatFileName = `${workflowId}_chat.json`;
        const chatFileContent = {
          workflowId,
          messages: workflowData.chat,
          metadata: {
            userId: user.id,
            createdAt: new Date().toISOString(),
            messageCount: workflowData.chat.length
          }
        };

        const chatBlob = new Blob([JSON.stringify(chatFileContent, null, 2)], {
          type: 'application/json'
        });

        const { error: chatUploadError } = await supabase.storage
          .from(bucketName)
          .upload(chatFileName, chatBlob, {
            upsert: true,
            contentType: 'application/json'
          });

        if (chatUploadError) {
          console.error('❌ Chat upload error:', chatUploadError);
          throw new Error(`Failed to upload chat: ${chatUploadError.message}`);
        }

        chatStoragePath = chatFileName;
        console.log('✅ Chat history saved to bucket:', chatFileName);
      }

      // Save minimal metadata to database
      const { data, error: upsertError } = await supabase
        .from('workflow_data')
        .upsert({
          user_id: user.id,
          workflow_id: workflowId,
          workflow_name: workflowData.name,
          workflow_storage_path: workflowFileName,
          chat_storage_path: chatStoragePath,
          metadata: {
            bucket: bucketName,
            storage_based: true,
            version: '2.0.0'
          }
        }, {
          onConflict: 'user_id,workflow_id'
        })
        .select()
        .single();

      if (upsertError) {
        console.error('❌ Database error:', upsertError);
        throw new Error(`Failed to save workflow metadata: ${upsertError.message}`);
      }

      console.log('✅ Workflow saved successfully');

      return {
        success: true,
        message: 'Workflow saved successfully',
        workflowId: data.workflow_id,
        id: data.id,
        filePath: workflowFileName
      };

    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save workflow';
      console.error('❌ Workflow save failed:', errorMessage);
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

      console.log('📥 Loading workflow from user bucket...', { workflowId });

      const bucketName = await getUserBucket();
      const workflowFileName = `${workflowId}.json`;
      const chatFileName = `${workflowId}_chat.json`;

      // Load workflow JSON from storage
      const { data: workflowFile, error: workflowDownloadError } = await supabase.storage
        .from(bucketName)
        .download(workflowFileName);

      if (workflowDownloadError) {
        console.error('❌ Workflow download error:', workflowDownloadError);
        throw new Error(`Failed to download workflow: ${workflowDownloadError.message}`);
      }

      const workflowText = await workflowFile.text();
      const workflowFileData = JSON.parse(workflowText);
      console.log('✅ Workflow JSON loaded from bucket');

      // Load chat history from storage if exists
      let chatHistory = [];
      const { data: chatFile, error: chatDownloadError } = await supabase.storage
        .from(bucketName)
        .download(chatFileName);

      if (!chatDownloadError && chatFile) {
        try {
          const chatText = await chatFile.text();
          const chatFileData = JSON.parse(chatText);
          chatHistory = chatFileData.messages || [];
          console.log('✅ Chat history loaded from bucket:', chatHistory.length, 'messages');
        } catch (chatParseError) {
          console.warn('Could not parse chat history, continuing without it');
        }
      }

      // Get metadata from database if exists
      const { data: dbData } = await supabase
        .from('workflow_data')
        .select('*')
        .eq('workflow_id', workflowId)
        .eq('user_id', user.id)
        .single();

      return {
        success: true,
        workflowData: {
          name: workflowFileData.name,
          workflow: workflowFileData.workflow
        },
        workflow: workflowFileData.workflow,
        chat: chatHistory,
        nodes: workflowFileData.workflow?.nodes || [],
        connections: workflowFileData.workflow?.connections || {},
        metadata: workflowFileData.metadata || {},
        n8nWorkflowId: dbData?.n8n_workflow_id,
        deploymentStatus: dbData?.deployment_status,
        filePath: workflowFileName
      };

    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load workflow';
      console.error('❌ Workflow load failed:', errorMessage);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getUserWorkflows = async () => {
    if (!user) throw new Error('User not authenticated');

    try {
      setLoading(true);
      setError(null);

      console.log('📋 Fetching user workflows from bucket...');

      const bucketName = await getUserBucket();
      const { data: files, error: listError } = await supabase.storage
        .from(bucketName)
        .list('', {
          limit: 100,
          offset: 0
        });

      if (listError) {
        throw new Error(`Failed to list files: ${listError.message}`);
      }

      // Filter workflow files (not chat files)
      const workflowFiles = files?.filter(file => 
        file.name.endsWith('.json') && !file.name.includes('_chat')
      ) || [];

      const workflows = [];

      // Load each workflow file to get metadata
      for (const file of workflowFiles) {
        try {
          const { data: fileData, error: downloadError } = await supabase.storage
            .from(bucketName)
            .download(file.name);

          if (!downloadError && fileData) {
            const content = await fileData.text();
            const workflowData = JSON.parse(content);
            const workflowId = file.name.replace('.json', '');

            // Get deployment info from database if exists
            const { data: dbData } = await supabase
              .from('workflow_data')
              .select('deployment_status, n8n_workflow_id, n8n_url, created_at, updated_at')
              .eq('workflow_id', workflowId)
              .eq('user_id', user.id)
              .single();

            workflows.push({
              id: workflowId,
              workflow_id: workflowId,
              workflow_name: workflowData.name,
              deployment_status: dbData?.deployment_status || 'pending',
              n8n_workflow_id: dbData?.n8n_workflow_id,
              n8n_url: dbData?.n8n_url,
              created_at: dbData?.created_at || workflowData.metadata?.createdAt,
              updated_at: dbData?.updated_at || workflowData.metadata?.updatedAt || file.updated_at,
              metadata: workflowData.metadata,
              workflow_storage_path: file.name,
              chat_storage_path: `${workflowId}_chat.json`
            });
          }
        } catch (err) {
          console.warn(`Could not load workflow file ${file.name}:`, err);
        }
      }

      // Sort by updated_at descending
      workflows.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

      console.log('✅ Successfully fetched workflows:', workflows.length);
      return workflows;

    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch workflows';
      console.error('❌ Error fetching user workflows:', errorMessage);
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const deleteWorkflow = async (workflowId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      setLoading(true);
      setError(null);

      console.log('🗑️ Deleting workflow...', { workflowId });

      const bucketName = await getUserBucket();
      const workflowFileName = `${workflowId}.json`;
      const chatFileName = `${workflowId}_chat.json`;

      // Delete workflow file
      const { error: workflowDeleteError } = await supabase.storage
        .from(bucketName)
        .remove([workflowFileName]);

      if (workflowDeleteError) {
        console.warn('Could not delete workflow file:', workflowDeleteError);
      } else {
        console.log('✅ Workflow file deleted from bucket');
      }

      // Delete chat file
      const { error: chatDeleteError } = await supabase.storage
        .from(bucketName)
        .remove([chatFileName]);

      if (chatDeleteError) {
        console.warn('Could not delete chat file:', chatDeleteError);
      } else {
        console.log('✅ Chat file deleted from bucket');
      }

      // Delete database record
      const { error: deleteError } = await supabase
        .from('workflow_data')
        .delete()
        .eq('workflow_id', workflowId)
        .eq('user_id', user.id);

      if (deleteError) {
        console.warn('Could not delete database record:', deleteError);
      } else {
        console.log('✅ Database record deleted');
      }

      console.log('✅ Workflow deleted successfully');

      return {
        success: true,
        message: 'Workflow deleted successfully'
      };

    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete workflow';
      console.error('❌ Workflow delete failed:', errorMessage);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateDeploymentStatus = async (workflowId: string, n8nWorkflowId: string, deploymentStatus: string, n8nUrl?: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const updateData: any = {
        n8n_workflow_id: n8nWorkflowId,
        deployment_status: deploymentStatus
      };

      if (n8nUrl) {
        updateData.n8n_url = n8nUrl;
      }

      const { error: updateError } = await supabase
        .from('workflow_data')
        .update(updateData)
        .eq('workflow_id', workflowId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('❌ Database error updating deployment:', updateError);
        throw new Error(`Failed to update deployment status: ${updateError.message}`);
      }

      console.log('✅ Deployment status updated successfully');
      return { success: true };

    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update deployment status';
      console.error('❌ Deployment status update failed:', errorMessage);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Get workflow file content for CodePreview
  const getWorkflowFileContent = async (workflowId: string): Promise<string | null> => {
    if (!user) return null;

    try {
      const bucketName = await getUserBucket();
      const workflowFileName = `${workflowId}.json`;

      const { data: fileData, error } = await supabase.storage
        .from(bucketName)
        .download(workflowFileName);

      if (error || !fileData) {
        console.error('Error downloading workflow file:', error);
        return null;
      }

      return await fileData.text();
    } catch (err) {
      console.error('Error getting workflow file content:', err);
      return null;
    }
  };

  return {
    loading,
    error,
    saveWorkflow,
    loadWorkflow,
    getUserWorkflows,
    deleteWorkflow,
    updateDeploymentStatus,
    checkWorkflowLimit,
    getUserWorkflowCount,
    getWorkflowLimit,
    getWorkflowFileContent,
    getUserBucket
  };
};