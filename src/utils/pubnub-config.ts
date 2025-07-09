import { AppSettings } from '@/types/settings';
import { PubNubConfig } from '@/types/pubnub';

/**
 * Creates a PubNub configuration object from app settings
 */
export function createPubNubConfig(
  settings: AppSettings,
  overrides: Partial<PubNubConfig> = {}
): PubNubConfig {
  const config: PubNubConfig = {
    publishKey: settings.credentials.publishKey,
    subscribeKey: settings.credentials.subscribeKey,
    userId: settings.credentials.userId || 'default-user',
    origin: settings.environment.origin === 'custom' 
      ? settings.environment.customOrigin 
      : settings.environment.origin,
    ssl: settings.environment.ssl,
    logVerbosity: settings.environment.logVerbosity,
    heartbeatInterval: settings.environment.heartbeatInterval,
    ...overrides,
  };

  // Add optional configurations
  if (settings.credentials.secretKey) {
    config.secretKey = settings.credentials.secretKey;
  }

  if (settings.credentials.pamToken) {
    config.authKey = settings.credentials.pamToken;
  }

  return config;
}

/**
 * Validates PubNub configuration for required fields
 */
export function validatePubNubConfig(config: PubNubConfig): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.publishKey || config.publishKey.trim() === '') {
    errors.push('Publish key is required');
  }

  if (!config.subscribeKey || config.subscribeKey.trim() === '') {
    errors.push('Subscribe key is required');
  }

  if (!config.userId || config.userId.trim() === '') {
    errors.push('User ID is required');
  }

  // Validate origin format if custom
  if (config.origin && config.origin !== 'ps.pndsn.com') {
    try {
      new URL(`https://${config.origin}`);
    } catch {
      errors.push('Invalid origin format');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Checks if configuration uses demo keys
 */
export function isDemoConfiguration(config: PubNubConfig): boolean {
  const demoPatterns = [
    'demo',
    'pub-c-',
    'sub-c-',
    'your_',
    'enter_',
  ];

  return demoPatterns.some(pattern => 
    config.publishKey.toLowerCase().includes(pattern) ||
    config.subscribeKey.toLowerCase().includes(pattern)
  );
}

/**
 * Creates a configuration hash for instance registry
 */
export function createConfigHash(config: PubNubConfig, instanceId: string): string {
  const configString = JSON.stringify({
    publishKey: config.publishKey,
    subscribeKey: config.subscribeKey,
    userId: config.userId,
    origin: config.origin,
    ssl: config.ssl,
    secretKey: config.secretKey || '',
    authKey: config.authKey || '',
    instanceId,
  });

  // Simple hash function (in production, consider using a proper hash library)
  let hash = 0;
  for (let i = 0; i < configString.length; i++) {
    const char = configString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return hash.toString(36);
}

/**
 * Compares two configurations to check if they're equivalent
 */
export function areConfigsEquivalent(
  config1: PubNubConfig,
  config2: PubNubConfig
): boolean {
  const keys: (keyof PubNubConfig)[] = [
    'publishKey',
    'subscribeKey',
    'userId',
    'origin',
    'ssl',
    'logVerbosity',
    'heartbeatInterval',
    'secretKey',
    'authKey',
  ];

  return keys.every(key => {
    const val1 = config1[key];
    const val2 = config2[key];
    
    // Handle undefined/empty string equivalence
    if ((!val1 || val1 === '') && (!val2 || val2 === '')) {
      return true;
    }
    
    return val1 === val2;
  });
}

/**
 * Creates a user-friendly display string for configuration
 */
export function getConfigDisplayString(config: PubNubConfig): string {
  const parts = [
    `User: ${config.userId}`,
    `Origin: ${config.origin || 'ps.pndsn.com'}`,
    `SSL: ${config.ssl ? 'Yes' : 'No'}`,
  ];

  if (config.secretKey) {
    parts.push('Secret Key: Yes');
  }

  if (config.authKey) {
    parts.push('Auth Token: Yes');
  }

  return parts.join(' | ');
}

/**
 * Extracts connection-relevant settings for change detection
 */
export function extractConnectionSettings(settings: AppSettings) {
  return {
    publishKey: settings.credentials.publishKey,
    subscribeKey: settings.credentials.subscribeKey,
    secretKey: settings.credentials.secretKey,
    userId: settings.credentials.userId,
    pamToken: settings.credentials.pamToken,
    origin: settings.environment.origin,
    customOrigin: settings.environment.customOrigin,
    ssl: settings.environment.ssl,
    logVerbosity: settings.environment.logVerbosity,
    heartbeatInterval: settings.environment.heartbeatInterval,
  };
}

/**
 * Checks if settings contain valid credentials for PAM operations
 */
export function hasPAMCapabilities(settings: AppSettings): boolean {
  return !!(
    settings.credentials.publishKey &&
    settings.credentials.subscribeKey &&
    settings.credentials.secretKey &&
    !isDemoConfiguration(createPubNubConfig(settings))
  );
}

/**
 * Gets recommended origin based on region or use case
 */
export function getRecommendedOrigin(region?: string): string {
  const origins = {
    'us-east': 'ps.pndsn.com',
    'us-west': 'ps-pdx-1.pndsn.com',
    'europe': 'ps-ie-1.pndsn.com',
    'asia': 'ps-ap-1.pndsn.com',
  };

  return origins[region as keyof typeof origins] || 'ps.pndsn.com';
}

/**
 * Creates a debug-friendly representation of the config
 */
export function createConfigDebugInfo(config: PubNubConfig) {
  return {
    publishKey: config.publishKey ? `${config.publishKey.substring(0, 8)}...` : 'Not set',
    subscribeKey: config.subscribeKey ? `${config.subscribeKey.substring(0, 8)}...` : 'Not set',
    userId: config.userId,
    origin: config.origin,
    ssl: config.ssl,
    logVerbosity: config.logVerbosity,
    heartbeatInterval: config.heartbeatInterval,
    hasSecretKey: !!config.secretKey,
    hasAuthKey: !!config.authKey,
    isDemoConfig: isDemoConfiguration(config),
  };
}