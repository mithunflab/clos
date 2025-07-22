
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
    console.log('🔄 Updating credential status:', { nodeId, updates });
    setCredentialStatuses(prev => {
      const updated = {
        ...prev,
        [nodeId]: {
          ...prev[nodeId],
          nodeId,
          nodeType: prev[nodeId]?.nodeType || '',
          status: 'empty' as const,
          credentials: {},
          ...updates
        }
      };
      console.log('✅ Updated credential statuses:', updated);
      return updated;
    });
  }, []);

  const saveCredentials = useCallback(async (nodeId: string, nodeType: string, credentials: Record<string, any>) => {
    if (!user) {
      console.warn('⚠️ No user found, cannot save credentials');
      return false;
    }

    try {
      const credentialKey = `credentials_${nodeId}_${user.id}`;
      localStorage.setItem(credentialKey, JSON.stringify(credentials));
      
      // Determine status based on credential completeness
      const hasRequiredCredentials = Object.values(credentials).some(value => 
        value && String(value).trim() !== ''
      );
      
      const newStatus = hasRequiredCredentials ? 'configured' : 'empty';
      
      updateCredentialStatus(nodeId, {
        nodeId,
        nodeType,
        credentials,
        status: newStatus
      });

      console.log(`✅ Saved credentials for node ${nodeId}:`, { 
        nodeType, 
        credentialCount: Object.keys(credentials).length,
        status: newStatus 
      });
      return true;
    } catch (error) {
      console.error('❌ Error saving credentials:', error);
      return false;
    }
  }, [user, updateCredentialStatus]);

  const loadCredentials = useCallback((nodeId: string, nodeType: string) => {
    if (!user) {
      console.warn('⚠️ No user found, cannot load credentials');
      return {};
    }

    try {
      const credentialKey = `credentials_${nodeId}_${user.id}`;
      const stored = localStorage.getItem(credentialKey);
      const credentials = stored ? JSON.parse(stored) : {};
      
      const hasRequiredCredentials = Object.values(credentials).some(value => 
        value && String(value).trim() !== ''
      );
      
      const status = hasRequiredCredentials ? 'configured' : 'empty';
      
      updateCredentialStatus(nodeId, {
        nodeId,
        nodeType,
        credentials,
        status
      });

      console.log(`📥 Loaded credentials for node ${nodeId}:`, { 
        nodeType, 
        credentialCount: Object.keys(credentials).length,
        status 
      });
      
      return credentials;
    } catch (error) {
      console.error('❌ Error loading credentials:', error);
      return {};
    }
  }, [user, updateCredentialStatus]);

  const testConnection = useCallback(async (nodeId: string, nodeType: string, credentials: Record<string, any>) => {
    console.log(`🧪 Testing connection for node ${nodeId}:`, { nodeType, credentialKeys: Object.keys(credentials) });
    
    // Check if credentials are provided
    const hasCredentials = Object.values(credentials).some(value => 
      value && String(value).trim() !== ''
    );
    
    if (!hasCredentials) {
      updateCredentialStatus(nodeId, { 
        status: 'empty', 
        errorMessage: 'No credentials provided',
        testResult: false,
        lastTested: new Date().toISOString()
      });
      return false;
    }

    setIsTestingConnection(prev => ({ ...prev, [nodeId]: true }));
    updateCredentialStatus(nodeId, { status: 'testing' });

    try {
      let testResult = false;
      let errorMessage = '';

      switch (nodeType) {
        case 'n8n-nodes-base.telegramTrigger':
        case 'n8n-nodes-base.telegram':
          testResult = await testTelegramCredentials(credentials);
          break;
        
        case 'n8n-nodes-base.httpRequest':
          // For HTTP requests, validate that URL and other required fields are present
          testResult = await testHttpRequestCredentials(credentials);
          break;
        
        case 'n8n-nodes-base.groq':
          testResult = await testGroqCredentials(credentials);
          break;
        
        default:
          // Generic validation - check if required fields are filled and formatted correctly
          testResult = await testGenericCredentials(credentials, nodeType);
      }

      const finalStatus = testResult ? 'valid' : 'invalid';
      const finalErrorMessage = testResult ? undefined : errorMessage || 'Connection test failed - please verify your credentials';

      updateCredentialStatus(nodeId, {
        status: finalStatus,
        lastTested: new Date().toISOString(),
        testResult,
        errorMessage: finalErrorMessage
      });

      console.log(`✅ Connection test completed for ${nodeId}:`, { 
        testResult, 
        status: finalStatus,
        errorMessage: finalErrorMessage 
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
      
      console.error(`❌ Connection test failed for ${nodeId}:`, errorMessage);
      return false;
    } finally {
      setIsTestingConnection(prev => ({ ...prev, [nodeId]: false }));
    }
  }, [updateCredentialStatus]);

  const testTelegramCredentials = async (credentials: Record<string, any>) => {
    const { botToken, accessToken } = credentials;
    const token = botToken || accessToken;
    
    if (!token || typeof token !== 'string' || token.trim() === '') {
      throw new Error('Bot token is required and cannot be empty');
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const data = await response.json();
      
      if (!data.ok) {
        throw new Error(data.description || 'Invalid bot token - please check your Telegram bot token');
      }
      
      console.log('✅ Telegram bot test successful:', data.result.username);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Telegram bot test failed: ${message}`);
    }
  };

  const testGroqCredentials = async (credentials: Record<string, any>) => {
    const { apiKey, api_key } = credentials;
    const key = apiKey || api_key;
    
    if (!key || typeof key !== 'string' || key.trim() === '') {
      throw new Error('API key is required and cannot be empty');
    }

    try {
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid Groq API key - please check your API key');
        } else if (response.status === 403) {
          throw new Error('Groq API access forbidden - please verify your API key permissions');
        } else {
          throw new Error(`Groq API error (${response.status}) - please verify your API key`);
        }
      }
      
      console.log('✅ Groq API test successful');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Groq API test failed: ${message}`);
    }
  };

  const testHttpRequestCredentials = async (credentials: Record<string, any>) => {
    // For HTTP Request nodes, we mainly validate the structure and required fields
    const { url, method, headers, auth } = credentials;
    
    // Check if essential fields are provided
    if (!url || typeof url !== 'string' || url.trim() === '') {
      throw new Error('URL is required for HTTP requests');
    }
    
    // Basic URL validation
    try {
      new URL(url);
    } catch {
      throw new Error('Invalid URL format - please provide a valid URL');
    }
    
    console.log('✅ HTTP Request credentials validated');
    return true;
  };

  const testGenericCredentials = async (credentials: Record<string, any>, nodeType: string) => {
    // Generic validation for unknown node types
    const hasValidCredentials = Object.entries(credentials).some(([key, value]) => {
      if (typeof value !== 'string') return false;
      const trimmedValue = value.trim();
      return trimmedValue !== '' && trimmedValue.length > 3; // Basic length check
    });
    
    if (!hasValidCredentials) {
      throw new Error(`No valid credentials provided for ${nodeType.replace('n8n-nodes-base.', '')}`);
    }
    
    console.log(`✅ Generic credentials validated for ${nodeType}`);
    return true;
  };

  const getCredentialStatus = useCallback((nodeId: string) => {
    const status = credentialStatuses[nodeId];
    if (!status) {
      return {
        nodeId,
        nodeType: '',
        status: 'empty' as const,
        credentials: {}
      };
    }
    return status;
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
    
    console.log(`🗑️ Cleared credentials for node ${nodeId}`);
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
