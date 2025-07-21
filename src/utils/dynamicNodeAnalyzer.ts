
export interface DynamicCredentialField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'email' | 'url' | 'number' | 'select';
  required: boolean;
  placeholder: string;
  description?: string;
  options?: string[];
}

interface DynamicNodeRequirement {
  requiresCredentials: boolean;
  serviceName: string;
  fields: DynamicCredentialField[];
  helpUrl?: string;
}

export const analyzeDynamicNodeCredentials = (nodeData: any): DynamicNodeRequirement => {
  console.log('🔍 Analyzing node for dynamic credentials:', nodeData);
  
  const nodeType = nodeData.nodeType || nodeData.type || '';
  const cleanNodeType = nodeType.replace('n8n-nodes-base.', '').toLowerCase();
  
  // Extract service name
  const serviceName = nodeData.name || cleanNodeType.charAt(0).toUpperCase() + cleanNodeType.slice(1);
  
  // Check if node has any credential-related properties
  const credentialFields: DynamicCredentialField[] = [];
  
  // Analyze parameters for credential fields
  if (nodeData.parameters && typeof nodeData.parameters === 'object') {
    Object.entries(nodeData.parameters).forEach(([key, value]) => {
      const field = analyzeParameterField(key, value);
      if (field && isCredentialField(key)) {
        credentialFields.push(field);
      }
    });
  }
  
  // Analyze credentials object
  if (nodeData.credentials && typeof nodeData.credentials === 'object') {
    Object.entries(nodeData.credentials).forEach(([key, value]) => {
      const field = analyzeCredentialField(key, value);
      if (field) {
        credentialFields.push(field);
      }
    });
  }
  
  // Check for typeOptions or other credential indicators
  if (nodeData.typeOptions?.credentialsField) {
    const field = analyzeCredentialField(nodeData.typeOptions.credentialsField, '');
    if (field) {
      credentialFields.push(field);
    }
  }
  
  // Special handling for specific node types that we know need credentials
  const specialCredentials = getSpecialNodeCredentials(cleanNodeType);
  if (specialCredentials.length > 0) {
    credentialFields.push(...specialCredentials);
  }
  
  // Determine if credentials are required
  const requiresCredentials = credentialFields.length > 0 || needsCredentialsByNodeType(cleanNodeType);
  
  // Remove duplicates
  const uniqueFields = credentialFields.filter((field, index, self) => 
    index === self.findIndex(f => f.name === field.name)
  );
  
  console.log('✅ Dynamic analysis result:', {
    serviceName,
    requiresCredentials,
    fieldsFound: uniqueFields.length,
    fields: uniqueFields.map(f => f.name)
  });
  
  return {
    requiresCredentials,
    serviceName,
    fields: uniqueFields,
    helpUrl: getServiceHelpUrl(cleanNodeType)
  };
};

const analyzeParameterField = (key: string, value: any): DynamicCredentialField | null => {
  const lowerKey = key.toLowerCase();
  
  // Skip non-credential parameters
  if (!isCredentialField(lowerKey)) {
    return null;
  }
  
  return {
    name: key,
    label: formatFieldLabel(key),
    type: determineFieldType(key),
    required: true, // Parameters are typically required
    placeholder: generatePlaceholder(key),
    description: generateDescription(key)
  };
};

const analyzeCredentialField = (key: string, value: any): DynamicCredentialField => {
  return {
    name: key,
    label: formatFieldLabel(key),
    type: determineFieldType(key),
    required: true,
    placeholder: generatePlaceholder(key),
    description: generateDescription(key)
  };
};

const isCredentialField = (key: string): boolean => {
  const credentialKeywords = [
    'api', 'token', 'key', 'secret', 'password', 'auth', 'credential',
    'access', 'client', 'bearer', 'oauth', 'webhook', 'bot', 'user',
    'username', 'email', 'host', 'database', 'connection'
  ];
  
  const lowerKey = key.toLowerCase();
  return credentialKeywords.some(keyword => lowerKey.includes(keyword));
};

const determineFieldType = (key: string): 'text' | 'password' | 'email' | 'url' | 'number' => {
  const lowerKey = key.toLowerCase();
  
  if (lowerKey.includes('password') || lowerKey.includes('secret') || 
      lowerKey.includes('token') || lowerKey.includes('key')) {
    return 'password';
  }
  
  if (lowerKey.includes('email')) {
    return 'email';
  }
  
  if (lowerKey.includes('url') || lowerKey.includes('host') || lowerKey.includes('endpoint')) {
    return 'url';
  }
  
  if (lowerKey.includes('port') || lowerKey.includes('timeout')) {
    return 'number';
  }
  
  return 'text';
};

const formatFieldLabel = (key: string): string => {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim();
};

