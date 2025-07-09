import { useState, useEffect, useRef, useCallback } from 'react';
import { storage } from '@/lib/storage';
import { AppSettings } from '@/types/settings';
import { InstanceRegistry } from '@/lib/instance-registry';

export interface PubNubHookOptions {
  userId?: string;
  instanceId?: string;
  autoConnect?: boolean;
  onConnectionError?: (error: string) => void;
  onConnectionSuccess?: () => void;
}

export interface PubNubHookResult {
  pubnub: any | null;
  isReady: boolean;
  isConnected: boolean;
  connectionError: string | null;
  reconnect: () => void;
  disconnect: () => void;
}

// Global registries for instances (stateless operations only)
const legacyInstanceRegistry = new Map<string, any>();
const instanceRegistry = InstanceRegistry.getInstance();

// Settings change listeners
const settingsListeners = new Set<() => void>();

export function usePubNub(options: PubNubHookOptions = {}): PubNubHookResult {
  const {
    userId: customUserId,
    instanceId = 'default',
    autoConnect = true,
    onConnectionError,
    onConnectionSuccess,
  } = options;

  const [pubnub, setPubnub] = useState<any | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const attemptsRef = useRef(0);
  const maxAttempts = 50;
  const settingsRef = useRef<AppSettings | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const clearError = useCallback(() => {
    setConnectionError(null);
  }, []);

  const validateConnection = useCallback(async (instance: any): Promise<boolean> => {
    try {
      await instance.time();
      setIsConnected(true);
      setConnectionError(null);
      onConnectionSuccess?.();
      return true;
    } catch (error) {
      console.error('PubNub connection validation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Connection validation failed';
      setConnectionError(errorMessage);
      setIsConnected(false);
      onConnectionError?.(errorMessage);
      return false;
    }
  }, [onConnectionError, onConnectionSuccess]);

  const createPubNubInstance = useCallback((settings: AppSettings): any | null => {
    try {
      if (!settings.credentials.publishKey || !settings.credentials.subscribeKey) {
        const error = 'Missing required PubNub credentials (publish key or subscribe key)';
        setConnectionError(error);
        onConnectionError?.(error);
        return null;
      }

      // Generate instance key for registry
      const instanceKey = instanceRegistry.generateKey(instanceId, settings);
      
      // Check if instance already exists and settings haven't changed
      if (!instanceRegistry.hasSettingsChanged(instanceKey, settings)) {
        const existingEntry = instanceRegistry.get(instanceKey);
        if (existingEntry) {
          console.log(`🔄 Reusing existing PubNub instance for ${instanceId}`);
          return existingEntry.instance;
        }
      }

      const pubnubConfig: any = {
        publishKey: settings.credentials.publishKey,
        subscribeKey: settings.credentials.subscribeKey,
        userId: customUserId || settings.credentials.userId || `user-${instanceId}`,
        origin: settings.environment.origin === 'custom' 
          ? settings.environment.customOrigin 
          : settings.environment.origin,
        ssl: settings.environment.ssl,
        logVerbosity: settings.environment.logVerbosity,
        heartbeatInterval: settings.environment.heartbeatInterval,
      };

      // Add optional configurations
      if (settings.credentials.secretKey) {
        pubnubConfig.secretKey = settings.credentials.secretKey;
      }

      if (settings.credentials.pamToken) {
        pubnubConfig.authKey = settings.credentials.pamToken;
      }

      const instance = new window.PubNub(pubnubConfig);
      
      // Store in new registry
      instanceRegistry.register(instanceKey, instance, instanceId, settings);
      
      console.log(`✅ Created new PubNub instance for ${instanceId}:`, {
        userId: pubnubConfig.userId,
        origin: pubnubConfig.origin,
        ssl: pubnubConfig.ssl,
      });

      return instance;
    } catch (error) {
      console.error('Failed to create PubNub instance:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create PubNub instance';
      setConnectionError(errorMessage);
      onConnectionError?.(errorMessage);
      return null;
    }
  }, [instanceId, customUserId, onConnectionError]);

  const initializePubNub = useCallback(async () => {
    if (typeof window === 'undefined' || !window.PubNub) {
      if (attemptsRef.current < maxAttempts) {
        attemptsRef.current++;
        setTimeout(initializePubNub, 100);
      } else {
        const error = 'PubNub SDK not available after maximum attempts';
        setConnectionError(error);
        onConnectionError?.(error);
      }
      return;
    }

    setIsReady(true);
    
    try {
      const settings = storage.getSettings();
      settingsRef.current = settings;
      
      const instance = createPubNubInstance(settings);
      if (instance) {
        setPubnub(instance);
        
        // Validate connection
        await validateConnection(instance);
      }
    } catch (error) {
      console.error('Failed to initialize PubNub:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize PubNub';
      setConnectionError(errorMessage);
      onConnectionError?.(errorMessage);
    }
  }, [createPubNubInstance, validateConnection, onConnectionError]);

  const reconnect = useCallback(async () => {
    console.log(`🔄 Reconnecting PubNub instance ${instanceId}...`);
    clearError();
    setIsConnected(false);
    
    // Test existing connection first
    if (pubnub) {
      try {
        await validateConnection(pubnub);
        return;
      } catch (error) {
        console.warn('Connection validation failed during reconnect, creating new instance:', error);
      }
    }
    
    // Create new instance
    const settings = storage.getSettings();
    const newInstance = createPubNubInstance(settings);
    if (newInstance) {
      setPubnub(newInstance);
      await validateConnection(newInstance);
    }
  }, [instanceId, customUserId, pubnub, clearError, createPubNubInstance, validateConnection]);

  const disconnect = useCallback(() => {
    console.log(`🔌 Disconnecting PubNub instance ${instanceId}`);
    
    // Clean up from registry
    const settings = settingsRef.current;
    if (settings) {
      const instanceKey = instanceRegistry.generateKey(instanceId, settings);
      instanceRegistry.cleanup(instanceKey, false);
    }
    
    setPubnub(null);
    setIsConnected(false);
    setConnectionError(null);
  }, [instanceId, customUserId]);

  // Settings change handler
  const handleSettingsChange = useCallback(() => {
    const currentSettings = storage.getSettings();
    const previousSettings = settingsRef.current;
    
    if (!previousSettings) return;
    
    // Check if credentials or environment settings changed
    const credentialsChanged = 
      currentSettings.credentials.publishKey !== previousSettings.credentials.publishKey ||
      currentSettings.credentials.subscribeKey !== previousSettings.credentials.subscribeKey ||
      currentSettings.credentials.secretKey !== previousSettings.credentials.secretKey ||
      currentSettings.credentials.userId !== previousSettings.credentials.userId ||
      currentSettings.credentials.pamToken !== previousSettings.credentials.pamToken;
    
    const environmentChanged = 
      currentSettings.environment.origin !== previousSettings.environment.origin ||
      currentSettings.environment.customOrigin !== previousSettings.environment.customOrigin ||
      currentSettings.environment.ssl !== previousSettings.environment.ssl ||
      currentSettings.environment.logVerbosity !== previousSettings.environment.logVerbosity ||
      currentSettings.environment.heartbeatInterval !== previousSettings.environment.heartbeatInterval;
    
    if (credentialsChanged || environmentChanged) {
      console.log(`🔧 Settings changed for ${instanceId}, reconnecting...`);
      reconnect();
    }
  }, [instanceId, reconnect]);

  // Initialize on mount
  useEffect(() => {
    if (autoConnect) {
      initializePubNub();
    }

    // Register for settings changes
    settingsListeners.add(handleSettingsChange);

    // Cleanup function
    cleanupRef.current = () => {
      settingsListeners.delete(handleSettingsChange);
    };

    return cleanupRef.current;
  }, [autoConnect, initializePubNub, handleSettingsChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, [instanceId]);

  return {
    pubnub,
    isReady,
    isConnected,
    connectionError,
    reconnect,
    disconnect,
  };
}

// Utility function to notify all hooks about settings changes
export function notifySettingsChange(): void {
  settingsListeners.forEach(listener => listener());
}

// Utility function to clear all instances (useful for testing)
export function clearAllInstances(): void {
  legacyInstanceRegistry.clear();
  instanceRegistry.cleanupAll();
}