import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type PubNub from 'pubnub';
import { storage } from '@/lib/storage';
import { AppSettings } from '@/types/settings';
import { usePubNub, PubNubHookOptions, notifySettingsChange } from '@/hooks/usePubNub';
import { InstanceRegistry } from '@/lib/instance-registry';
import { ensurePubNubSdk } from '@/lib/sdk-loader';

export interface PubNubContextValue {
  defaultPubnub: any | null;
  settings: AppSettings;
  isGloballyConnected: boolean;
  globalConnectionError: string | null;
  refreshConnections: () => void;
  createInstance: (options: PubNubHookOptions) => any;
  updateSettings: (newSettings: AppSettings) => void;
  getConnectionStatus: () => {
    connected: number;
    total: number;
    errors: string[];
  };
  // Debug information methods
  getDebugInfo: () => {
    instances: any;
  };
}

const PubNubContext = createContext<PubNubContextValue | undefined>(undefined);

export interface PubNubProviderProps {
  children: React.ReactNode;
}

declare global {
  interface Window {
    PubNub?: typeof PubNub;
  }
}

export function PubNubProvider({ children }: PubNubProviderProps): JSX.Element {
  const [settings, setSettings] = useState<AppSettings>(() => storage.getSettings());
  const [activeInstances, setActiveInstances] = useState<Map<string, any>>(new Map());
  const [instanceErrors, setInstanceErrors] = useState<Map<string, string>>(new Map());
  
  const settingsRef = useRef(settings);
  const storageEventListenerRef = useRef<((e: StorageEvent) => void) | null>(null);
  const instanceRegistry = InstanceRegistry.getInstance();

  // Default PubNub instance using the hook
  const {
    pubnub: defaultPubnub,
    isConnected: isDefaultConnected,
    connectionError: defaultConnectionError,
    reconnect: reconnectDefault
  } = usePubNub({
    instanceId: 'context-default',
    userId: 'context-default-user',
    onConnectionError: (error) => {
      console.error('Default PubNub connection error:', error);
    },
    onConnectionSuccess: () => {
      console.log('Default PubNub connection established');
    }
  });

  // Update settings and notify all hooks
  const updateSettings = useCallback((newSettings: AppSettings) => {
    console.log('🔧 Updating global PubNub settings:', newSettings);
    
    setSettings(newSettings);
    settingsRef.current = newSettings;
    storage.saveSettings(newSettings);
    
    // Notify all usePubNub hooks about settings change
    notifySettingsChange();
  }, []);

  useEffect(() => {
    ensurePubNubSdk(settings.sdkVersion).catch((error) => {
      console.error('Failed to load PubNub SDK version', settings.sdkVersion, error);
    });
  }, [settings.sdkVersion]);

  // Refresh all connections
  const refreshConnections = useCallback(() => {
    console.log('🔄 Refreshing all PubNub connections...');
    
    // Clear errors
    setInstanceErrors(new Map());
    
    // Reconnect default instance
    reconnectDefault();
    
    // Notify all hooks to reconnect
    notifySettingsChange();
  }, [reconnectDefault]);

  // Create new instance with specific options
  const createInstance = useCallback((options: PubNubHookOptions): any => {
    const instanceId = options.instanceId || `custom-${Date.now()}`;
    console.log(`🆕 Creating custom PubNub instance: ${instanceId}`);
    
    try {
      if (typeof window === 'undefined' || !window.PubNub) {
        throw new Error('PubNub SDK not available');
      }

      const currentSettings = settingsRef.current;
      
      if (!currentSettings.credentials.publishKey || !currentSettings.credentials.subscribeKey) {
        throw new Error('Missing required PubNub credentials');
      }

      const pubnubConfig: any = {
        publishKey: currentSettings.credentials.publishKey,
        subscribeKey: currentSettings.credentials.subscribeKey,
        userId: options.userId || currentSettings.credentials.userId || `user-${instanceId}`,
        origin: currentSettings.environment.origin === 'custom' 
          ? currentSettings.environment.customOrigin 
          : currentSettings.environment.origin,
        ssl: currentSettings.environment.ssl,
        logVerbosity: currentSettings.environment.logVerbosity,
        heartbeatInterval: currentSettings.environment.heartbeatInterval,
        enableEventEngine: currentSettings.environment.enableEventEngine,
      };

      // Add optional configurations
      if (currentSettings.credentials.pamToken) {
        pubnubConfig.authKey = currentSettings.credentials.pamToken;
      }

      const instance = new window.PubNub(pubnubConfig);
      
      // Track the instance
      setActiveInstances(prev => new Map(prev).set(instanceId, instance));
      
      // Set up error tracking
      const originalTime = instance.time;
      instance.time = async (): Promise<any> => {
        try {
          const result = await originalTime.call(instance);
          setInstanceErrors(prev => {
            const newMap = new Map(prev);
            newMap.delete(instanceId);
            return newMap;
          });
          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Connection failed';
          setInstanceErrors(prev => new Map(prev).set(instanceId, errorMessage));
          throw error;
        }
      };

      console.log(`✅ Created custom PubNub instance ${instanceId}:`, {
        userId: pubnubConfig.userId,
        origin: pubnubConfig.origin,
        eventEngine: pubnubConfig.enableEventEngine ? 'enabled' : 'legacy',
      });

      return instance;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create instance';
      console.error(`Failed to create PubNub instance ${instanceId}:`, error);
      setInstanceErrors(prev => new Map(prev).set(instanceId, errorMessage));
      throw error;
    }
  }, []);

  // Get overall connection status
  const getConnectionStatus = useCallback(() => {
    const errors: string[] = [];
    let connected = 0;
    let total = 1; // Start with 1 for default instance

    // Check default instance
    if (isDefaultConnected) {
      connected += 1;
    } else if (defaultConnectionError) {
      errors.push(`Default: ${defaultConnectionError}`);
    }

    // Check other instances
    total += activeInstances.size;
    instanceErrors.forEach((error, instanceId) => {
      errors.push(`${instanceId}: ${error}`);
    });

    // Count connected instances (those without errors)
    const connectedCustomInstances = activeInstances.size - instanceErrors.size;
    connected += connectedCustomInstances;

    return {
      connected,
      total,
      errors,
    };
  }, [isDefaultConnected, defaultConnectionError, activeInstances.size, instanceErrors]);
  
  // Get debug info
  const getDebugInfo = useCallback(() => {
    return {
      instances: instanceRegistry.getDebugInfo(),
    };
  }, [instanceRegistry]);

  // Listen for settings changes from localStorage (for cross-tab synchronization)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'pubnub_developer_tools_settings' && e.newValue) {
        try {
          const newSettings = JSON.parse(e.newValue);
          console.log('🔧 Settings changed in another tab, updating...');
          setSettings(newSettings);
          settingsRef.current = newSettings;
          notifySettingsChange();
        } catch (error) {
          console.error('Error parsing settings from storage event:', error);
        }
      }
    };

    storageEventListenerRef.current = handleStorageChange;
    window.addEventListener('storage', handleStorageChange);

    return () => {
      if (storageEventListenerRef.current) {
        window.removeEventListener('storage', storageEventListenerRef.current);
      }
    };
  }, []);

  // Cleanup active instances on unmount
  useEffect(() => {
    return () => {
      activeInstances.forEach((instance, instanceId) => {
        try {
          console.log(`🧹 Cleaning up PubNub instance: ${instanceId}`);
          instance.removeAllListeners();
          instance.unsubscribeAll();
        } catch (error) {
          console.warn(`Error cleaning up instance ${instanceId}:`, error);
        }
      });
    };
  }, [activeInstances]);

  // Monitor settings for credential changes
  useEffect(() => {
    const previousSettings = settingsRef.current;
    settingsRef.current = settings;

    // Check if we need to refresh connections due to credential changes
    if (previousSettings.credentials.publishKey !== settings.credentials.publishKey ||
        previousSettings.credentials.subscribeKey !== settings.credentials.subscribeKey ||
        previousSettings.credentials.pamToken !== settings.credentials.pamToken ||
        previousSettings.environment.origin !== settings.environment.origin ||
        previousSettings.environment.customOrigin !== settings.environment.customOrigin ||
        previousSettings.environment.enableEventEngine !== settings.environment.enableEventEngine) {
      console.log('🔧 Critical settings changed, refreshing all connections...');
      refreshConnections();
    }
  }, [settings, refreshConnections]);

  const contextValue: PubNubContextValue = {
    defaultPubnub,
    settings,
    isGloballyConnected: isDefaultConnected,
    globalConnectionError: defaultConnectionError,
    refreshConnections,
    createInstance,
    updateSettings,
    getConnectionStatus,
    getDebugInfo,
  };

  return (
    <PubNubContext.Provider value={contextValue}>
      {children}
    </PubNubContext.Provider>
  );
}

export function usePubNubContext(): PubNubContextValue {
  const context = useContext(PubNubContext);
  if (context === undefined) {
    throw new Error('usePubNubContext must be used within a PubNubProvider');
  }
  return context;
}

// Hook for getting global connection info without subscribing to all context changes
export function usePubNubConnectionStatus() {
  const { getConnectionStatus } = usePubNubContext();
  const [status, setStatus] = useState(() => getConnectionStatus());

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(getConnectionStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, [getConnectionStatus]);

  return status;
}
