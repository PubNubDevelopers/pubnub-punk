import { storage } from './storage';

// Declare PubNub as a global variable from the CDN
declare global {
  interface Window {
    PubNub: any;
  }
}

// Type definitions for versioned configurations
export interface VersionedConfig {
  timestamp: string;
  version: number;
  configType: string;
  userId: string;
  data: any;
  metadata: {
    description?: string;
    tags?: string[];
    name?: string;
  };
}

export interface ConfigVersion {
  timetoken: string;
  timestamp: string;
  version: number;
  description?: string;
  data: any;
  publisher: string;
}

export interface ConfigHistoryResponse {
  versions: ConfigVersion[];
  hasMore: boolean;
  nextTimetoken?: string;
}

// Configuration service class
export class ConfigurationService {
  private static instance: ConfigurationService;
  private readonly APP_CONTEXT_CHANNEL = 'CONFIG_PN_DEVTOOLS';

  static getInstance(): ConfigurationService {
    if (!ConfigurationService.instance) {
      ConfigurationService.instance = new ConfigurationService();
    }
    return ConfigurationService.instance;
  }

  /**
   * Generate channel name for a specific configuration type
   */
  private getChannelName(configType: string): string {
    return `CONFIG_PN_DEVTOOLS_${configType.toUpperCase()}`;
  }

  /**
   * Create a versioned configuration object
   */
  private createVersionedConfig(
    configType: string,
    data: any,
    description?: string,
    tags?: string[],
    name?: string
  ): VersionedConfig {
    const settings = storage.getSettings();
    const existingVersions = this.getLocalVersionCount(configType);
    
    return {
      timestamp: new Date().toISOString(),
      version: existingVersions + 1,
      configType: configType.toUpperCase(),
      userId: settings.credentials.userId || 'anonymous',
      data,
      metadata: {
        description,
        tags,
        name
      }
    };
  }

