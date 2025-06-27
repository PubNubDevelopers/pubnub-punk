import { AppSettings } from '@/types/settings';

const STORAGE_KEYS = {
  SETTINGS: 'pubnub_developer_tools_settings',
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


  clearAll(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  },
};
