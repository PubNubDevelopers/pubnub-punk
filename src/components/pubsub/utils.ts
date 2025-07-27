// PubSub Utility Functions
// Extracted from original monolithic pubsub.tsx for modular architecture

import {
  PubSubConfig,
  PublishFormData,
  SubscribeFormData,
  UIState,
  FilterState,
  FilterConfig,
  FIELD_DEFINITIONS,
  CURRENT_CONFIG_VERSION,
  CONFIG_MIGRATIONS,
  ConfigMigration,
  DeepPartial
} from './types';

/**
 * Utility to get nested value safely from an object using dot notation
 * @param obj - The object to get the value from
 * @param path - Dot-separated path (e.g., 'cursor.timetoken')
 * @returns The value at the path or undefined
 */
export const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

/**
 * Utility to set nested value in an object using dot notation
 * @param obj - The object to set the value in
 * @param path - Dot-separated path (e.g., 'cursor.timetoken')
 * @param value - The value to set
 */
export const setNestedValue = (obj: any, path: string, value: any): void => {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((current, key) => {
    if (!current[key]) current[key] = {};
    return current[key];
  }, obj);
  target[lastKey] = value;
};

/**
 * Deep merge utility for config restoration
 * @param target - The target object to merge into
 * @param source - The source object to merge from
 * @returns Merged object
 */
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

/**
 * Convert individual state objects to pageSettings structure
 * @param publishData - Publish form data
 * @param subscribeData - Subscribe form data
 * @param uiState - UI state data
 * @param filterState - Filter state data
 * @returns Complete PubSub configuration object
 */
export const stateToPageSettings = (
  publishData: PublishFormData,
  subscribeData: SubscribeFormData,
  uiState: UIState,
  filterState: FilterState
): PubSubConfig => {
  const pageSettings: PubSubConfig = {
    publish: { ...publishData },
    subscribe: { ...subscribeData },
    ui: { ...uiState },
    filters: { ...filterState },
    _version: CURRENT_CONFIG_VERSION
  };

  return pageSettings;
};

/**
 * Migrate config to current version
 * @param config - Configuration object to migrate
 * @returns Migrated configuration
 */
export const migrateConfig = (config: any): PubSubConfig => {
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

/**
 * Create default config structure based on FIELD_DEFINITIONS
 * @returns Default configuration object
 */
export const createDefaultPageSettings = (): PubSubConfig => {
  const defaultSettings: any = {
    publish: {},
    subscribe: { cursor: {} },
    ui: {},
    filters: { 
      conditions: [{ 
        id: 1, 
        target: 'message', 
        field: '', 
        operator: '==', 
        value: '', 
        type: 'string' 
      }],
      logic: '&&'
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
  return defaultSettings as PubSubConfig;
};

/**
 * Validate channel name format
 * @param channel - Channel name to validate
 * @returns True if valid, false otherwise
 */
export const isValidChannelName = (channel: string): boolean => {
  if (!channel || channel.trim().length === 0) return false;
  // Basic validation - no spaces, commas handled elsewhere
  return !/\s/.test(channel.trim());
};

/**
 * Parse comma-separated channel list and validate each channel
 * @param channelString - Comma-separated channel string
 * @returns Array of valid channel names
 */
export const parseChannels = (channelString: string): string[] => {
  if (!channelString) return [];
  return channelString
    .split(',')
    .map(ch => ch.trim())
    .filter(ch => ch.length > 0);
};

/**
 * Generate filter expression from filter configurations
 * @param filters - Array of filter configurations
 * @param logic - Logic operator ('&&' or '||')
 * @returns Filter expression string
 */
export const generateFilterExpression = (filters: FilterConfig[], logic: string): string => {
  if (!filters || filters.length === 0) return 'No filters configured';
  
  const validFilters = filters.filter(f => f.field && f.value);
  if (validFilters.length === 0) return 'No valid filters configured';

  const expressions = validFilters.map(filter => {
    const { target, field, operator, value, type } = filter;
    
    // Handle string values with quotes
    let formattedValue = value;
    if (type === 'string' || ['contains', 'like'].includes(operator.toLowerCase())) {
      formattedValue = `"${value}"`;
    }

    return `${target}.${field} ${operator} ${formattedValue}`;
  });

  return expressions.join(` ${logic} `);
};

/**
 * Validate filter configuration
 * @param filter - Filter configuration to validate
 * @returns True if valid, false otherwise
 */
export const isValidFilter = (filter: FilterConfig): boolean => {
  return !!(filter.target && filter.field && filter.operator && filter.value);
};

/**
 * Create a new filter with default values
 * @param id - Unique ID for the filter
 * @returns New filter configuration
 */
export const createDefaultFilter = (id: number): FilterConfig => ({
  id,
  target: 'message',
  field: '',
  operator: '==',
  value: '',
  type: 'string'
});

/**
 * Format message payload for display
 * @param message - Raw message payload
 * @returns Formatted string
 */
export const formatMessagePayload = (message: any): string => {
  if (typeof message === 'string') {
    try {
      // Try to parse and re-stringify for pretty formatting
      const parsed = JSON.parse(message);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return message;
    }
  }
  return JSON.stringify(message, null, 2);
};

/**
 * Validate JSON string
 * @param jsonString - String to validate
 * @returns True if valid JSON, false otherwise
 */
export const isValidJSON = (jsonString: string): boolean => {
  try {
    JSON.parse(jsonString);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate TTL (Time To Live) value
 * @param ttl - TTL string to validate
 * @returns True if valid, false otherwise
 */
export const isValidTTL = (ttl: string): boolean => {
  if (!ttl) return true; // Empty is valid (no TTL)
  const num = parseInt(ttl, 10);
  return !isNaN(num) && num > 0;
};

/**
 * Validate heartbeat interval
 * @param heartbeat - Heartbeat value to validate
 * @returns True if valid, false otherwise
 */
export const isValidHeartbeat = (heartbeat: number): boolean => {
  return !isNaN(heartbeat) && heartbeat >= 10 && heartbeat <= 3600; // 10 seconds to 1 hour
};

/**
 * Generate a unique ID for filters or other items
 * @returns Unique timestamp-based ID
 */
export const generateUniqueId = (): number => {
  return Date.now() + Math.floor(Math.random() * 1000);
};

/**
 * Debounce function for input handling
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};