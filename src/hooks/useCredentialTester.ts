
import { useState, useCallback } from 'react';

interface CredentialTestResult {
  success: boolean;
  message: string;
}

export const useCredentialTester = () => {
  const [testing, setTesting] = useState<Record<string, boolean>>({});

  const testCredentials = useCallback(async (
    nodeType: string,
    credentials: Record<string, any>
  ): Promise<CredentialTestResult> => {
    const nodeId = `${nodeType}_${Date.now()}`;
    
    try {
      setTesting(prev => ({ ...prev, [nodeId]: true }));
      
      // Basic validation first
      const hasCredentials = Object.values(credentials).some(value => 
        value && String(value).trim() !== ''
      );
      
      if (!hasCredentials) {
        return {
          success: false,
          message: 'No credentials provided'
        };
      }

      // Simulate connection test with timeout
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Basic validation for different node types
      switch (nodeType) {
        case 'n8n-nodes-base.telegramTrigger':
        case 'n8n-nodes-base.telegram':
          const telegramToken = credentials.telegramApi || credentials.botToken || credentials.accessToken;
          if (!telegramToken || typeof telegramToken !== 'string' || telegramToken.trim() === '') {
            return {
              success: false,
              message: 'Bot token is required and cannot be empty'
            };
          }
          // Basic token format validation
          if (!telegramToken.includes(':') || telegramToken.length < 20) {
            return {
              success: false,
              message: 'Invalid bot token format. Expected format: XXXXXXXXX:XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
            };
          }
          break;
        
        case 'n8n-nodes-base.groq':
          const groqKey = credentials.groqApi || credentials.apiKey || credentials.api_key;
          if (!groqKey || typeof groqKey !== 'string' || groqKey.trim() === '') {
            return {
              success: false,
              message: 'API key is required and cannot be empty'
            };
          }
          // Basic API key format validation
          if (groqKey.length < 20) {
            return {
              success: false,
              message: 'API key appears to be too short'
            };
          }
          break;
        
        case 'n8n-nodes-base.httpRequest':
          const url = credentials.url;
          if (url) {
            try {
              new URL(url);
            } catch {
              return {
                success: false,
                message: 'Invalid URL format'
              };
            }
          }
          break;
        
        default:
          // Generic validation
          const hasValidCredentials = Object.entries(credentials).some(([key, value]) => {
            if (typeof value !== 'string') return false;
            const trimmedValue = value.trim();
            return trimmedValue !== '' && trimmedValue.length > 3;
          });
          
          if (!hasValidCredentials) {
            return {
              success: false,
              message: `No valid credentials provided for ${nodeType.replace('n8n-nodes-base.', '')}`
            };
          }
      }

      return {
        success: true,
        message: 'Credentials validated successfully'
      };

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection test failed';
      return {
        success: false,
        message
      };
    } finally {
      setTesting(prev => ({ ...prev, [nodeId]: false }));
    }
  }, []);

  return {
    testing,
    testCredentials
  };
};
