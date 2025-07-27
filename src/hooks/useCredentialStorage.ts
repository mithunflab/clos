
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface CredentialData {
  id: string;
  user_id: string;
  node_id: string;
  node_type: string;
  credential_data: any;
  created_at: string;
  updated_at: string;
}

export const useCredentialStorage = () => {
  const [credentials, setCredentials] = useState<CredentialData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchCredentials = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('credential_storage')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setCredentials(data || []);
    } catch (err) {
      console.error('Error fetching credentials:', err);
      setError(err instanceof Error ? err.message : 'Failed to load credentials');
    } finally {
      setLoading(false);
    }
  };

  const saveCredential = async (nodeId: string, nodeType: string, credentialData: any) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('credential_storage')
        .upsert({
          user_id: user.id,
          node_id: nodeId,
          node_type: nodeType,
          credential_data: credentialData
        });

      if (error) throw error;
      await fetchCredentials();
      return true;
    } catch (err) {
      console.error('Error saving credential:', err);
      setError(err instanceof Error ? err.message : 'Failed to save credential');
      return false;
    }
  };

  const getCredential = (nodeId: string) => {
    return credentials.find(cred => cred.node_id === nodeId);
  };

  useEffect(() => {
    fetchCredentials();
  }, [user]);

  return {
    credentials,
    loading,
    error,
    saveCredential,
    getCredential,
    refetch: fetchCredentials
  };
};
