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

      // Store compressed data directly as Uint8Array (bytea columns accept this)
      const { data, error: upsertError } = await supabase
        .from('workflow_data')
        .upsert({
          user_id: user.id,
          workflow_id: workflowId,
          workflow_name: workflowData.name,
          compressed_workflow_json: compressedWorkflow,
          compressed_chat_history: compressedChat,
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

      console.log('🔍 Raw data from database:', {
        workflowJsonType: typeof data.compressed_workflow_json,
        workflowJsonConstructor: data.compressed_workflow_json?.constructor?.name,
        chatHistoryType: typeof data.compressed_chat_history,
        chatHistoryConstructor: data.compressed_chat_history?.constructor?.name
      });

      // Handle decompression - bytea columns return Uint8Array directly
      let workflowData;
      let chatHistory = [];

      try {
        // compressed_workflow_json is already Uint8Array from bytea column
        if (data.compressed_workflow_json instanceof Uint8Array) {
          workflowData = decompressJSON(data.compressed_workflow_json);
        } else {
          // Fallback for legacy base64 data
          const workflowBytes = new Uint8Array(atob(data.compressed_workflow_json).split('').map(c => c.charCodeAt(0)));
          workflowData = decompressJSON(workflowBytes);
        }

        // compressed_chat_history is already Uint8Array from bytea column  
        if (data.compressed_chat_history) {
          if (data.compressed_chat_history instanceof Uint8Array) {
            chatHistory = decompressJSON(data.compressed_chat_history);
          } else {
            // Fallback for legacy base64 data
            const chatBytes = new Uint8Array(atob(data.compressed_chat_history).split('').map(c => c.charCodeAt(0)));
            chatHistory = decompressJSON(chatBytes);
          }
        }
      } catch (decompressionError) {
        console.error('❌ Decompression error:', decompressionError);
        throw new Error('Failed to decompress workflow data');
      }

      console.log('✅ Workflow loaded and decompressed successfully:', {
        workflowData,
        chatHistoryLength: chatHistory.length
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
