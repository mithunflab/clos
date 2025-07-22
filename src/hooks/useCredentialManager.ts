
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface CredentialStatus {
  nodeId: string;
  nodeType: string;
  status: 'not_required' | 'empty' | 'partial' | 'configured' | 'testing' | 'valid' | 'invalid';
  credentials: Record<string, any>;
  lastTested?: string;
  testResult?: boolean;
  errorMessage?: string;
}

export const useCredentialManager = () => {
  const [credentialStatuses, setCredentialStatuses] = useState<Record<string, CredentialStatus>>({});
  const [isTestingConnection, setIsTestingConnection] = useState<Record<string, boolean>>({});
  const { user } = useAuth();

  const updateCredentialStatus = useCallback((nodeId: string, updates: Partial<CredentialStatus>) => {
    setCredentialStatuses(prev => ({
      ...prev,
      [nodeId]: {
        ...prev[nodeId],
        ...updates
      }
    }));
  }, []);

  const saveCredentials = useCallback(async (nodeId: string, nodeType: string, credentials: Record<string, any>) => {
    if (!user) return false;

    try {
      const credentialKey = `credentials_${nodeId}_${user.id}`;
      localStorage.setItem(credentialKey, JSON.stringify(credentials));
      
      // Update status based on credential completeness
      const hasRequiredCredentials = Object.values(credentials).some(value => 
        value && String(value).trim() !== ''
      );
      
      updateCredentialStatus(nodeId, {
        nodeId,
        nodeType,
        credentials,
        status: hasRequiredCredentials ? 'configured' : 'empty'
      });

      console.log(`✅ Saved credentials for node ${nodeId}:`, Object.keys(credentials));
      return true;
    } catch (error) {
      console.error('❌ Error saving credentials:', error);
      return false;
    }
  }, [user, updateCredentialStatus]);

  const loadCredentials = useCallback((nodeId: string, nodeType: string) => {
    if (!user) return {};

    try {
      const credentialKey = `credentials_${nodeId}_${user.id}`;
      const stored = localStorage.getItem(credentialKey);
      const credentials = stored ? JSON.parse(stored) : {};
      
      const hasRequiredCredentials = Object.values(credentials).some(value => 
        value && String(value).trim() !== ''
      );
      
      updateCredentialStatus(nodeId, {
        nodeId,
        nodeType,
        credentials,
        status: hasRequiredCredentials ? 'configured' : 'empty'
      });

      return credentials;
    } catch (error) {
      console.error('❌ Error loading credentials:', error);
      return {};
    }
  }, [user, updateCredentialStatus]);

  const testConnection = useCallback(async (nodeId: string, nodeType: string, credentials: Record<string, any>) => {
    if (!credentials || Object.keys(credentials).length === 0) {
      updateCredentialStatus(nodeId, { status: 'empty', errorMessage: 'No credentials provided' });
      return false;
    }

    setIsTestingConnection(prev => ({ ...prev, [nodeId]: true }));
    updateCredentialStatus(nodeId, { status: 'testing' });

    try {
      // Test connection based on node type
      let testResult = false;
      let errorMessage = '';

      switch (nodeType) {
        case 'n8n-nodes-base.telegramTrigger':
        case 'n8n-nodes-base.telegram':
          testResult = await testTelegramCredentials(credentials);
          break;
        
        case 'n8n-nodes-base.httpRequest':
          // For HTTP requests, we can't really test without knowing the endpoint
          testResult = true;
          break;
        
        case 'n8n-nodes-base.groq':
          testResult = await testGroqCredentials(credentials);
          break;
        
        default:
          // Generic validation - check if required fields are filled
          testResult = Object.values(credentials).every(value => 
            value && String(value).trim() !== ''
          );
      }

      updateCredentialStatus(nodeId, {
        status: testResult ? 'valid' : 'invalid',
        lastTested: new Date().toISOString(),
        testResult,
        errorMessage: testResult ? undefined : errorMessage || 'Connection test failed'
      });

      return testResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection test failed';
      updateCredentialStatus(nodeId, {
        status: 'invalid',
        lastTested: new Date().toISOString(),
        testResult: false,
        errorMessage
      });
      return false;
    } finally {
      setIsTestingConnection(prev => ({ ...prev, [nodeId]: false }));
    }
  }, [updateCredentialStatus]);

  const testTelegramCredentials = async (credentials: Record<string, any>) => {
    const { botToken } = credentials;
    if (!botToken) throw new Error('Bot token is required');

    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      const data = await response.json();
      
      if (!data.ok) {
        throw new Error(data.description || 'Invalid bot token');
      }
      
      return true;
    } catch (error) {
      throw new Error(`Telegram bot test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testGroqCredentials = async (credentials: Record<string, any>) => {
    const { apiKey } = credentials;
    if (!apiKey) throw new Error('API key is required');

    try {
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Invalid Groq API key');
      }
      
      return true;
    } catch (error) {
      throw new Error(`Groq API test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getCredentialStatus = useCallback((nodeId: string) => {
    return credentialStatuses[nodeId] || {
      nodeId,
      nodeType: '',
      status: 'empty',
      credentials: {}
    };
  }, [credentialStatuses]);

  const clearCredentials = useCallback((nodeId: string) => {
    if (!user) return;

    const credentialKey = `credentials_${nodeId}_${user.id}`;
    localStorage.removeItem(credentialKey);
    
    setCredentialStatuses(prev => {
      const updated = { ...prev };
      delete updated[nodeId];
      return updated;
    });
  }, [user]);

  return {
    credentialStatuses,
    isTestingConnection,
    saveCredentials,
    loadCredentials,
    testConnection,
    getCredentialStatus,
    clearCredentials,
    updateCredentialStatus
  };
};
