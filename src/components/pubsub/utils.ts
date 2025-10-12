import { 
  FIELD_DEFINITIONS, 
  CURRENT_CONFIG_VERSION,
  DEFAULT_FILTER_CONDITION 
} from './constants';
import type { 
  PubSubConfig, 
  PublishFormData, 
  SubscribeFormData, 
  UIState, 
  FilterState,
  FilterCondition 
} from './types';

// Migration functions for version compatibility
const CONFIG_MIGRATIONS: Record<number, (config: any) => any> = {
  1: (config: any) => config, // Initial version, no migration needed
  // Future migrations will be added here as:
  // 2: (config: any) => ({ ...config, newField: defaultValue }),
};

// Migrate config to current version
export const migrateConfig = (config: any): any => {
  const configVersion = config._version || 1;
  let migratedConfig = { ...config };
  
  // Apply migrations sequentially
  for (let v = configVersion; v < CURRENT_CONFIG_VERSION; v++) {
    const migration = CONFIG_MIGRATIONS[v + 1];
    if (migration) {
      migratedConfig = migration(migratedConfig);
    }
  }
  
  // Add current version
  migratedConfig._version = CURRENT_CONFIG_VERSION;
  return migratedConfig;
};

// Convert page settings from storage format to state objects
export const pageSettingsToState = (settings: any) => {
  const publishData: PublishFormData = settings.publish || {};
  const subscribeData: SubscribeFormData = settings.subscribe || {};
  const uiState: UIState = settings.ui || {};
  const filterState: FilterState = {
    logic: settings.filters?.logic || '&&',
    conditions: settings.filters?.conditions || [{ ...DEFAULT_FILTER_CONDITION }]
  };
  
  return {
    publishData,
    subscribeData,
    uiState,
    filterState
  };
};

// Convert individual state objects to pageSettings structure
export const stateToPageSettings = (
  publishData: PublishFormData, 
  subscribeData: SubscribeFormData, 
  uiState: UIState, 
  filterState: FilterState
): PubSubConfig => {
  const pageSettings: PubSubConfig = { 
    publish: publishData,
    subscribe: subscribeData,
    ui: uiState,
    filters: filterState,
    _version: CURRENT_CONFIG_VERSION
  };
  
  return pageSettings;
};

// Create default config structure
export const createDefaultPageSettings = (): PubSubConfig => {
  const defaultSettings: any = { 
    publish: {}, 
    subscribe: { cursor: {} }, 
    ui: {}, 
    filters: { 
      logic: '&&',
      conditions: [{ ...DEFAULT_FILTER_CONDITION }]
    }
  };
  
  // Set defaults from field definitions
  Object.entries(FIELD_DEFINITIONS).forEach(([fullPath, definition]) => {
    const pathParts = fullPath.split('.');
    if (pathParts.length === 2) {
      const [section, field] = pathParts;
      if (!defaultSettings[section]) defaultSettings[section] = {};
      defaultSettings[section][field] = definition.default;
    } else if (pathParts.length === 3) {
      const [section, subsection, field] = pathParts;
      if (!defaultSettings[section]) defaultSettings[section] = {};
      if (!defaultSettings[section][subsection]) defaultSettings[section][subsection] = {};
      defaultSettings[section][subsection][field] = definition.default;
    }
  });
  
  defaultSettings._version = CURRENT_CONFIG_VERSION;
  return defaultSettings;
};

// Deep merge utility for config restoration
export const deepMerge = (target: any, source: any): any => {
  const result = { ...target };
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
};

// Utility to get nested value safely
export const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

// Utility to set nested value
export const setNestedValue = (obj: any, path: string, value: any): void => {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((current, key) => {
    if (!current[key]) current[key] = {};
    return current[key];
  }, obj);
  target[lastKey] = value;
};

