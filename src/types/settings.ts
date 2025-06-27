export interface PubNubCredentials {
  publishKey: string;
  subscribeKey: string;
  secretKey?: string;
  userId: string;
}

export interface EnvironmentSettings {
  origin: string;
  ssl: boolean;
  logVerbosity: 'debug' | 'info' | 'error' | 'none';
  heartbeatInterval: number;
}

export interface StoragePreferences {
  storeMessageHistory: boolean;
  autoSaveToPubNub: boolean;
  saveVersionHistory: boolean;
  maxVersionsToKeep: number;
}

export interface ConfigVersion {
  timetoken: string;
  timestamp: string;
  version: number;
  description?: string;
  data: any;
  publisher: string;
}

export interface VersionedConfig {
  timestamp: string;
  version: number;
  configType: string;
  userId: string;
  data: any;
  metadata: {
    description?: string;
    tags?: string[];
  };
}

export interface AppSettings {
  credentials: PubNubCredentials;
  environment: EnvironmentSettings;
  storage: StoragePreferences;
}

export interface ConnectionStatus {
  connected: boolean;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  message?: string;
}
