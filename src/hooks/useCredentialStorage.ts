
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface CredentialData {
  id: string;
  user_id: string;
  node_id: string;
  node_type: string;
  credentials: Record<string, any>;
  workflow_id?: string;
  created_at: string;
  updated_at: string;
}

export const useCredentialStorage = () => {
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState<CredentialData[]>([]);
  const { user } = useAuth();

  const fetchCredentials = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('credential_storage' as any)
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setCredentials(data || []);
    } catch (error) {
      console.error('Error fetching credentials:', error);
    }
  }, [user]);

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

      // Save to database
      const { error } = await supabase
        .from('credential_storage' as any)
        .upsert({
          user_id: user.id,
          node_id: nodeId,
          node_type: nodeType,
          credentials: credentials,
          workflow_id: workflowId
        });

      if (error) throw error;

      // Save to localStorage as backup
      const credentialKey = `credentials_${nodeId}_${user.id}`;
      localStorage.setItem(credentialKey, JSON.stringify(credentials));

      await fetchCredentials();
      console.log('✅ Credentials saved successfully');
      return true;

    } catch (error) {
      console.error('❌ Error saving credentials:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, fetchCredentials]);

  const loadCredentialsFromStorage = useCallback((nodeId: string) => {
    if (!user) {
      console.warn('⚠️ No user found, cannot load credentials');
      return {};
    }

    try {
      // Try to load from database first
      const dbCredentials = credentials.find(c => c.node_id === nodeId);
      if (dbCredentials) {
        return dbCredentials.credentials;
      }

      // Fallback to localStorage
      const credentialKey = `credentials_${nodeId}_${user.id}`;
      const stored = localStorage.getItem(credentialKey);
      const loadedCredentials = stored ? JSON.parse(stored) : {};
      
      console.log('📥 Loaded credentials from storage:', { 
        nodeId, 
        credentialCount: Object.keys(loadedCredentials).length 
      });
      
      return loadedCredentials;
    } catch (error) {
      console.error('❌ Error loading credentials:', error);
      return {};
    }
  }, [user, credentials]);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  return {
    loading,
    credentials,
    saveCredentialsToStorage,
    loadCredentialsFromStorage,
    refetch: fetchCredentials
  };
};
