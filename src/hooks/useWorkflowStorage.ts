import { useState } from 'react';
import { useAuth } from './useAuth';
import { useUserPlan } from './useUserPlan';
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

// Helper function to convert data to Uint8Array for decompression
const convertToUint8Array = (data: any): Uint8Array => {
  // Check if it's already a Uint8Array
  if (data && data.constructor && data.constructor.name === 'Uint8Array') {
    return data as Uint8Array;
  }
  
  if (typeof data === 'string') {
    // It's a base64 string, decode it
    return new Uint8Array(atob(data).split('').map(c => c.charCodeAt(0)));
  }
  
  // If it's an array-like object, convert to Uint8Array
  if (data && typeof data === 'object' && typeof data.length === 'number') {
    return new Uint8Array(data);
  }
  
  throw new Error('Unable to convert data to Uint8Array');
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
  const { plan } = useUserPlan();

  const checkWorkflowLimit = async () => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc('check_workflow_limit', {
        p_user_id: user.id
      });

      if (error) {
        console.error('Error checking workflow limit:', error);
        return false;
      }

      return data;
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

      console.log('💾 Saving workflow to Supabase...', { workflowId, name: workflowData.name });

      // Check if this is a new workflow (not an update)
      const { data: existingWorkflow } = await supabase
        .from('workflow_data')
        .select('id')
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

      // Compress the workflow JSON and chat history
      const compressedWorkflow = compressJSON(workflowData.workflow);
      const compressedChat = workflowData.chat ? compressJSON(workflowData.chat) : null;

      // Convert Uint8Array to base64 for storage (bytea columns expect base64 strings)
      const workflowBase64 = btoa(String.fromCharCode(...compressedWorkflow));
      const chatBase64 = compressedChat ? btoa(String.fromCharCode(...compressedChat)) : null;

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
          onConflict: 'user_id,workflow_id'
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

      console.log('🔍 Raw data from database:', {
        workflowId: data.workflow_id,
        workflowName: data.workflow_name,
        workflowJsonType: typeof data.compressed_workflow_json,
        workflowJsonConstructor: data.compressed_workflow_json?.constructor?.name,
        chatHistoryType: typeof data.compressed_chat_history,
        chatHistoryConstructor: data.compressed_chat_history?.constructor?.name,
        hasWorkflowJson: !!data.compressed_workflow_json,
        hasChatHistory: !!data.compressed_chat_history
      });

      // Handle decompression with robust type checking
      let workflowData;
      let chatHistory = [];

      try {
        // Handle compressed_workflow_json - support both Uint8Array and base64 string
        console.log('🔄 Converting workflow JSON data...');
        const workflowBytes = convertToUint8Array(data.compressed_workflow_json);
        workflowData = decompressJSON(workflowBytes);
        console.log('✅ Workflow JSON decompressed successfully');

        // Handle compressed_chat_history - support both Uint8Array and base64 string
        if (data.compressed_chat_history) {
          console.log('🔄 Converting chat history data...');
          const chatBytes = convertToUint8Array(data.compressed_chat_history);
          chatHistory = decompressJSON(chatBytes);
          console.log('✅ Chat history decompressed successfully:', chatHistory.length, 'messages');
        }
      } catch (decompressionError) {
        console.error('❌ Decompression error:', decompressionError);
        console.error('Raw data types:', {
          workflowJsonType: typeof data.compressed_workflow_json,
          chatHistoryType: typeof data.compressed_chat_history
        });
        throw new Error(`Failed to decompress workflow data: ${decompressionError.message}`);
      }

      console.log('✅ Workflow loaded and decompressed successfully:', {
        workflowName: data.workflow_name,
        workflowNodesCount: workflowData.nodes?.length || 0,
        chatHistoryLength: chatHistory.length,
        hasConnections: !!workflowData.connections
      });

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
