import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Settings, Key, Globe, Save, AlertTriangle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { storage } from '@/lib/storage';
import { AppSettings } from '@/types/settings';
import { configService } from '@/lib/config-service';
import { VersionHistoryPanel } from '@/components/config-versions/VersionHistoryPanel';
import { DeleteAllConfigDialog } from '@/components/config-versions/DeleteAllConfigDialog';
import { useConfig } from '@/contexts/config-context';

const settingsSchema = z.object({
  publishKey: z.string().min(1, 'Publish key is required'),
  subscribeKey: z.string().min(1, 'Subscribe key is required'),
  secretKey: z.string().optional(),
  userId: z.string().min(1, 'User ID is required'),
  pamToken: z.string().optional(),
  origin: z.string().min(1, 'Origin is required'),
  ssl: z.boolean(),
  logVerbosity: z.enum(['debug', 'info', 'error', 'none']),
  heartbeatInterval: z.number().min(1).max(3600),
  storeMessageHistory: z.boolean(),
  autoSaveToPubNub: z.boolean(),
  saveVersionHistory: z.boolean(),
  maxVersionsToKeep: z.number().min(1).max(1000),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

// Schema-driven field definitions for bidirectional sync
const FIELD_DEFINITIONS = {
  publishKey: { section: 'credentials', type: 'string', default: '' },
  subscribeKey: { section: 'credentials', type: 'string', default: '' },
  secretKey: { section: 'credentials', type: 'string', default: '' },
  userId: { section: 'credentials', type: 'string', default: '' },
  pamToken: { section: 'credentials', type: 'string', default: '' },
  origin: { section: 'environment', type: 'string', default: 'ps.pndsn.com' },
  ssl: { section: 'environment', type: 'boolean', default: true },
  logVerbosity: { section: 'environment', type: 'string', default: 'info' },
  heartbeatInterval: { section: 'environment', type: 'number', default: 300 },
  storeMessageHistory: { section: 'storage', type: 'boolean', default: false },
  autoSaveToPubNub: { section: 'storage', type: 'boolean', default: true },
  saveVersionHistory: { section: 'storage', type: 'boolean', default: true },
  maxVersionsToKeep: { section: 'storage', type: 'number', default: 50 },
} as const;

// Current config version
const CURRENT_CONFIG_VERSION = 1;

// Migration functions for version compatibility
const CONFIG_MIGRATIONS: Record<number, (config: any) => any> = {
  1: (config: any) => config, // Initial version, no migration needed
  // Future migrations will be added here as:
  // 2: (config: any) => ({ ...config, newField: defaultValue }),
};

// Utility to get nested value safely
const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

// Utility to set nested value
const setNestedValue = (obj: any, path: string, value: any): void => {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((current, key) => {
    if (!current[key]) current[key] = {};
    return current[key];
  }, obj);
  target[lastKey] = value;
};

// Deep merge utility for config restoration
const deepMerge = (target: any, source: any): any => {
  const result = { ...target };
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
};

// Convert form data to pageSettings structure
const formDataToPageSettings = (formData: any) => {
  const pageSettings: any = { credentials: {}, environment: {}, storage: {} };
  
  Object.entries(FIELD_DEFINITIONS).forEach(([fieldName, definition]) => {
    const value = formData[fieldName] ?? definition.default;
    setNestedValue(pageSettings, `${definition.section}.${fieldName}`, value);
  });
  
  return pageSettings;
};

// Convert pageSettings to form data
const pageSettingsToFormData = (pageSettings: any) => {
  const formData: any = {};
  
  Object.entries(FIELD_DEFINITIONS).forEach(([fieldName, definition]) => {
    const value = getNestedValue(pageSettings, `${definition.section}.${fieldName}`);
    formData[fieldName] = value ?? definition.default;
  });
  
  return formData;
};

// Migrate config to current version
const migrateConfig = (config: any): any => {
  const configVersion = config._version || 1;
  let migratedConfig = { ...config };
  
  // Apply migrations sequentially
  for (let v = configVersion; v < CURRENT_CONFIG_VERSION; v++) {
    const migration = CONFIG_MIGRATIONS[v + 1];
    if (migration) {
      migratedConfig = migration(migratedConfig);
    }
  }
  
  // Add current version
  migratedConfig._version = CURRENT_CONFIG_VERSION;
  return migratedConfig;
};

// Create default config structure
const createDefaultPageSettings = () => {
  const defaultSettings: any = { credentials: {}, environment: {}, storage: {} };
  
  Object.entries(FIELD_DEFINITIONS).forEach(([fieldName, definition]) => {
    setNestedValue(defaultSettings, `${definition.section}.${fieldName}`, definition.default);
  });
  
  defaultSettings._version = CURRENT_CONFIG_VERSION;
  return defaultSettings;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(storage.getSettings());
  const [hasAttemptedAutoLoad, setHasAttemptedAutoLoad] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { setPageSettings: setConfigPageSettings, setConfigType } = useConfig();

  // Schema-driven page settings - auto-synced with form
  const [pageSettings, setPageSettings] = useState(() => {
    // Initialize with current settings, merged with defaults
    const defaultSettings = createDefaultPageSettings();
    const currentFormData = {
      publishKey: settings.credentials.publishKey,
      subscribeKey: settings.credentials.subscribeKey,
      secretKey: settings.credentials.secretKey || '',
      userId: settings.credentials.userId,
      pamToken: settings.credentials.pamToken || '',
      origin: settings.environment.origin,
      ssl: settings.environment.ssl,
      logVerbosity: settings.environment.logVerbosity,
      heartbeatInterval: settings.environment.heartbeatInterval,
      storeMessageHistory: settings.storage.storeMessageHistory || false,
      autoSaveToPubNub: settings.storage.autoSaveToPubNub ?? true,
      saveVersionHistory: settings.storage.saveVersionHistory ?? true,
      maxVersionsToKeep: settings.storage.maxVersionsToKeep || 50,
    };
    const initialPageSettings = formDataToPageSettings(currentFormData);
    return deepMerge(defaultSettings, initialPageSettings);
  });

  // Config restoration function
  const restoreFromConfig = (config: any) => {
    try {
      // Migrate config to current version
      const migratedConfig = migrateConfig(config);
      
      // Merge with defaults for graceful degradation
      const defaultSettings = createDefaultPageSettings();
      const safeConfig = deepMerge(defaultSettings, migratedConfig);
      
      // Convert to form data and restore form
      const formData = pageSettingsToFormData(safeConfig);
      form.reset(formData);
      
      // Update page settings
      setPageSettings(safeConfig);
      
      console.log('🔧 Settings Page Settings Restored:', safeConfig);
      return true;
    } catch (error) {
      console.error('Failed to restore config:', error);
      return false;
    }
  };

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      publishKey: settings.credentials.publishKey,
      subscribeKey: settings.credentials.subscribeKey,
      secretKey: settings.credentials.secretKey || '',
      userId: settings.credentials.userId,
      pamToken: settings.credentials.pamToken || '',
      origin: settings.environment.origin,
      ssl: settings.environment.ssl,
      logVerbosity: settings.environment.logVerbosity,
      heartbeatInterval: settings.environment.heartbeatInterval,
      storeMessageHistory: settings.storage.storeMessageHistory || false,
      autoSaveToPubNub: settings.storage.autoSaveToPubNub ?? true,
      saveVersionHistory: settings.storage.saveVersionHistory ?? true,
      maxVersionsToKeep: settings.storage.maxVersionsToKeep || 50,
    },
  });

  // Auto-load latest configuration when keys are populated - DISABLED
  // const loadLatestConfiguration = async () => {
  //   try {
  //     const result = await configService.loadLatestConfig('SETTINGS');
  //     if (result.success && result.config) {
  //       const latestConfig = result.config as AppSettings;
  //       
  //       // Update form with latest configuration
  //       form.reset({
  //         publishKey: latestConfig.credentials.publishKey,
  //         subscribeKey: latestConfig.credentials.subscribeKey,
  //         secretKey: latestConfig.credentials.secretKey || '',
  //         userId: latestConfig.credentials.userId,
  //         pamToken: latestConfig.credentials.pamToken || '',
  //         origin: latestConfig.environment.origin,
  //         ssl: latestConfig.environment.ssl,
  //         logVerbosity: latestConfig.environment.logVerbosity,
  //         heartbeatInterval: latestConfig.environment.heartbeatInterval,
  //         storeMessageHistory: latestConfig.storage.storeMessageHistory,
  //         autoSaveToPubNub: latestConfig.storage.autoSaveToPubNub,
  //         saveVersionHistory: latestConfig.storage.saveVersionHistory ?? true,
  //         maxVersionsToKeep: latestConfig.storage.maxVersionsToKeep || 50,
  //       });
  //       
  //       // Update local state
  //       setSettings(latestConfig);
  //       storage.saveSettings(latestConfig);
  //       
  //       toast({
  //         title: "Configuration Loaded",
  //         description: "Latest configuration loaded from PubNub App Context.",
  //       });
  //     }
  //   } catch (error) {
  //     console.log('No latest configuration found or failed to load:', error);
  //   }
  // };

  // Auto-sync: Watch all form values and update pageSettings automatically
  const watchedValues = form.watch();
  
  // Memoize the pageSettings to avoid unnecessary updates
  const currentPageSettings = useMemo(() => {
    const newPageSettings = formDataToPageSettings(watchedValues);
    newPageSettings._version = CURRENT_CONFIG_VERSION;
    return newPageSettings;
  }, [
    watchedValues.publishKey,
    watchedValues.subscribeKey,
    watchedValues.secretKey,
    watchedValues.userId,
    watchedValues.pamToken,
    watchedValues.origin,
    watchedValues.ssl,
    watchedValues.logVerbosity,
    watchedValues.heartbeatInterval,
    watchedValues.storeMessageHistory,
    watchedValues.autoSaveToPubNub,
    watchedValues.saveVersionHistory,
    watchedValues.maxVersionsToKeep,
  ]);
  
  useEffect(() => {
    setPageSettings(currentPageSettings);
    setConfigPageSettings(currentPageSettings);
    console.log('🔧 Settings Page Settings Updated:', currentPageSettings);
  }, [currentPageSettings, setConfigPageSettings]);

  // Set config type on mount
  useEffect(() => {
    setConfigType('SETTINGS');
  }, [setConfigType]);

  // Watch for changes in publish and subscribe keys (for auto-load functionality)
  const publishKey = form.watch('publishKey');
  const subscribeKey = form.watch('subscribeKey');

  // Auto-load configuration disabled
  // useEffect(() => {
  //   const bothKeysPresent = publishKey && subscribeKey && publishKey.trim() && subscribeKey.trim();
  //   
  //   // Only attempt auto-load once when both keys are first populated
  //   if (bothKeysPresent && !hasAttemptedAutoLoad) {
  //     setHasAttemptedAutoLoad(true);
  //     
  //     // Small delay to ensure form is ready
  //     setTimeout(() => {
  //       loadLatestConfiguration();
  //     }, 500);
  //   }
  // }, [publishKey, subscribeKey, hasAttemptedAutoLoad]);

  const publishConfigToPubNub = async (settings: AppSettings) => {
    try {
      // Create a configuration object without sensitive keys
      const configPayload = {
        timestamp: new Date().toISOString(),
        userId: settings.credentials.userId,
        environment: settings.environment,
        storage: settings.storage,
        // Note: We don't include actual keys for security
        hasKeys: {
          publishKey: !!settings.credentials.publishKey,
          subscribeKey: !!settings.credentials.subscribeKey,
          secretKey: !!settings.credentials.secretKey
        }
      };

      // Simulate publishing to CONFIG_PN_DEVTOOLS channel
      // In real implementation, this would use PubNub SDK
      console.log('Would publish to CONFIG_PN_DEVTOOLS channel:', configPayload);
      
      toast({
        title: "Configuration Saved to PubNub",
        description: "Your configuration has been published to the CONFIG_PN_DEVTOOLS channel.",
      });
    } catch (error) {
      toast({
        title: "PubNub Save Failed",
        description: "Failed to save configuration to PubNub. Saved locally only.",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data: SettingsFormData) => {
    const newSettings: AppSettings = {
      credentials: {
        publishKey: data.publishKey,
        subscribeKey: data.subscribeKey,
        secretKey: data.secretKey,
        userId: data.userId,
        pamToken: data.pamToken,
      },
      environment: {
        origin: data.origin,
        ssl: data.ssl,
        logVerbosity: data.logVerbosity,
        heartbeatInterval: data.heartbeatInterval,
      },
      storage: {
        storeMessageHistory: data.storeMessageHistory,
        autoSaveToPubNub: data.autoSaveToPubNub,
        saveVersionHistory: data.saveVersionHistory,
        maxVersionsToKeep: data.maxVersionsToKeep,
      },
    };

    storage.saveSettings(newSettings);
    setSettings(newSettings);
    
    // PubNub save functionality disabled - only save locally
    // if (data.autoSaveToPubNub && data.saveVersionHistory) {
    //   const description = `Settings updated by ${newSettings.credentials.userId}`;
    //   const result = await configService.saveVersionedConfig('SETTINGS', newSettings, description);
    //   
    //   if (result.success) {
    //     toast({
    //       title: "Settings saved with versioning",
    //       description: `Configuration saved locally and as version ${result.version?.version} in PubNub.`,
    //     });
    //   } else {
    //     // Fall back to old method if versioning fails
    //     await publishConfigToPubNub(newSettings);
    //     toast({
    //       title: "Settings saved",
    //       description: "Configuration saved locally and to PubNub (versioning unavailable).",
    //     });
    //   }
    // } else if (data.autoSaveToPubNub) {
    //   // Use old method if versioning is disabled
    //   await publishConfigToPubNub(newSettings);
    //   toast({
    //     title: "Settings saved",
    //     description: "Your PubNub configuration has been saved successfully.",
    //   });
    // } else {
    //   toast({
    //     title: "Settings saved",
    //     description: "Your configuration has been saved locally.",
    //   });
    // }
    
    toast({
      title: "Settings saved",
      description: "Your configuration has been saved locally.",
    });
  };

  const handleConfigRestore = (restoredConfig: AppSettings) => {
    // Update the form with restored configuration
    form.reset({
      publishKey: restoredConfig.credentials.publishKey,
      subscribeKey: restoredConfig.credentials.subscribeKey,
      secretKey: restoredConfig.credentials.secretKey || '',
      userId: restoredConfig.credentials.userId,
      pamToken: restoredConfig.credentials.pamToken || '',
      origin: restoredConfig.environment.origin,
      ssl: restoredConfig.environment.ssl,
      logVerbosity: restoredConfig.environment.logVerbosity,
      heartbeatInterval: restoredConfig.environment.heartbeatInterval,
      storeMessageHistory: restoredConfig.storage.storeMessageHistory,
      autoSaveToPubNub: restoredConfig.storage.autoSaveToPubNub,
      saveVersionHistory: restoredConfig.storage.saveVersionHistory ?? true,
      maxVersionsToKeep: restoredConfig.storage.maxVersionsToKeep || 50,
    });
    
    // Update local state
    setSettings(restoredConfig);
    storage.saveSettings(restoredConfig);
  };

  const handleDeleteAllConfig = async () => {
    setIsDeleting(true);
    
    try {
      const result = await configService.deleteAllConfigurationData();
      
      if (result.success) {
        toast({
          title: "All Configuration Data Deleted",
          description: "Application has been reset to vanilla state. Please refresh the page.",
        });
        
        // Close dialog
        setShowDeleteAllDialog(false);
        
        // Reload the page after a short delay to reset everything
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        toast({
          title: "Deletion Failed",
          description: result.error || "Some operations failed. Check console for details.",
          variant: "destructive",
        });
        
        // Show details if available
        if (result.details) {
          console.log('Delete operation details:', result.details);
        }
      }
    } catch (error) {
      console.error('Error during delete all operation:', error);
      toast({
        title: "Deletion Error",
        description: "An unexpected error occurred. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };


  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* PubNub Configuration */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-pubnub-red rounded-lg flex items-center justify-center">
                    <Key className="text-white h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>PubNub Configuration</CardTitle>
                    <CardDescription>Enter your PubNub application keys to get started</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="publishKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Publish Key</FormLabel>
                        <FormControl>
                          <Input placeholder="pub-c-..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="subscribeKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subscribe Key</FormLabel>
                        <FormControl>
                          <Input placeholder="sub-c-..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="secretKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Secret Key (Optional)</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="sec-c-..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="userId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>User ID</FormLabel>
                        <FormControl>
                          <Input placeholder="unique-user-id" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pamToken"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PAM Token (Optional)</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Access Manager Token" {...field} />
                        </FormControl>
                        <FormDescription className="text-xs text-gray-500">
                          Access Manager token for authenticated API calls
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

              </CardContent>
            </Card>

            {/* Environment Settings */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-pubnub-blue rounded-lg flex items-center justify-center">
                    <Globe className="text-white h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>Environment Settings</CardTitle>
                    <CardDescription>Configure your development environment</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="origin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Origin</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select origin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ps.pndsn.com">ps.pndsn.com (Default)</SelectItem>
                            <SelectItem value="localhost:8080">localhost:8080</SelectItem>
                            <SelectItem value="custom">Custom Origin</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ssl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SSL/TLS</FormLabel>
                        <Select onValueChange={(value) => field.onChange(value === 'true')} value={field.value.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="true">Enabled (Recommended)</SelectItem>
                            <SelectItem value="false">Disabled</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="logVerbosity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Log Verbosity</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="debug">Debug</SelectItem>
                            <SelectItem value="info">Info</SelectItem>
                            <SelectItem value="error">Error</SelectItem>
                            <SelectItem value="none">None</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="heartbeatInterval"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Heartbeat Interval (seconds)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            max="3600"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Storage Preferences */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                    <Save className="text-white h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>Storage Preferences</CardTitle>
                    <CardDescription>Configure how your data is stored and persisted</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="autoSaveToPubNub"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <FormLabel>Auto-save Configurations in PubNub</FormLabel>
                          <FormDescription className="text-xs text-gray-500">
                            You must have App Context enabled for your sub-key.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="saveVersionHistory"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <FormLabel>Enable Version History</FormLabel>
                          <FormDescription className="text-xs text-gray-500">
                            You must have PubNub Persistence enabled for your sub-key, note that your history will be lost when your Persistence data is set to expire.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="maxVersionsToKeep"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximum Versions to Keep</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="1000"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 50)}
                          />
                        </FormControl>
                        <FormDescription className="text-xs text-gray-500">
                          Number of configuration versions to retain (1-1000)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="storeMessageHistory"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <FormLabel>Store message history</FormLabel>
                          <FormDescription className="text-xs text-gray-500">
                            Keep a local copy of message history for debugging
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Version History Panel - DISABLED */}
            {/* <VersionHistoryPanel
              configType="SETTINGS"
              currentConfig={settings}
              onConfigRestore={handleConfigRestore}
            /> */}

            {/* Save Configuration Button */}
            <div className="flex justify-center pt-8 border-t border-gray-200">
              <Button 
                type="submit" 
                className="bg-pubnub-red hover:bg-red-700 text-white px-8 py-3 text-lg font-semibold"
                style={{ backgroundColor: 'hsl(351, 72%, 47%)' }}
              >
                <Save className="mr-2 h-5 w-5" />
                Save Configuration
              </Button>
            </div>

            {/* Danger Zone - DISABLED */}
            {/* <Card className="mt-8 border-red-200 bg-red-50">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="text-white h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-red-800">Danger Zone</CardTitle>
                    <CardDescription className="text-red-600">
                      Irreversible actions that will permanently delete data
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-red-800">Delete All Configuration Data</h3>
                    <p className="text-sm text-red-600 mt-1">
                      Permanently delete all settings, version history, and App Context data. 
                      This will reset the entire application to a vanilla state.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setShowDeleteAllDialog(true)}
                    disabled={isDeleting}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete All Data
                  </Button>
                </div>
              </CardContent>
            </Card> */}
          </form>
        </Form>

        {/* Delete All Configuration Dialog - DISABLED */}
        {/* <DeleteAllConfigDialog
          isOpen={showDeleteAllDialog}
          onConfirm={handleDeleteAllConfig}
          onCancel={() => setShowDeleteAllDialog(false)}
          isDeleting={isDeleting}
        /> */}
      </div>
    </div>
  );
}
