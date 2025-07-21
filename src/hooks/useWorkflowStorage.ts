import { useState } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

// Compression utilities
const compressJSON = (data: any): Uint8Array => {
  const jsonString = JSON.stringify(data);
  const encoder = new TextEncoder();
  return encoder.encode(jsonString);
};

const decompressJSON = (compressedData: Uint8Array): any => {
  const decoder = new TextDecoder();
  const jsonString = decoder.decode(compressedData);
  return JSON.parse(jsonString);
};

export interface WorkflowData {
  name: string;
  workflow: any;
  chat?: any[];
}

export const useWorkflowStorage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const saveWorkflow = async (workflowData: WorkflowData, workflowId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      setLoading(true);
      setError(null);

      console.log('💾 Saving workflow to Supabase...', { workflowId, name: workflowData.name });

      // Compress the workflow JSON and chat history
      const compressedWorkflow = compressJSON(workflowData.workflow);
      const compressedChat = workflowData.chat ? compressJSON(workflowData.chat) : null;

      // Convert Uint8Array to base64 for storage
      const workflowBase64 = btoa(String.fromCharCode(...compressedWorkflow));
      const chatBase64 = compressedChat ? btoa(String.fromCharCode(...compressedChat)) : null;

      // Upsert workflow data
      const { data, error: upsertError } = await supabase
        .from('workflow_data')
        .upsert({
          user_id: user.id,
          workflow_id: workflowId,
          workflow_name: workflowData.name,
          compressed_workflow_json: workflowBase64,
          compressed_chat_history: chatBase64,
          metadata: {
            created_at: new Date().toISOString(),
            version: '1.0.0'
          }
        }, {
          onConflict: 'workflow_id'
        })
        .select()
        .single();

      if (upsertError) {
        console.error('❌ Database error:', upsertError);
        throw new Error(`Failed to save workflow: ${upsertError.message}`);
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

      console.log('📥 Loading workflow from Supabase...', { workflowId });

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

      // Convert base64 back to Uint8Array and decompress
      const workflowBytes = new Uint8Array(atob(data.compressed_workflow_json).split('').map(c => c.charCodeAt(0)));
      const workflowData = decompressJSON(workflowBytes);
      
      const chatHistory = data.compressed_chat_history 
        ? (() => {
            const chatBytes = new Uint8Array(atob(data.compressed_chat_history).split('').map(c => c.charCodeAt(0)));
            return decompressJSON(chatBytes);
          })()
        : [];

      console.log('✅ Workflow loaded successfully:', workflowData);

      return {
        success: true,
        workflowData,
        workflow: workflowData,
        chat: chatHistory,
        nodes: workflowData.nodes || [],
        connections: workflowData.connections || {},
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
          metadata
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

  return {
    loading,
    error,
    saveWorkflow,
    loadWorkflow,
    getUserWorkflows,
    deleteWorkflow,
    updateDeploymentStatus
  };
};