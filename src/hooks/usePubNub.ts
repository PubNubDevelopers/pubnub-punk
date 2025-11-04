import { useState, useEffect, useRef, useCallback } from 'react';
import { storage } from '@/lib/storage';
import { AppSettings } from '@/types/settings';
import { InstanceRegistry } from '@/lib/instance-registry';
import { ensurePubNubSdk } from '@/lib/sdk-loader';

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
        enableEventEngine: settings.environment.enableEventEngine,
      };

      if (settings.credentials.pamToken) {
        pubnubConfig.authKey = settings.credentials.pamToken;
      }

      if (!window.PubNub) {
        throw new Error('PubNub SDK not available');
      }

      const instance = new window.PubNub(pubnubConfig);
      
      // Store in new registry
      instanceRegistry.register(instanceKey, instance, instanceId, settings);
      
      console.log(`✅ Created new PubNub instance for ${instanceId}:`, {
        userId: pubnubConfig.userId,
        origin: pubnubConfig.origin,
        ssl: pubnubConfig.ssl,
        eventEngine: pubnubConfig.enableEventEngine ? 'enabled' : 'legacy'
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
    try {
      const settings = storage.getSettings();
      await ensurePubNubSdk(settings.sdkVersion);

      if (typeof window === 'undefined' || !window.PubNub) {
        throw new Error('PubNub SDK not available after loading');
      }

      setIsReady(true);
      settingsRef.current = settings;

      const instance = createPubNubInstance(settings);
      if (instance) {
        setPubnub(instance);
        await validateConnection(instance);
      }
    } catch (error) {
      console.error('Failed to initialize PubNub:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize PubNub';
      setConnectionError(errorMessage);
      onConnectionError?.(errorMessage);

      if (attemptsRef.current < maxAttempts) {
        attemptsRef.current++;
        setTimeout(initializePubNub, 200);
      }
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
    await ensurePubNubSdk(settings.sdkVersion);
    const newInstance = createPubNubInstance(settings);
    if (newInstance) {
      setPubnub(newInstance);
      settingsRef.current = settings;
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
      currentSettings.credentials.userId !== previousSettings.credentials.userId ||
      currentSettings.credentials.pamToken !== previousSettings.credentials.pamToken ||
      currentSettings.credentials.pamEnabled !== previousSettings.credentials.pamEnabled;

    const environmentChanged = 
      currentSettings.environment.origin !== previousSettings.environment.origin ||
      currentSettings.environment.customOrigin !== previousSettings.environment.customOrigin ||
      currentSettings.environment.ssl !== previousSettings.environment.ssl ||
      currentSettings.environment.logVerbosity !== previousSettings.environment.logVerbosity ||
      currentSettings.environment.heartbeatInterval !== previousSettings.environment.heartbeatInterval ||
      currentSettings.environment.enableEventEngine !== previousSettings.environment.enableEventEngine;
    const sdkChanged = currentSettings.sdkVersion !== previousSettings.sdkVersion;

    if (credentialsChanged || environmentChanged || sdkChanged) {
      console.log(`🔧 Settings changed for ${instanceId}, reconnecting...`);

      if (previousSettings) {
        const previousKey = instanceRegistry.generateKey(instanceId, previousSettings);
        instanceRegistry.cleanup(previousKey);
      }

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
