
import { useState, useEffect, useRef } from 'react';

interface AutoSaveOptions {
  workflowId: string;
  workflowData: any;
  chatHistory: any[];
  delay?: number;
}

export const useAutoSave = (options: AutoSaveOptions) => {
  const [saving, setSaving] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { workflowId, workflowData, chatHistory, delay = 2000 } = options;

  useEffect(() => {
    if (!workflowId || !workflowData) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for auto-save
    timeoutRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        // Auto-save logic would go here
        console.log('Auto-saving workflow:', workflowId);
        
        // Simulate save delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log('Auto-save completed');
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        setSaving(false);
      }
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [workflowId, workflowData, chatHistory, delay]);

  return { saving };
};
