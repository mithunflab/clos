import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface WorkflowStorageData {
  workflowId: string;
  workflowName: string;
  description?: string;
  workflowJson: any;
  chatHistory?: any[];
  metadata?: any;
}

export const useWorkflowStorage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const getUserBucket = useCallback(async () => {
    if (!user?.id) throw new Error('User not authenticated');
    return `user-workflows-${user.id}`;
  }, [user?.id]);

  const saveWorkflowToStorage = useCallback(async (data: WorkflowStorageData) => {
    if (!user?.id) throw new Error('User not authenticated');
    
    setLoading(true);
    try {
      const bucketId = await getUserBucket();
      const workflowFileName = `workflows/${data.workflowId}.json`;
      const chatFileName = `chats/${data.workflowId}-chat.json`;

      // Save workflow JSON to storage
      const workflowBlob = new Blob([JSON.stringify(data.workflowJson, null, 2)], {
        type: 'application/json'
      });

      const { error: workflowUploadError } = await supabase.storage
        .from(bucketId)
        .upload(workflowFileName, workflowBlob, {
          upsert: true,
          contentType: 'application/json'
        });

      if (workflowUploadError) throw workflowUploadError;

      // Save chat history if provided
      let chatPath = null;
      if (data.chatHistory && data.chatHistory.length > 0) {
        const chatBlob = new Blob([JSON.stringify(data.chatHistory, null, 2)], {
          type: 'application/json'
        });

        const { error: chatUploadError } = await supabase.storage
          .from(bucketId)
          .upload(chatFileName, chatBlob, {
            upsert: true,
            contentType: 'application/json'
          });

        if (chatUploadError) throw chatUploadError;
        chatPath = chatFileName;
      }

      // Save/update workflow metadata in database
      const workflowData = {
        workflow_id: data.workflowId,
        user_id: user.id,
        workflow_name: data.workflowName,
        description: data.description || '',
        metadata: data.metadata || {},
        storage_bucket_id: bucketId,
        workflow_storage_path: workflowFileName,
        chat_storage_path: chatPath,
        updated_at: new Date().toISOString()
      };

      const { error: dbError } = await supabase
        .from('workflow_data')
        .upsert(workflowData, {
          onConflict: 'workflow_id'
        });

      if (dbError) throw dbError;

      return {
        bucketId,
        workflowPath: workflowFileName,
        chatPath
      };
    } catch (error) {
      console.error('Error saving workflow:', error);
      toast({
        title: "Error",
        description: "Failed to save workflow to storage",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user?.id, getUserBucket, toast]);

  const loadWorkflowFromStorage = useCallback(async (workflowId: string) => {
    if (!user?.id) throw new Error('User not authenticated');
    
    setLoading(true);
    try {
      // Get workflow metadata from database
      const { data: workflowData, error: dbError } = await supabase
        .from('workflow_data')
        .select('*')
        .eq('workflow_id', workflowId)
        .eq('user_id', user.id)
        .single();

      if (dbError) throw dbError;
      if (!workflowData) throw new Error('Workflow not found');

      const bucketId = workflowData.storage_bucket_id;
      const workflowPath = workflowData.workflow_storage_path;
      const chatPath = workflowData.chat_storage_path;

      // Load workflow JSON
      let workflowJson = null;
      if (workflowPath) {
        const { data: workflowFile, error: workflowError } = await supabase.storage
          .from(bucketId)
          .download(workflowPath);

        if (workflowError) throw workflowError;
        
        const workflowText = await workflowFile.text();
        workflowJson = JSON.parse(workflowText);
      }

      // Load chat history if available
      let chatHistory = null;
      if (chatPath) {
        const { data: chatFile, error: chatError } = await supabase.storage
          .from(bucketId)
          .download(chatPath);

        if (!chatError && chatFile) {
          const chatText = await chatFile.text();
          chatHistory = JSON.parse(chatText);
        }
      }

      return {
        workflowData,
        workflowJson,
        chatHistory
      };
    } catch (error) {
      console.error('Error loading workflow:', error);
      toast({
        title: "Error",
        description: "Failed to load workflow from storage",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user?.id, toast]);

  const deleteWorkflowFromStorage = useCallback(async (workflowId: string) => {
    if (!user?.id) throw new Error('User not authenticated');
    
    setLoading(true);
    try {
      // Get workflow data first
      const { data: workflowData, error: dbError } = await supabase
        .from('workflow_data')
        .select('*')
        .eq('workflow_id', workflowId)
        .eq('user_id', user.id)
        .single();

      if (dbError) throw dbError;
      if (!workflowData) throw new Error('Workflow not found');

      const bucketId = workflowData.storage_bucket_id;

      // Delete files from storage
      const filesToDelete = [];
      if (workflowData.workflow_storage_path) {
        filesToDelete.push(workflowData.workflow_storage_path);
      }
      if (workflowData.chat_storage_path) {
        filesToDelete.push(workflowData.chat_storage_path);
      }

      if (filesToDelete.length > 0) {
        const { error: storageError } = await supabase.storage
          .from(bucketId)
          .remove(filesToDelete);

        if (storageError) {
          console.warn('Storage deletion error:', storageError);
        }
      }

      // Delete from database
      const { error: deleteError } = await supabase
        .from('workflow_data')
        .delete()
        .eq('workflow_id', workflowId)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      return true;
    } catch (error) {
      console.error('Error deleting workflow:', error);
      toast({
        title: "Error",
        description: "Failed to delete workflow",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user?.id, toast]);

  const getUserWorkflows = useCallback(async () => {
    if (!user?.id) throw new Error('User not authenticated');
    
    try {
      const { data, error } = await supabase
        .from('workflow_data')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user workflows:', error);
      toast({
        title: "Error",
        description: "Failed to fetch workflows",
        variant: "destructive",
      });
      throw error;
    }
  }, [user?.id, toast]);

  const updateWorkflowMetadata = useCallback(async (
    workflowId: string, 
    updates: Partial<{
      workflow_name: string;
      description: string;
      metadata: any;
      n8n_workflow_id: string;
      n8n_url: string;
      deployment_status: string;
    }>
  ) => {
    if (!user?.id) throw new Error('User not authenticated');
    
    try {
      const { error } = await supabase
        .from('workflow_data')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('workflow_id', workflowId)
        .eq('user_id', user.id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating workflow metadata:', error);
      toast({
        title: "Error",
        description: "Failed to update workflow metadata",
        variant: "destructive",
      });
      throw error;
    }
  }, [user?.id, toast]);

  return {
    loading,
    saveWorkflowToStorage,
    loadWorkflowFromStorage,
    deleteWorkflowFromStorage,
    getUserWorkflows,
    updateWorkflowMetadata,
    getUserBucket
  };
};