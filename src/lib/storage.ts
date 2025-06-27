import { AppSettings, ConnectionStatus } from '@/types/settings';

const STORAGE_KEYS = {
  SETTINGS: 'pubnub_developer_tools_settings',
  CONNECTION_STATUS: 'pubnub_connection_status',
} as const;

const DEFAULT_SETTINGS: AppSettings = {
  credentials: {
    publishKey: '',
    subscribeKey: '',
    secretKey: '',
    userId: '',
  },
  environment: {
    origin: 'ps.pndsn.com',
    ssl: true,
    logVerbosity: 'info',
    heartbeatInterval: 300,
  },
  storage: {
    storeMessageHistory: false,
    autoSaveToPubNub: true,
    saveVersionHistory: true,
    maxVersionsToKeep: 50,
  },
};

const DEFAULT_CONNECTION_STATUS: ConnectionStatus = {
  connected: false,
  status: 'disconnected',
  message: 'Not Connected',
};

export const storage = {
  getSettings(): AppSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to ensure all fields exist, removing any deprecated fields
        const cleanedStorage = {
          ...DEFAULT_SETTINGS.storage,
          ...parsed.storage
        };
        // Remove autoSave if it exists (deprecated field)
        delete (cleanedStorage as any).autoSave;
        
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          storage: cleanedStorage
        };
      }
    } catch (error) {
      console.error('Error loading settings from localStorage:', error);
    }
    return DEFAULT_SETTINGS;
  },

  saveSettings(settings: AppSettings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings to localStorage:', error);
    }
  },

  getConnectionStatus(): ConnectionStatus {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CONNECTION_STATUS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading connection status from localStorage:', error);
    }
    return DEFAULT_CONNECTION_STATUS;
  },

  saveConnectionStatus(status: ConnectionStatus): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CONNECTION_STATUS, JSON.stringify(status));
    } catch (error) {
      console.error('Error saving connection status to localStorage:', error);
    }
  },

  clearAll(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.SETTINGS);
      localStorage.removeItem(STORAGE_KEYS.CONNECTION_STATUS);
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  },
};
