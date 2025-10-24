import type { AppSettings } from '../types/settings';

interface InstanceEntry {
  instance: any;
  instanceId: string;
  settings: AppSettings;
  lastActivity: number;
  isActive: boolean;
  key: string;
}

export class InstanceRegistry {
  private instances = new Map<string, InstanceEntry>();
  private static instance: InstanceRegistry;

  static getInstance(): InstanceRegistry {
    if (!InstanceRegistry.instance) {
      InstanceRegistry.instance = new InstanceRegistry();
    }
    return InstanceRegistry.instance;
  }

  register(key: string, instance: any, instanceId: string, settings: AppSettings): void {
    const entry: InstanceEntry = {
      instance,
      instanceId,
      settings,
      lastActivity: Date.now(),
      isActive: true,
      key
    };

    this.instances.set(key, entry);
    console.log(`📋 Instance registered: ${instanceId} with key ${key}`);
  }

  getOrCreate(key: string, factory: () => any, instanceId: string, settings: AppSettings): InstanceEntry {
    const existing = this.instances.get(key);
    if (existing && existing.isActive) {
      existing.lastActivity = Date.now();
      return existing;
    }

    const instance = factory();
    this.register(key, instance, instanceId, settings);
    return this.instances.get(key)!;
  }

  get(key: string): InstanceEntry | undefined {
    return this.instances.get(key);
  }


  updateSettings(key: string, settings: AppSettings): void {
    const entry = this.instances.get(key);
    if (entry) {
      entry.settings = settings;
      entry.lastActivity = Date.now();
      console.log(`⚙️ Updated settings for instance ${entry.instanceId}`);
    }
  }

  cleanup(key: string, preserveSubscriptions: boolean = false): void {
    const entry = this.instances.get(key);
    if (entry) {
      entry.isActive = false;
      
      // Clean up the PubNub instance
      if (entry.instance && entry.instance.destroy) {
        try {
          entry.instance.destroy();
        } catch (error) {
          console.error(`Error destroying PubNub instance:`, error);
        }
      }
      
      this.instances.delete(key);
      console.log(`🧹 Cleaned up instance ${entry.instanceId}`);
    }
  }

  cleanupAll(): void {
    for (const key of Array.from(this.instances.keys())) {
      this.cleanup(key);
    }
    console.log(`🧹 Cleaned up all instances`);
  }

  // Get all instances for a specific instanceId
  getInstancesForId(instanceId: string): InstanceEntry[] {
    return Array.from(this.instances.values())
      .filter(entry => entry.instanceId === instanceId && entry.isActive);
  }

  // Check if settings have changed
  hasSettingsChanged(key: string, newSettings: AppSettings): boolean {
    const entry = this.instances.get(key);
    if (!entry) return true;
    
    const oldSettings = entry.settings;
    return (
      oldSettings.credentials.publishKey !== newSettings.credentials.publishKey ||
      oldSettings.credentials.subscribeKey !== newSettings.credentials.subscribeKey ||
      oldSettings.credentials.userId !== newSettings.credentials.userId ||
      oldSettings.credentials.pamToken !== newSettings.credentials.pamToken ||
      oldSettings.environment.origin !== newSettings.environment.origin ||
      oldSettings.environment.customOrigin !== newSettings.environment.customOrigin ||
      oldSettings.environment.ssl !== newSettings.environment.ssl
    );
  }

  // Generate a unique key for an instance based on its configuration
  generateKey(instanceId: string, settings: AppSettings): string {
    const keyParts = [
      instanceId,
      settings.credentials.publishKey,
      settings.credentials.subscribeKey,
      settings.credentials.userId,
      settings.credentials.pamToken || '',
      settings.environment.origin,
      settings.environment.customOrigin || '',
      settings.environment.ssl ? 'ssl' : 'no-ssl'
    ];
    
    return keyParts.join('-');
  }

  // Debug methods
  getDebugInfo(): any {
    return {
      totalInstances: this.instances.size,
      activeInstances: Array.from(this.instances.values()).filter(entry => entry.isActive).length,
      instanceDetails: Array.from(this.instances.entries()).map(([key, entry]) => ({
        key,
        instanceId: entry.instanceId,
        isActive: entry.isActive,
        lastActivity: new Date(entry.lastActivity).toISOString(),
      }))
    };
  }
}

export type { InstanceEntry };
