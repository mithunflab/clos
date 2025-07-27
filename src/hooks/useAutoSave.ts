
import { useEffect, useRef, useCallback } from 'react';
import { useWorkflowStorageV2 } from './useWorkflowStorageV2';
import { useToast } from '@/hooks/use-toast';

interface AutoSaveOptions {
  workflowId: string;
  workflowData: any;
  chatHistory?: any[];
  delay?: number;
}

export const useAutoSave = ({ workflowId, workflowData, chatHistory, delay = 2000 }: AutoSaveOptions) => {
  const { saveWorkflow, loading } = useWorkflowStorageV2();
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedRef = useRef<string>('');

  const saveToSupabase = useCallback(async () => {
    if (!workflowData || !workflowId) return;

    try {
      const dataToSave = {
        name: workflowData.name || 'Untitled Workflow',
        workflow: workflowData,
        chat: chatHistory || []
      };

      const currentDataString = JSON.stringify(dataToSave);
      
      // Only save if data has changed
      if (currentDataString === lastSavedRef.current) {
        return;
      }

      console.log('🔄 Auto-saving workflow...', { workflowId, name: dataToSave.name });
      
      await saveWorkflow(dataToSave, workflowId);
      lastSavedRef.current = currentDataString;
      
      console.log('✅ Workflow auto-saved successfully');
    } catch (error) {
      console.error('❌ Auto-save failed:', error);
      toast({
        title: "Auto-save failed",
        description: "Failed to save workflow automatically",
        variant: "destructive",
      });
    }
  }, [workflowData, workflowId, chatHistory, saveWorkflow, toast]);

  const debouncedSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      saveToSupabase();
    }, delay);
  }, [saveToSupabase, delay]);

  useEffect(() => {
    if (workflowData && workflowId) {
      debouncedSave();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [workflowData, workflowId, chatHistory, debouncedSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { saving: loading };
};
