import { useState } from 'react';
import { useAuth } from './useAuth';
import { useUserPlan } from './useUserPlan';
import { supabase } from '@/integrations/supabase/client';

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

  const checkWorkflowLimit = async () => {
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

      console.log('💾 Saving workflow to user-specific bucket...', { workflowId, name: workflowData.name });

      // Check if this is a new workflow (not an update)
      const { data: existingWorkflow } = await supabase
        .from('workflow_data')
        .select('id, workflow_storage_path, chat_storage_path')
        .eq('workflow_id', workflowId)
        .eq('user_id', user.id)
        .single();

      // If it's a new workflow, check limits
      if (!existingWorkflow) {
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

      // Get or create user-specific bucket
      const { data: bucketName, error: bucketError } = await supabase.rpc('get_user_bucket', {
        user_id_param: user.id
      });

      if (bucketError) {
        console.error('❌ Bucket creation error:', bucketError);
        throw new Error(`Failed to create user bucket: ${bucketError.message}`);
      }

      // Create unique file names (without timestamp if updating existing workflow)
      const workflowFileName = `${workflowId}.json`;
      const chatFileName = `${workflowId}_chat.json`;

      // Upload workflow JSON to user-specific bucket
      const workflowBlob = new Blob([JSON.stringify(workflowData.workflow, null, 2)], {
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

      console.log('✅ Workflow JSON uploaded to user bucket:', workflowFileName);

      // Upload chat history if exists
      let chatStoragePath = null;
      if (workflowData.chat && workflowData.chat.length > 0) {
        const chatBlob = new Blob([JSON.stringify(workflowData.chat, null, 2)], {
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
        console.log('✅ Chat history uploaded to user bucket:', chatFileName);
      }

      // Save metadata to database
      const { data, error: upsertError } = await supabase
        .from('workflow_data')
        .upsert({
          user_id: user.id,
          workflow_id: workflowId,
          workflow_name: workflowData.name,
          workflow_storage_path: workflowFileName,
          chat_storage_path: chatStoragePath,
          compressed_workflow_json: null, // Not used in storage version
          compressed_chat_history: null, // Not used in storage version
          metadata: {
            created_at: new Date().toISOString(),
            version: '2.0.0',
            storage_based: true
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

      console.log('✅ Workflow saved successfully:', data);

      return {
        success: true,
        message: 'Workflow saved successfully',
        workflowId: data.workflow_id,
        id: data.id
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

      console.log('📥 Loading workflow from Supabase Storage...', { workflowId });

      // Get workflow metadata from database
      const { data, error: loadError } = await supabase
        .from('workflow_data')
        .select('*')
        .eq('workflow_id', workflowId)
        .eq('user_id', user.id)
        .single();

      if (loadError) {
        console.error('❌ Database error:', loadError);
        throw new Error(`Failed to load workflow: ${loadError.message}`);
      }

      if (!data) {
        throw new Error('Workflow not found');
      }

      console.log('🔍 Workflow metadata loaded:', {
        workflowId: data.workflow_id,
        workflowName: data.workflow_name,
        workflowStoragePath: data.workflow_storage_path,
        chatStoragePath: data.chat_storage_path,
        hasWorkflowPath: !!data.workflow_storage_path,
        hasChatPath: !!data.chat_storage_path
      });

      let workflowData = null;
      let chatHistory = [];

      // Get user bucket name
      const { data: bucketName, error: bucketError } = await supabase.rpc('get_user_bucket', {
        user_id_param: user.id
      });

      if (bucketError) {
        console.error('❌ Bucket error:', bucketError);
        throw new Error(`Failed to get user bucket: ${bucketError.message}`);
      }

      // Load workflow JSON from storage
      if (data.workflow_storage_path) {
        console.log('📥 Downloading workflow JSON from user bucket...');
        const { data: workflowFile, error: workflowDownloadError } = await supabase.storage
          .from(bucketName)
          .download(data.workflow_storage_path);

        if (workflowDownloadError) {
          console.error('❌ Workflow download error:', workflowDownloadError);
          throw new Error(`Failed to download workflow: ${workflowDownloadError.message}`);
        }

        const workflowText = await workflowFile.text();
        workflowData = JSON.parse(workflowText);
        console.log('✅ Workflow JSON loaded from user bucket');
      }

      // Load chat history from storage if exists
      if (data.chat_storage_path) {
        console.log('📥 Downloading chat history from user bucket...');
        const { data: chatFile, error: chatDownloadError } = await supabase.storage
          .from(bucketName)
          .download(data.chat_storage_path);

        if (chatDownloadError) {
          console.error('❌ Chat download error:', chatDownloadError);
          // Don't throw error for chat, just log it
          console.warn('Chat history could not be loaded, continuing without it');
        } else {
          const chatText = await chatFile.text();
          chatHistory = JSON.parse(chatText);
          console.log('✅ Chat history loaded from user bucket:', chatHistory.length, 'messages');
        }
      }

      console.log('✅ Workflow loaded successfully from storage:', {
        workflowName: data.workflow_name,
        workflowNodesCount: workflowData?.nodes?.length || 0,
        chatHistoryLength: chatHistory.length,
        hasConnections: !!workflowData?.connections
      });

      return {
        success: true,
        workflowData: {
          name: data.workflow_name,
          workflow: workflowData,
          ...workflowData
        },
        workflow: workflowData,
        chat: chatHistory,
        nodes: workflowData?.nodes || [],
        connections: workflowData?.connections || {},
        metadata: data.metadata || {},
        n8nWorkflowId: data.n8n_workflow_id,
        deploymentStatus: data.deployment_status
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

      console.log('📋 Fetching user workflows from database...');

      const { data, error: fetchError } = await supabase
        .from('workflow_data')
        .select(`
          id,
          workflow_id,
          workflow_name,
          n8n_workflow_id,
          n8n_url,
          deployment_status,
          created_at,
          updated_at,
          metadata,
          workflow_storage_path,
          chat_storage_path
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (fetchError) {
        console.error('❌ Database error fetching workflows:', fetchError);
        throw new Error(`Database error: ${fetchError.message}`);
      }

      console.log('✅ Successfully fetched workflows:', data?.length || 0);

      return data || [];

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

      // Get workflow metadata first to delete storage files
      const { data: workflowData } = await supabase
        .from('workflow_data')
        .select('workflow_storage_path, chat_storage_path')
        .eq('workflow_id', workflowId)
        .eq('user_id', user.id)
        .single();

      // Get user bucket name
      const { data: bucketName, error: bucketError } = await supabase.rpc('get_user_bucket', {
        user_id_param: user.id
      });

      if (bucketError) {
        console.error('❌ Bucket error:', bucketError);
        throw new Error(`Failed to get user bucket: ${bucketError.message}`);
      }

      // Delete storage files if they exist
      if (workflowData?.workflow_storage_path) {
        await supabase.storage
          .from(bucketName)
          .remove([workflowData.workflow_storage_path]);
        console.log('✅ Workflow JSON deleted from user bucket');
      }

      if (workflowData?.chat_storage_path) {
        await supabase.storage
          .from(bucketName)
          .remove([workflowData.chat_storage_path]);
        console.log('✅ Chat history deleted from user bucket');
      }

      // Delete database record
      const { error: deleteError } = await supabase
        .from('workflow_data')
        .delete()
        .eq('workflow_id', workflowId)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('❌ Database error:', deleteError);
        throw new Error(`Failed to delete workflow: ${deleteError.message}`);
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

  const getUserWorkflowCount = async () => {
    if (!user) return 0;

    try {
      const { count, error } = await supabase
        .from('workflow_data')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error getting workflow count:', error);
        return 0;
      }

      return count || 0;
    } catch (err) {
      console.error('Error getting workflow count:', err);
      return 0;
    }
  };

  const getWorkflowLimit = () => {
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
    getWorkflowLimit
  };
};