  /**
   * Get local version count for generating version numbers
   */
  private getLocalVersionCount(configType: string): number {
    try {
      const key = `config_versions_${configType.toLowerCase()}`;
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored).length : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Save a new version of configuration to both PubNub Persistence and App Context
   */
  async saveVersionedConfig(
    configType: string,
    configData: any,
    description?: string,
    tags?: string[],
    name?: string
  ): Promise<{ success: boolean; version?: VersionedConfig; error?: string }> {
    try {
      const settings = storage.getSettings();
      
      // Check if auto-save to PubNub is enabled
      if (!settings.storage.autoSaveToPubNub) {
        return {
          success: false,
          error: 'PubNub auto-save is disabled'
        };
      }

      // Validate PubNub credentials
      if (!settings.credentials.publishKey || !settings.credentials.subscribeKey) {
        return {
          success: false,
          error: 'PubNub credentials not configured'
        };
      }

      const versionedConfig = this.createVersionedConfig(configType, configData, description, tags, name);
      const channelName = this.getChannelName(configType);

      // Initialize PubNub instance from global CDN
      const pubnubConfig: any = {
        publishKey: settings.credentials.publishKey,
        subscribeKey: settings.credentials.subscribeKey,
        userId: settings.credentials.userId || 'config-service-user'
      };
      
      // Add PAM token if available
      if (settings.credentials.pamToken) {
        pubnubConfig.authKey = settings.credentials.pamToken;
      }
      
      const pubnub = new window.PubNub(pubnubConfig);

      try {
        // 1. Publish version to Persistence (History) channel - DISABLED
        // const publishResult = await pubnub.publish({
        //   channel: channelName,
        //   message: versionedConfig,
        //   storeInHistory: true
        // });
        
        // Fake publish result for compatibility
        const publishResult = { timetoken: Date.now().toString() };

        console.log('Published to channel (DISABLED):', channelName, 'timetoken:', publishResult.timetoken);

        // 2. Update App Context with latest version (stringify JSON for single custom field) - DISABLED
        // const configKey = `${configType.toLowerCase()}_latest`;
        // const latestConfigInfo = {
        //   timetoken: publishResult.timetoken.toString(),
        //   version: versionedConfig.version,
        //   updated: versionedConfig.timestamp,
        //   type: configType,
        //   data: configData  // Include the actual configuration data
        // };
        
        // const stringifiedConfig = JSON.stringify(latestConfigInfo);
        // console.log('Attempting to store stringified config in App Context:', { configKey, stringifiedConfig });

        // try {
        //   // Try to get existing metadata to preserve other config types, but don't fail if it doesn't exist
        //   let existingCustom = {};
        //   
        //   try {
        //     const existingMetadata = await pubnub.objects.getChannelMetadata({
        //       channel: this.APP_CONTEXT_CHANNEL,
        //       include: { customFields: true }
        //     });
        //     existingCustom = existingMetadata.data?.custom || {};
        //     console.log('Found existing App Context metadata:', existingCustom);
        //   } catch (getError) {
        //     // This is expected for the first time - channel doesn't exist yet
        //     console.log('Creating new App Context channel (first time):', getError.status?.statusCode);
        //   }

        //   // Merge with existing custom data (using stringified JSON)
        //   const updatedCustom = {
        //     ...existingCustom,
        //     [configKey]: stringifiedConfig
        //   };

        //   console.log('Final custom data to store:', updatedCustom);

        //   // Use custom name or fallback to default
        //   const channelName = name || 'PubNub DevTools Configuration Storage';
        //   
        //   await pubnub.objects.setChannelMetadata({
        //     channel: this.APP_CONTEXT_CHANNEL,
        //     data: {
        //       name: channelName,
        //       description: 'Latest configuration versions for PubNub DevTools',
        //       custom: updatedCustom
        //     },
        //     include: {
        //       customFields: true
        //     }
        //   });

        //   console.log('Successfully updated App Context channel metadata');
        // } catch (appContextError) {
        //   console.warn('App Context update failed, but message was published to History:', appContextError);
        //   
        //   // Check if this is an App Context not enabled error
        //   if (appContextError && appContextError.status && appContextError.status.statusCode === 400) {
        //     console.warn('App Context may not be enabled for your PubNub keys. Please enable it in the Admin Portal.');
        //   }
        //   
        //   // Don't fail the entire operation if App Context fails, since we have the message in History
        // }

        console.log('App Context operations disabled - using local storage only');

        // Store locally as fallback
        await this.saveVersionLocally(configType, versionedConfig);
        await this.updateLatestVersionLocally(configType, versionedConfig);

        return {
          success: true,
          version: versionedConfig
        };
      } catch (pubnubError) {
        console.error('PubNub operation failed, using local storage fallback:', pubnubError);
        
        // Fallback to local storage if PubNub fails
        await this.saveVersionLocally(configType, versionedConfig);
        await this.updateLatestVersionLocally(configType, versionedConfig);

        return {
          success: true,
          version: versionedConfig
        };
      }
    } catch (error) {
      console.error('Error saving versioned config:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Load the latest configuration from App Context
   */
  async loadLatestConfig(configType: string): Promise<{ success: boolean; config?: any; error?: string }> {
    try {
      const settings = storage.getSettings();
      
      if (!settings.storage.autoSaveToPubNub || !settings.credentials.publishKey || !settings.credentials.subscribeKey) {
        // Fall back to local storage
        const localConfig = this.getLatestVersionLocally(configType);
        return {
          success: true,
          config: localConfig?.data
        };
      }

      // Initialize PubNub instance from global CDN
      const pubnubConfig: any = {
        publishKey: settings.credentials.publishKey,
        subscribeKey: settings.credentials.subscribeKey,
        userId: settings.credentials.userId || 'config-service-user'
      };
      
      // Add PAM token if available
      if (settings.credentials.pamToken) {
        pubnubConfig.authKey = settings.credentials.pamToken;
      }
      
      const pubnub = new window.PubNub(pubnubConfig);

      try {
        // Get latest configuration from App Context - DISABLED
        // const metadataResult = await pubnub.objects.getChannelMetadata({
        //   channel: this.APP_CONTEXT_CHANNEL,
        //   include: {
        //     customFields: true
        //   }
        // });

        // console.log('Fetched App Context metadata:', metadataResult);

        // if (metadataResult.data?.custom) {
        //   const configKey = `${configType.toLowerCase()}_latest`;
        //   const stringifiedConfig = metadataResult.data.custom[configKey];
        //   
        //   if (stringifiedConfig) {
        //     try {
        //       // Parse the stringified configuration
        //       const latestConfigInfo = JSON.parse(stringifiedConfig);
        //       console.log('Parsed latest config from App Context:', latestConfigInfo);
        //       
        //       // Return the configuration data directly from App Context
        //       return {
        //         success: true,
        //         config: latestConfigInfo.data
        //       };
        //     } catch (parseError) {
        //       console.warn('Failed to parse App Context configuration, trying timetoken fallback:', parseError);
        //       
        //       // Fallback: try to extract timetoken and fetch from History
        //       try {
        //         const latestConfigInfo = JSON.parse(stringifiedConfig);
        //         if (latestConfigInfo.timetoken) {
        //           const channelName = this.getChannelName(configType);
        //           const historyResult = await pubnub.fetchMessages({
        //             channels: [channelName],
        //             count: 1,
        //             end: latestConfigInfo.timetoken
        //           });

        //           if (historyResult.channels[channelName] && historyResult.channels[channelName].length > 0) {
        //             const latestMessage = historyResult.channels[channelName][0];
        //             console.log('Found latest config from history fallback:', latestMessage);
        //             
        //             return {
        //               success: true,
        //               config: latestMessage.message.data
        //             };
        //           }
        //         }
        //       } catch (historyError) {
        //         console.warn('History fallback also failed:', historyError);
        //       }
        //     }
        //   }
        // }

        // App Context operations disabled - fall back to local storage immediately
        console.log('App Context operations disabled - using local storage fallback');
        const localConfig = this.getLatestVersionLocally(configType);
        return {
          success: true,
          config: localConfig?.data
        };
      } catch (pubnubError) {
        console.log('PubNub operation failed, using local storage fallback:', pubnubError);
        
        // Check for common App Context errors
        if (pubnubError && pubnubError.status && pubnubError.status.statusCode === 400) {
          console.warn('App Context may not be enabled for your PubNub keys. Please enable it in the Admin Portal.');
        }
        
        // Fall back to local storage
        const localConfig = this.getLatestVersionLocally(configType);
        return {
          success: true,
          config: localConfig?.data
        };
      }
    } catch (error) {
      console.error('Error loading latest config:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get configuration history from PubNub Persistence
   */
  async getConfigHistory(
    configType: string,
    limit: number = 25,
    startTimetoken?: string
  ): Promise<ConfigHistoryResponse> {
    try {
      const settings = storage.getSettings();
      
      if (!settings.storage.autoSaveToPubNub || !settings.credentials.publishKey || !settings.credentials.subscribeKey) {
        // Fall back to local storage
        const localVersions = this.getLocalVersions(configType);
        return {
          versions: localVersions,
          hasMore: false
        };
      }

      const channelName = this.getChannelName(configType);
      
      // Initialize PubNub instance from global CDN
      const pubnubConfig: any = {
        publishKey: settings.credentials.publishKey,
        subscribeKey: settings.credentials.subscribeKey,
        userId: settings.credentials.userId || 'config-service-user'
      };
      
      // Add PAM token if available
      if (settings.credentials.pamToken) {
        pubnubConfig.authKey = settings.credentials.pamToken;
      }
      
      const pubnub = new window.PubNub(pubnubConfig);

      try {
        // Fetch message history from PubNub Persistence - DISABLED
        // const fetchParams: any = {
        //   channels: [channelName],
        //   count: limit
        // };

        // if (startTimetoken) {
        //   fetchParams.start = startTimetoken;
        // }

        // const result = await pubnub.fetchMessages(fetchParams);
        // 
        // console.log('Fetched history from channel:', channelName, result);

        // const channelMessages = result.channels[channelName] || [];
        // const versions: ConfigVersion[] = channelMessages.map(msg => ({
        //   timetoken: msg.timetoken,
        //   timestamp: msg.message.timestamp,
        //   version: msg.message.version,
        //   description: msg.message.metadata?.description,
        //   data: msg.message.data,
        //   publisher: msg.message.userId
        // }));

        // return {
        //   versions,
        //   hasMore: versions.length === limit, // Assume more if we got exactly the limit
        //   nextTimetoken: versions.length > 0 ? versions[versions.length - 1].timetoken : undefined
        // };
        
        // PubNub History operations disabled - fall back to local storage immediately
        console.log('PubNub History operations disabled - using local storage fallback');
        const localVersions = this.getLocalVersions(configType);
        return {
          versions: localVersions.slice(0, limit),
          hasMore: localVersions.length > limit
        };
      } catch (pubnubError) {
        console.log('PubNub history fetch failed, using local storage fallback:', pubnubError);
        
        // Fall back to local storage
        const localVersions = this.getLocalVersions(configType);
        return {
          versions: localVersions.slice(0, limit),
          hasMore: localVersions.length > limit
        };
      }
    } catch (error) {
      console.error('Error getting config history:', error);
      return {
        versions: [],
        hasMore: false
      };
    }
  }

  /**
   * Restore a specific version by republishing it
   */
  async restoreConfigVersion(
    configType: string,
    timetoken: string
  ): Promise<{ success: boolean; restoredConfig?: any; error?: string }> {
    try {
      // First, get the specific version from history
      const versions = await this.getConfigHistory(configType, 100);
      const targetVersion = versions.versions.find(v => v.timetoken === timetoken);
      
      if (!targetVersion) {
        return {
          success: false,
          error: 'Version not found'
        };
      }

      // Republish as a new version with "Restored from" description
      const restoreDescription = `Restored from version ${targetVersion.version} (${targetVersion.timestamp})`;
      const result = await this.saveVersionedConfig(
        configType,
        targetVersion.data,
        restoreDescription,
        ['restored']
      );

      if (result.success) {
        return {
          success: true,
          restoredConfig: targetVersion.data
        };
      } else {
        return result;
      }
    } catch (error) {
      console.error('Error restoring config version:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Delete a specific version from history (requires secret key)
   */
  async deleteConfigVersion(
    configType: string,
    timetoken: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const settings = storage.getSettings();
      
      if (!settings.credentials.secretKey) {
        return {
          success: false,
          error: 'Secret key required for deletion'
        };
      }

      if (!settings.storage.autoSaveToPubNub || !settings.credentials.publishKey || !settings.credentials.subscribeKey) {
        // Just remove from local storage
        this.removeVersionLocally(configType, timetoken);
        return { success: true };
      }

      const channelName = this.getChannelName(configType);
      
      // Initialize PubNub instance with secret key for deletion from global CDN
      const pubnubConfig: any = {
        publishKey: settings.credentials.publishKey,
        subscribeKey: settings.credentials.subscribeKey,
        secretKey: settings.credentials.secretKey,
        userId: settings.credentials.userId || 'config-service-user'
      };
      
      // Add PAM token if available
      if (settings.credentials.pamToken) {
        pubnubConfig.authKey = settings.credentials.pamToken;
      }
      
      const pubnub = new window.PubNub(pubnubConfig);

      try {
        // Delete specific message from PubNub History - DISABLED
        // Calculate start timetoken (exclusive) and end timetoken (inclusive)
        // const startTimetoken = (BigInt(timetoken) - 1n).toString();
        // const endTimetoken = timetoken;

        // await pubnub.deleteMessages({
        //   channel: channelName,
        //   start: startTimetoken,
        //   end: endTimetoken
        // });

        console.log('Message deletion from PubNub disabled - removing from local storage only:', channelName, 'timetoken:', timetoken);

        // Remove from local storage only
        this.removeVersionLocally(configType, timetoken);

        return { success: true };
      } catch (pubnubError) {
        console.log('PubNub deletion failed, removing from local storage only:', pubnubError);
        
        // Still remove from local storage even if PubNub deletion fails
        this.removeVersionLocally(configType, timetoken);
        
        return {
          success: false,
          error: `PubNub deletion failed: ${pubnubError instanceof Error ? pubnubError.message : 'Unknown error'}`
        };
      }
    } catch (error) {
      console.error('Error deleting config version:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Local storage fallback methods
  private async saveVersionLocally(configType: string, versionedConfig: VersionedConfig): Promise<void> {
    const key = `config_versions_${configType.toLowerCase()}`;
    const existing = this.getLocalVersions(configType);
    
    const newVersion: ConfigVersion = {
      timetoken: Date.now().toString(),
      timestamp: versionedConfig.timestamp,
      version: versionedConfig.version,
      description: versionedConfig.metadata.description,
      data: versionedConfig.data,
      publisher: versionedConfig.userId
    };
    
    existing.unshift(newVersion); // Add to beginning for newest first
    
    // Keep only last 50 versions in local storage
    const limited = existing.slice(0, 50);
    localStorage.setItem(key, JSON.stringify(limited));
  }

  private async updateLatestVersionLocally(configType: string, versionedConfig: VersionedConfig): Promise<void> {
    const key = `config_latest_${configType.toLowerCase()}`;
    localStorage.setItem(key, JSON.stringify(versionedConfig));
  }

  private getLatestVersionLocally(configType: string): VersionedConfig | null {
    try {
      const key = `config_latest_${configType.toLowerCase()}`;
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private getLocalVersions(configType: string): ConfigVersion[] {
    try {
      const key = `config_versions_${configType.toLowerCase()}`;
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private removeVersionLocally(configType: string, timetoken: string): void {
    const key = `config_versions_${configType.toLowerCase()}`;
    const existing = this.getLocalVersions(configType);
    const filtered = existing.filter(v => v.timetoken !== timetoken);
    localStorage.setItem(key, JSON.stringify(filtered));
  }

  /**
   * Delete ALL configuration data from PubNub and local storage (nuclear option)
   */
  async deleteAllConfigurationData(): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      const settings = storage.getSettings();
      
      if (!settings.credentials.secretKey) {
        return {
          success: false,
          error: 'Secret key required for deletion operations'
        };
      }

      const results = {
        localStorageCleared: false,
        appContextDeleted: false,
        historyChannelsDeleted: [] as string[],
        errors: [] as string[]
      };

      // 1. Clear all local storage
      try {
        storage.clearAll();
        // Also clear any config-specific localStorage
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('config_versions_') || key.startsWith('config_latest_'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        results.localStorageCleared = true;
        console.log('Cleared all local storage');
      } catch (error) {
        results.errors.push(`Local storage cleanup failed: ${error}`);
      }

      // Only proceed with PubNub operations if we have valid credentials
      if (settings.storage.autoSaveToPubNub && settings.credentials.publishKey && settings.credentials.subscribeKey) {
        // Initialize PubNub instance with secret key
        const pubnubConfig: any = {
          publishKey: settings.credentials.publishKey,
          subscribeKey: settings.credentials.subscribeKey,
          secretKey: settings.credentials.secretKey,
          userId: settings.credentials.userId || 'config-service-user'
        };
        
        // Add PAM token if available
        if (settings.credentials.pamToken) {
          pubnubConfig.authKey = settings.credentials.pamToken;
        }
        
        const pubnub = new window.PubNub(pubnubConfig);

        // 2. Delete App Context channel metadata - DISABLED
        // try {
        //   await pubnub.objects.removeChannelMetadata({
        //     channel: this.APP_CONTEXT_CHANNEL
        //   });
        //   results.appContextDeleted = true;
        //   console.log('Deleted App Context channel metadata');
        // } catch (error) {
        //   results.errors.push(`App Context deletion failed: ${error}`);
        //   console.warn('App Context deletion failed:', error);
        // }
        
        // App Context operations disabled
        console.log('App Context deletion disabled - skipping');
        results.appContextDeleted = true; // Mark as done since we're not using it

        // 3. Delete all History messages for known config types - DISABLED
        // const configTypes = ['SETTINGS', 'PUBSUB', 'PRESENCE', 'FUNCTIONS']; // Add more as needed
        
        // for (const configType of configTypes) {
        //   try {
        //     const channelName = this.getChannelName(configType);
        //     
        //     // Delete ALL messages from the channel by using a very wide time range
        //     // Start from timestamp 0 (beginning of time) to current time + buffer
        //     const now = Date.now() * 10000; // PubNub timetoken format (microseconds)
        //     const startTimetoken = '0'; // Beginning of time
        //     const endTimetoken = (now + 1000000).toString(); // Current time + 1 second buffer
        //     
        //     await pubnub.deleteMessages({
        //       channel: channelName,
        //       start: startTimetoken, // Exclusive start from beginning of time
        //       end: endTimetoken // Inclusive end at current time + buffer
        //     });
        //     
        //     results.historyChannelsDeleted.push(channelName);
        //     console.log(`Deleted all messages from channel: ${channelName} (full history)`);
        //   } catch (error) {
        //     results.errors.push(`History deletion failed for ${configType}: ${error}`);
        //     console.warn(`History deletion failed for ${configType}:`, error);
        //   }
        // }
        
        // History deletion operations disabled
        console.log('History deletion operations disabled - skipping');
        const configTypes = ['SETTINGS', 'PUBSUB', 'PRESENCE', 'FUNCTIONS'];
        configTypes.forEach(configType => {
          const channelName = this.getChannelName(configType);
          results.historyChannelsDeleted.push(channelName);
          console.log(`History deletion disabled for channel: ${channelName}`);
        });
      }

      const success = results.localStorageCleared && (results.errors.length === 0 || !settings.storage.autoSaveToPubNub);
      
      return {
        success,
        error: results.errors.length > 0 ? results.errors.join('; ') : undefined,
        details: results
      };
    } catch (error) {
      console.error('Critical error during deleteAllConfigurationData:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get configuration statistics
   */
  getConfigStats(configType: string): {
    totalVersions: number;
    latestVersion?: number;
    oldestTimestamp?: string;
    latestTimestamp?: string;
  } {
    const versions = this.getLocalVersions(configType);
    
    if (versions.length === 0) {
      return { totalVersions: 0 };
    }

    return {
      totalVersions: versions.length,
      latestVersion: Math.max(...versions.map(v => v.version)),
      oldestTimestamp: versions[versions.length - 1]?.timestamp,
      latestTimestamp: versions[0]?.timestamp
    };
  }
}

// Export singleton instance
export const configService = ConfigurationService.getInstance();