const generatePlaceholder = (key: string): string => {
  const lowerKey = key.toLowerCase();
  
  const placeholders: { [key: string]: string } = {
    'apikey': 'Enter your API key',
    'token': 'Enter your access token',
    'accesstoken': 'Enter your access token',
    'clientid': 'Enter your client ID',
    'clientsecret': 'Enter your client secret',
    'username': 'Enter your username',
    'password': 'Enter your password',
    'email': 'Enter your email address',
    'host': 'Enter host URL',
    'database': 'Enter database name',
    'port': 'Enter port number'
  };
  
  for (const [pattern, placeholder] of Object.entries(placeholders)) {
    if (lowerKey.includes(pattern)) {
      return placeholder;
    }
  }
  
  return `Enter your ${formatFieldLabel(key).toLowerCase()}`;
};

const generateDescription = (key: string): string => {
  const lowerKey = key.toLowerCase();
  
  const descriptions: { [key: string]: string } = {
    'apikey': 'Your API key for authentication',
    'token': 'Access token for API authentication',
    'accesstoken': 'OAuth access token',
    'clientid': 'OAuth client identifier',
    'clientsecret': 'OAuth client secret (keep confidential)',
    'webhookurl': 'URL endpoint for webhook notifications'
  };
  
  for (const [pattern, description] of Object.entries(descriptions)) {
    if (lowerKey.includes(pattern)) {
      return description;
    }
  }
  
  return `Required for ${formatFieldLabel(key).toLowerCase()} authentication`;
};

const getSpecialNodeCredentials = (nodeType: string): DynamicCredentialField[] => {
  // Only define minimal cases where we absolutely know credentials are needed
  // but they might not be in the node JSON yet
  const specialCases: { [key: string]: DynamicCredentialField[] } = {
    'telegram': [{
      name: 'accessToken',
      label: 'Bot Token',
      type: 'password',
      required: true,
      placeholder: 'Enter your Telegram bot token',
      description: 'Bot token from @BotFather'
    }],
    'discord': [{
      name: 'token',
      label: 'Bot Token',
      type: 'password',
      required: true,
      placeholder: 'Enter your Discord bot token',
      description: 'Bot token from Discord Developer Portal'
    }],
    'slack': [{
      name: 'accessToken',
      label: 'Bot Token',
      type: 'password',
      required: true,
      placeholder: 'Enter your Slack bot token',
      description: 'Bot User OAuth Token from Slack App'
    }]
  };
  
  return specialCases[nodeType] || [];
};

const needsCredentialsByNodeType = (nodeType: string): boolean => {
  // Nodes that definitely don't need credentials
  const noCredentialsNodes = [
    'webhook', 'code', 'function', 'if', 'switch', 'set', 'merge',
    'schedule', 'wait', 'split', 'sort', 'filter', 'limit', 'rename',
    'datetime', 'crypto', 'html', 'xml', 'json', 'spreadsheet'
  ];
  
  return !noCredentialsNodes.includes(nodeType);
};

const getServiceHelpUrl = (nodeType: string): string | undefined => {
  const helpUrls: { [key: string]: string } = {
    'telegram': 'https://core.telegram.org/bots#how-do-i-create-a-bot',
    'discord': 'https://discord.com/developers/applications',
    'slack': 'https://api.slack.com/apps',
    'openai': 'https://platform.openai.com/api-keys',
    'google': 'https://console.cloud.google.com/apis/credentials',
    'gmail': 'https://console.cloud.google.com/apis/credentials',
    'googlesheets': 'https://console.cloud.google.com/apis/credentials',
    'mysql': 'https://dev.mysql.com/doc/',
    'postgresql': 'https://www.postgresql.org/docs/',
    'mongodb': 'https://docs.mongodb.com/'
  };
  
  return helpUrls[nodeType];
};

export const validateDynamicCredentialValue = (field: DynamicCredentialField, value: string): boolean => {
  if (!value || !value.trim()) {
    return !field.required;
  }
  
  const cleanValue = value.trim();
  
  switch (field.type) {
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanValue);
    case 'url':
      try {
        new URL(cleanValue);
        return true;
      } catch {
        return false;
      }
    case 'number':
      return !isNaN(Number(cleanValue)) && Number(cleanValue) > 0;
    case 'password':
      return cleanValue.length >= 1; // Basic validation
    default:
      return cleanValue.length >= 1;
  }
};

export const getDynamicCredentialStatus = (requirement: DynamicNodeRequirement, credentials: Record<string, any>): 'not_required' | 'empty' | 'partial' | 'configured' | 'invalid' => {
  if (!requirement.requiresCredentials || requirement.fields.length === 0) {
    return 'not_required';
  }
  
  const requiredFields = requirement.fields.filter(f => f.required);
  
  if (requiredFields.length === 0) {
    return 'not_required';
  }
  
  let filledCount = 0;
  let validCount = 0;
  
  for (const field of requiredFields) {
    const value = credentials[field.name];
    if (value && String(value).trim()) {
      filledCount++;
      if (validateDynamicCredentialValue(field, String(value))) {
        validCount++;
      }
    }
  }
  
  if (filledCount === 0) {
    return 'empty';
  }
  
  if (validCount < filledCount) {
    return 'invalid';
  }
  
  if (filledCount < requiredFields.length) {
    return 'partial';
  }
  
  return 'configured';
};
