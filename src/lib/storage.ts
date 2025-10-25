import { AppSettings } from '@/types/settings';

const STORAGE_KEYS = {
  SETTINGS: 'pubnub_developer_tools_settings',
} as const;

const DEFAULT_SETTINGS: AppSettings = {
  credentials: {
    publishKey: '',
    subscribeKey: '',
    userId: '',
    pamEnabled: false,
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
  sdkVersion: '9.6.1',
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

  // Generic storage methods for other components
  getItem<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      if (item) {
        return JSON.parse(item);
      }
    } catch (error) {
      console.error(`Error getting item '${key}' from localStorage:`, error);
    }
    return null;
  },

  setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting item '${key}' in localStorage:`, error);
    }
  },

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing item '${key}' from localStorage:`, error);
    }
  },

  clearAll(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  },

  // PAM utility functions
  isPamEnabled(): boolean {
    const settings = this.getSettings();
    return settings.credentials.pamEnabled ?? false;
  },

  getPamToken(): string | undefined {
    const settings = this.getSettings();
    return settings.credentials.pamToken;
  },
};
