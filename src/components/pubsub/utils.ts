import { FIELD_DEFINITIONS, CURRENT_CONFIG_VERSION } from './constants';
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
    conditions: settings.filters?.conditions || []
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
      conditions: []
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
export const generateFilterExpression = (
  conditions: FilterCondition[],
  defaultLogic: '&&' | '||',  // Fallback logic if logicAfter not specified
): string => {
  if (!conditions || conditions.length === 0) return '';

  const validConditions = conditions.filter((condition) => {
    if (!condition.field.trim()) {
      return false;
    }

    if (condition.type === 'boolean') {
      return true;
    }

    return condition.value.trim().length > 0;
  });

  if (validConditions.length === 0) return '';

  if (validConditions.length === 1) {
    const condition = validConditions[0];
    const fieldPath = buildFilterFieldPath(condition);
    const valueExpression = formatFilterValue(condition);

    switch (condition.operator) {
      case 'CONTAINS':
        return `${fieldPath} CONTAINS ${valueExpression}`;
      case 'NOT_CONTAINS':
        return `!(${fieldPath} CONTAINS ${valueExpression})`;
      case 'LIKE':
        return `${fieldPath} LIKE ${valueExpression}`;
      default:
        return `${fieldPath} ${condition.operator} ${valueExpression}`;
    }
  }

  // Build expression with per-filter logic
  let expression = '';
  validConditions.forEach((condition, index) => {
    const fieldPath = buildFilterFieldPath(condition);
    const valueExpression = formatFilterValue(condition);

    let conditionExpr = '';
    switch (condition.operator) {
      case 'CONTAINS':
        conditionExpr = `${fieldPath} CONTAINS ${valueExpression}`;
        break;
      case 'NOT_CONTAINS':
        conditionExpr = `!(${fieldPath} CONTAINS ${valueExpression})`;
        break;
      case 'LIKE':
        conditionExpr = `${fieldPath} LIKE ${valueExpression}`;
        break;
      default:
        conditionExpr = `${fieldPath} ${condition.operator} ${valueExpression}`;
    }

    if (index === 0) {
      expression = `(${conditionExpr})`;
    } else {
      // Use logicAfter from previous condition, or default logic
      const logicOperator = validConditions[index - 1].logicAfter || defaultLogic;
      expression += ` ${logicOperator} (${conditionExpr})`;
    }
  });

  return expression;
};

const buildFilterFieldPath = (condition: FilterCondition): string => {
  const field = condition.field.trim();
  if (!field) {
    return condition.target;
  }

  if (
    field.startsWith('data.') ||
    field.startsWith('meta.') ||
    field.startsWith(`${condition.target}.`)
  ) {
    return field;
  }

  if (field.startsWith('[')) {
    return `${condition.target}${field}`;
  }

  return `${condition.target}.${field}`;
};

const formatFilterValue = (condition: FilterCondition): string => {
  if (condition.type === 'boolean') {
    return condition.value === 'false' ? "'false'" : "'true'";
  }

  if (condition.type === 'number') {
    return condition.value || '0';
  }

  if (condition.type === 'expression') {
    return condition.value || '';
  }

  const escaped = condition.value.replace(/'/g, "\\'");
  return `'${escaped}'`;
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