// Generate filter expression from filter conditions
export const generateFilterExpression = (conditions: FilterCondition[], logic: '&&' | '||'): string => {
  if (!conditions || conditions.length === 0) return '';
  
  const validConditions = conditions.filter(c => c.field && c.value);
  if (validConditions.length === 0) return '';
  
  const expressions = validConditions.map(condition => {
    const { target, field, operator, value, type } = condition;
    const fieldPath = field.includes('.') ? field : `${target}.${field}`;
    
    // Format value based on type
    let formattedValue = value;
    if (type === 'string') {
      // Escape single quotes in string values
      formattedValue = `'${value.replace(/'/g, "\\'")}'`;
    } else if (type === 'boolean') {
      formattedValue = value.toLowerCase() === 'true' ? 'true' : 'false';
    }
    
    // Handle different operators
    switch (operator) {
      case 'contains':
        return `${fieldPath}.indexOf(${formattedValue}) >= 0`;
      case '!contains':
        return `${fieldPath}.indexOf(${formattedValue}) < 0`;
      case 'startsWith':
        return `${fieldPath}.indexOf(${formattedValue}) == 0`;
      case 'endsWith':
        const lengthExpr = type === 'string' 
          ? `${fieldPath}.length - ${value.length}`
          : `${fieldPath}.length - ${formattedValue}.length`;
        return `${fieldPath}.lastIndexOf(${formattedValue}) == ${lengthExpr}`;
      default:
        return `${fieldPath} ${operator} ${formattedValue}`;
    }
  });
  
  // Join with the specified logic operator
  return expressions.length === 1 
    ? expressions[0] 
    : expressions.map(exp => `(${exp})`).join(` ${logic} `);
};

// Validate channel name
export const validateChannel = (channel: string): { isValid: boolean; error?: string } => {
  if (!channel || channel.trim() === '') {
    return { isValid: false, error: 'Channel name is required' };
  }
  
  // PubNub channel name restrictions
  const invalidChars = /[^\w\-\.,:]/;
  if (invalidChars.test(channel)) {
    return { 
      isValid: false, 
      error: 'Channel names can only contain letters, numbers, hyphens, underscores, periods, colons, and commas' 
    };
  }
  
  if (channel.length > 92) {
    return { isValid: false, error: 'Channel name must be 92 characters or less' };
  }
  
  return { isValid: true };
};

// Validate JSON string
export const validateJSON = (jsonString: string): { isValid: boolean; error?: string; parsed?: any } => {
  if (!jsonString || jsonString.trim() === '') {
    return { isValid: false, error: 'JSON is required' };
  }
  
  try {
    const parsed = JSON.parse(jsonString);
    return { isValid: true, parsed };
  } catch (error) {
    return { 
      isValid: false, 
      error: error instanceof Error ? error.message : 'Invalid JSON format' 
    };
  }
};

// Validate custom message type
export const validateCustomMessageType = (messageType: string): { isValid: boolean; error?: string } => {
  if (!messageType) {
    return { isValid: true }; // Optional field
  }
  
  if (messageType.length < 3 || messageType.length > 50) {
    return { 
      isValid: false, 
      error: 'Custom message type must be between 3 and 50 characters' 
    };
  }
  
  const validPattern = /^[a-zA-Z0-9\-_]+$/;
  if (!validPattern.test(messageType)) {
    return { 
      isValid: false, 
      error: 'Custom message type can only contain letters, numbers, hyphens, and underscores' 
    };
  }
  
  return { isValid: true };
};

// Format timestamp for display
export const formatTimestamp = (timetoken: string): string => {
  try {
    // PubNub timetokens are in 10ths of microseconds
    const timestamp = parseInt(timetoken) / 10000;
    const date = new Date(timestamp);
    const timeString = date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    // Add milliseconds manually
    const ms = date.getMilliseconds().toString().padStart(3, '0');
    return `${timeString}.${ms}`;
  } catch {
    return timetoken;
  }
};

// Parse comma-separated channels
export const parseChannels = (channelsString: string): string[] => {
  if (!channelsString) return [];
  return channelsString
    .split(',')
    .map(ch => ch.trim())
    .filter(ch => ch.length > 0);
};

// Copy to clipboard utility
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};