import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Smartphone,
  Send,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Copy,
  Settings,
  Edit3,
  X,
  Bell,
  Users,
  MessageSquare,
  Zap,
  Monitor,
  Apple,
  Bot
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useConfig } from '@/contexts/config-context';
import { storage } from '@/lib/storage';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DeviceToken {
  token: string;
  platform: 'apns' | 'fcm';
  environment?: 'development' | 'production';
  topic?: string;
  channels: string[];
  lastModified: string;
  alias?: string;
}

interface NotificationPayload {
  title: string;
  body: string;
  badge?: number;
  sound?: string;
  data?: Record<string, any>;
  platform: 'apns' | 'fcm' | 'both';
  // APNs specific
  apns?: {
    collapseId?: string;
    expirationDate?: string;
    topic?: string;
    environment?: 'development' | 'production';
  };
  // FCM specific
  fcm?: {
    icon?: string;
    tag?: string;
    clickAction?: string;
  };
}

// Field definitions for config management
const FIELD_DEFINITIONS = {
  'mobilePush.devices': { section: 'mobilePush', field: 'devices', type: 'array', default: [] },
  'mobilePush.selectedDevice': { section: 'mobilePush', field: 'selectedDevice', type: 'string', default: '' },
  'mobilePush.testChannels': { section: 'mobilePush', field: 'testChannels', type: 'array', default: ['push-test'] },
  'mobilePush.selectedChannel': { section: 'mobilePush', field: 'selectedChannel', type: 'string', default: 'push-test' },
} as const;

// Declare PubNub as a global variable from the CDN
declare global {
  interface Window {
    PubNub: any;
  }
}

export default function MobilePushPage() {
  const { toast } = useToast();
  const { setPageSettings, setConfigType } = useConfig();
  
  // State for PubNub availability and instance
  const [mounted, setMounted] = useState(false);
  const [pubnubReady, setPubnubReady] = useState(false);
  const [pubnub, setPubnub] = useState<any>(null);
  
  // Mount check
  useEffect(() => {
    setMounted(true);
  }, []);

  // Set config type for the config service
  useEffect(() => {
    setConfigType('MOBILE_PUSH');
    
    // Initialize page settings
    setPageSettings({
      mobilePush: {
        devices: FIELD_DEFINITIONS['mobilePush.devices'].default,
        selectedDevice: FIELD_DEFINITIONS['mobilePush.selectedDevice'].default,
        testChannels: FIELD_DEFINITIONS['mobilePush.testChannels'].default,
        selectedChannel: FIELD_DEFINITIONS['mobilePush.selectedChannel'].default,
      },
      configForSaving: {
        devices: FIELD_DEFINITIONS['mobilePush.devices'].default,
        testChannels: FIELD_DEFINITIONS['mobilePush.testChannels'].default,
        timestamp: new Date().toISOString(),
      }
    });
  }, [setConfigType, setPageSettings]);
  
  // Check for PubNub availability on mount and create instance
  useEffect(() => {
    if (!mounted) return;
    
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max
    
    const checkPubNub = () => {
      if (typeof window !== 'undefined' && window.PubNub) {
        setPubnubReady(true);
        
        // Create PubNub instance now that SDK is loaded
        try {
          const settings = storage.getSettings();
          if (settings?.credentials?.publishKey && settings?.credentials?.subscribeKey) {
            const pubnubConfig: any = {
              publishKey: settings.credentials.publishKey,
              subscribeKey: settings.credentials.subscribeKey,
              userId: settings.credentials.userId || 'mobile-push-manager-user'
            };
            
            // Add PAM token if available
            if (settings.credentials.pamToken) {
              pubnubConfig.authKey = settings.credentials.pamToken;
            }
            
            const instance = new window.PubNub(pubnubConfig);
            setPubnub(instance);
          }
        } catch (error) {
          console.error('Failed to create PubNub instance:', error);
          // Continue anyway - user will see configuration required message
        }
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(checkPubNub, 100);
      } else {
        // Timeout - show as ready but PubNub will be null
        console.warn('PubNub SDK failed to load after 5 seconds');
        setPubnubReady(true);
      }
    };
    
    checkPubNub();
  }, [mounted]);
  
  // State management
  const [devices, setDevices] = useState<DeviceToken[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [testChannels, setTestChannels] = useState<string[]>(['push-test']);
  const [selectedChannel, setSelectedChannel] = useState('push-test');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('notification');
  const [showAddDeviceDialog, setShowAddDeviceDialog] = useState(false);
  const [showAddChannelDialog, setShowAddChannelDialog] = useState(false);
  const [showNotificationBuilder, setShowNotificationBuilder] = useState(false);
  const [showDeviceChannels, setShowDeviceChannels] = useState(false);
  
  // Form state for adding devices
  const [newDevice, setNewDevice] = useState<Partial<DeviceToken>>({
    token: '',
    platform: 'fcm',
    environment: 'development',
    topic: '',
    channels: [],
    alias: ''
  });
  
  // Notification builder state
  const [notification, setNotification] = useState<NotificationPayload>({
    title: 'Test Notification',
    body: 'This is a test push notification from PubNub Developer Tools',
    platform: 'both',
    badge: 1,
    sound: 'default',
    data: { source: 'pubnub-dev-tools', timestamp: Date.now() }
  });

  const [newChannelName, setNewChannelName] = useState('');
  const [channelToAdd, setChannelToAdd] = useState('');
  const [debugChannelSubscribed, setDebugChannelSubscribed] = useState<string | null>(null);
  const [debugMessages, setDebugMessages] = useState<any[]>([]);

  // Update page settings helper
  const updateField = (path: string, value: any) => {
    const def = FIELD_DEFINITIONS[path as keyof typeof FIELD_DEFINITIONS];
    if (def) {
      setPageSettings(prev => ({
        ...prev,
        [def.section]: {
          ...prev?.[def.section],
          [def.field]: value
        }
      }));
    }
  };

  // Load stored devices from localStorage
  useEffect(() => {
    try {
      const storedDevices = localStorage.getItem('pubnub_mobile_push_devices');
      if (storedDevices) {
        const parsed = JSON.parse(storedDevices);
        setDevices(parsed);
      }
    } catch (error) {
      console.warn('Failed to load stored devices:', error);
    }
  }, []);

  // Save devices to localStorage whenever devices change
  useEffect(() => {
    try {
      localStorage.setItem('pubnub_mobile_push_devices', JSON.stringify(devices));
    } catch (error) {
      console.warn('Failed to save devices:', error);
    }
  }, [devices]);

  // Add new device token
  const addDevice = async () => {
    if (!newDevice.token || !newDevice.platform) {
      toast({
        title: "Invalid Device",
        description: "Please provide a valid device token and platform.",
        variant: "destructive",
      });
      return;
    }

    const device: DeviceToken = {
      token: newDevice.token.trim(),
      platform: newDevice.platform as 'apns' | 'fcm',
      environment: newDevice.environment || 'development',
      topic: newDevice.platform === 'apns' ? (newDevice.topic?.trim() || 'com.example.app') : undefined,
      channels: [],
      lastModified: new Date().toISOString(),
      alias: newDevice.alias?.trim() || undefined
    };

    // Check for duplicate tokens
    const existingDevice = devices.find(d => d.token === device.token);
    if (existingDevice) {
      toast({
        title: "Device Already Exists",
        description: "A device with this token already exists.",
        variant: "destructive",
      });
      return;
    }

    const updatedDevices = [...devices, device];
    setDevices(updatedDevices);
    
    toast({
      title: "Device Added",
      description: `Added ${device.platform.toUpperCase()} device ${device.alias ? `"${device.alias}"` : 'token'}.`,
    });

    // Reset form
    setNewDevice({
      token: '',
      platform: 'fcm',
      environment: 'development',
      topic: '',
      channels: [],
      alias: ''
    });
    setShowAddDeviceDialog(false);
  };

  // Remove device
  const removeDevice = (tokenToRemove: string) => {
    const updatedDevices = devices.filter(device => device.token !== tokenToRemove);
    setDevices(updatedDevices);
    
    if (selectedDevice === tokenToRemove) {
      setSelectedDevice('');
    }

    toast({
      title: "Device Removed",
      description: "Device token has been removed from the list.",
    });
  };

  // Add channel to device
  const addChannelToDevice = async (deviceToken: string, channel: string) => {
    if (!pubnub || !channel.trim()) return;

    const device = devices.find(d => d.token === deviceToken);
    if (!device) return;

    try {
      // Add channels to PubNub using the appropriate method for the platform
      if (device.platform === 'apns') {
        await pubnub.push.addChannels({
          channels: [channel.trim()],
          device: deviceToken,
          pushGateway: 'apns2',
          environment: device.environment || 'development',
          topic: device.topic || 'com.example.app'
        });
      } else {
        await pubnub.push.addChannels({
          channels: [channel.trim()],
          device: deviceToken,
          pushGateway: 'gcm'
        });
      }

      // Update local state
      const updatedDevices = devices.map(d => {
        if (d.token === deviceToken) {
          return {
            ...d,
            channels: [...d.channels, channel.trim()],
            lastModified: new Date().toISOString()
          };
        }
        return d;
      });
      
      setDevices(updatedDevices);

      toast({
        title: "Channel Added",
        description: `Successfully added "${channel}" to device.`,
      });

    } catch (error) {
      console.error('Error adding channel to device:', error);
      toast({
        title: "Failed to Add Channel",
        description: error instanceof Error ? error.message : "Failed to add channel to device",
        variant: "destructive",
      });
    }
  };

  // Remove channel from device
  const removeChannelFromDevice = async (deviceToken: string, channel: string) => {
    if (!pubnub) return;

    const device = devices.find(d => d.token === deviceToken);
    if (!device) return;

    try {
      // Remove channel from PubNub
      if (device.platform === 'apns') {
        await pubnub.push.removeChannels({
          channels: [channel],
          device: deviceToken,
          pushGateway: 'apns2',
          environment: device.environment || 'development',
          topic: device.topic || 'com.example.app'
        });
      } else {
        await pubnub.push.removeChannels({
          channels: [channel],
          device: deviceToken,
          pushGateway: 'gcm'
        });
      }

      // Update local state
      const updatedDevices = devices.map(d => {
        if (d.token === deviceToken) {
          return {
            ...d,
            channels: d.channels.filter(c => c !== channel),
            lastModified: new Date().toISOString()
          };
        }
        return d;
      });
      
      setDevices(updatedDevices);

      toast({
        title: "Channel Removed",
        description: `Successfully removed "${channel}" from device.`,
      });

    } catch (error) {
      console.error('Error removing channel from device:', error);
      toast({
        title: "Failed to Remove Channel",
        description: error instanceof Error ? error.message : "Failed to remove channel from device",
        variant: "destructive",
      });
    }
  };

  // List channels for device
  const listDeviceChannels = async (deviceToken: string) => {
    if (!pubnub) return;

    const device = devices.find(d => d.token === deviceToken);
    if (!device) return;

    try {
      let result;
      if (device.platform === 'apns') {
        result = await pubnub.push.listChannels({
          device: deviceToken,
          pushGateway: 'apns2',
          environment: device.environment || 'development',
          topic: device.topic || 'com.example.app'
        });
      } else {
        result = await pubnub.push.listChannels({
          device: deviceToken,
          pushGateway: 'gcm'
        });
      }

      // Update device with current channels from PubNub
      const currentChannels = result.channels || [];
      const updatedDevices = devices.map(d => {
        if (d.token === deviceToken) {
          return {
            ...d,
            channels: currentChannels,
            lastModified: new Date().toISOString()
          };
        }
        return d;
      });
      
      setDevices(updatedDevices);

      toast({
        title: "Channels Updated",
        description: `Found ${currentChannels.length} channels for this device.`,
      });

    } catch (error) {
      console.error('Error listing device channels:', error);
      toast({
        title: "Failed to List Channels",
        description: error instanceof Error ? error.message : "Failed to list device channels",
        variant: "destructive",
      });
    }
  };

  // Send test notification
  const sendTestNotification = async () => {
    if (!pubnub || !selectedChannel) {
      toast({
        title: "Configuration Required",
        description: "Please select a channel and ensure PubNub is configured.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Build the notification payload
      let payload: any = {
        message: notification.data || {},
      };

      // Add platform-specific push notifications
      if (notification.platform === 'fcm' || notification.platform === 'both') {
        payload.pn_fcm = {
          notification: {
            title: notification.title,
            body: notification.body,
            ...(notification.fcm?.icon && { icon: notification.fcm.icon }),
            ...(notification.fcm?.tag && { tag: notification.fcm.tag }),
            ...(notification.fcm?.clickAction && { click_action: notification.fcm.clickAction }),
          },
          data: notification.data || {},
          ...(notification.sound && { sound: notification.sound }),
        };
      }

      if (notification.platform === 'apns' || notification.platform === 'both') {
        const apnsPayload: any = {
          aps: {
            alert: {
              title: notification.title,
              body: notification.body,
            },
            ...(notification.badge && { badge: notification.badge }),
            ...(notification.sound && { sound: notification.sound }),
          },
          ...notification.data,
        };

        // Add APNs2 configuration if specified
        if (notification.apns?.topic) {
          apnsPayload.pn_push = [{
            targets: [{
              topic: notification.apns.topic,
              environment: notification.apns.environment || 'development'
            }],
            ...(notification.apns.collapseId && { collapse_id: notification.apns.collapseId }),
            ...(notification.apns.expirationDate && { expiration: notification.apns.expirationDate }),
          }];
        }

        payload.pn_apns = apnsPayload;
      }

      // Publish the notification
      const result = await pubnub.publish({
        channel: selectedChannel,
        message: payload
      });

      toast({
        title: "Notification Sent",
        description: `Test notification published to ${selectedChannel} (timetoken: ${result.timetoken})`,
      });

      console.log('Push notification sent:', {
        channel: selectedChannel,
        payload,
        result
      });

    } catch (error) {
      console.error('Error sending test notification:', error);
      toast({
        title: "Failed to Send Notification",
        description: error instanceof Error ? error.message : "Failed to send test notification",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Subscribe to debug channel
  const subscribeToDebugChannel = useCallback(async (channel: string) => {
    if (!pubnub) return;

    const debugChannel = `${channel}-pndebug`;
    
    try {
      // Unsubscribe from previous debug channel if any
      if (debugChannelSubscribed) {
        pubnub.unsubscribe({ channels: [debugChannelSubscribed] });
      }

      // Subscribe to new debug channel
      pubnub.subscribe({ 
        channels: [debugChannel],
        withPresence: false 
      });

      // Add listener for debug messages
      pubnub.addListener({
        message: (messageEvent: any) => {
          if (messageEvent.channel === debugChannel) {
            setDebugMessages(prev => [messageEvent, ...prev].slice(0, 50)); // Keep last 50 messages
          }
        }
      });

      setDebugChannelSubscribed(debugChannel);
      setDebugMessages([]); // Clear previous debug messages

      toast({
        title: "Debug Channel Subscribed",
        description: `Listening for debug messages on ${debugChannel}`,
      });

    } catch (error) {
      console.error('Error subscribing to debug channel:', error);
      toast({
        title: "Debug Subscription Failed",
        description: error instanceof Error ? error.message : "Failed to subscribe to debug channel",
        variant: "destructive",
      });
    }
  }, [pubnub, debugChannelSubscribed]);

  // Add new test channel
  const addTestChannel = () => {
    if (!newChannelName.trim()) return;

    const updatedChannels = [...testChannels, newChannelName.trim()];
    setTestChannels(updatedChannels);
    setSelectedChannel(newChannelName.trim());
    
    setNewChannelName('');
    setShowAddChannelDialog(false);

    toast({
      title: "Channel Added",
      description: `Added test channel: ${newChannelName.trim()}`,
    });
  };

  // Get platform icon
  const getPlatformIcon = (platform: 'apns' | 'fcm') => {
    return platform === 'apns' ? Apple : Bot;
  };

  // Get selected device details
  const selectedDeviceDetails = useMemo(() => {
    return devices.find(device => device.token === selectedDevice);
  }, [devices, selectedDevice]);

  // Copy payload to clipboard
  const copyPayload = async (payload: any) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      toast({
        title: "Copied!",
        description: "Notification payload copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy payload to clipboard",
        variant: "destructive",
      });
    }
  };

  // Show loading while mounting or PubNub is initializing
  if (!mounted || !pubnubReady) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <RefreshCw className="w-16 h-16 text-pubnub-blue mx-auto mb-4 animate-spin" />
            <h3 className="text-xl font-semibold mb-2">Loading Mobile Push Manager</h3>
            <p className="text-gray-600">
              {!mounted ? 'Starting up...' : 'Initializing PubNub SDK...'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // PubNub connection check
  if (!pubnub) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">PubNub Configuration Required</h3>
            <p className="text-gray-600">Please configure your PubNub keys in Settings to use Mobile Push</p>
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Mobile Push Notifications require the Mobile Push add-on to be enabled in your PubNub Admin Portal.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 h-full">
      <div className="max-w-7xl mx-auto h-full flex flex-col">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-pubnub-text mb-2">Mobile Push Notifications</h1>
          <p className="text-gray-600">Test and debug mobile push notifications for iOS and Android</p>
          <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Requirements:</strong> Mobile Push Notifications add-on must be enabled in your PubNub Admin Portal. 
              Configure APNs certificates and FCM server keys before testing.
            </p>
          </div>
        </div>

        {/* Main Layout */}
        <div className="flex-1 flex gap-6 min-h-0">
          {/* Left Panel - Device Management */}
          <div className="w-80 flex-shrink-0 flex flex-col gap-4">
            {/* Device Tokens */}
            <Card className="flex-1 flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Smartphone className="w-4 h-4" />
                    Device Tokens
                  </CardTitle>
                  <Dialog open={showAddDeviceDialog} onOpenChange={setShowAddDeviceDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-pubnub-red hover:bg-pubnub-red/90">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Add Device Token</DialogTitle>
                        <DialogDescription>
                          Add a device token for push notification testing.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Platform *</Label>
                          <Select 
                            value={newDevice.platform} 
                            onValueChange={(value) => setNewDevice(prev => ({ ...prev, platform: value as 'apns' | 'fcm' }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fcm">
                                <div className="flex items-center gap-2">
                                  <Bot className="w-4 h-4" />
                                  FCM (Android)
                                </div>
                              </SelectItem>
                              <SelectItem value="apns">
                                <div className="flex items-center gap-2">
                                  <Apple className="w-4 h-4" />
                                  APNs (iOS)
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Device Token *</Label>
                          <Textarea
                            value={newDevice.token}
                            onChange={(e) => setNewDevice(prev => ({ ...prev, token: e.target.value }))}
                            placeholder="Paste device token here..."
                            rows={3}
                            className="font-mono text-xs"
                          />
                        </div>
                        <div>
                          <Label>Alias (Optional)</Label>
                          <Input
                            value={newDevice.alias}
                            onChange={(e) => setNewDevice(prev => ({ ...prev, alias: e.target.value }))}
                            placeholder="e.g., John's iPhone"
                          />
                        </div>
                        {newDevice.platform === 'apns' && (
                          <>
                            <div>
                              <Label>Environment</Label>
                              <Select 
                                value={newDevice.environment} 
                                onValueChange={(value) => setNewDevice(prev => ({ ...prev, environment: value as 'development' | 'production' }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="development">Development</SelectItem>
                                  <SelectItem value="production">Production</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Bundle ID / Topic</Label>
                              <Input
                                value={newDevice.topic}
                                onChange={(e) => setNewDevice(prev => ({ ...prev, topic: e.target.value }))}
                                placeholder="com.example.app"
                              />
                            </div>
                          </>
                        )}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddDeviceDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={addDevice} disabled={!newDevice.token?.trim()}>
                          Add Device
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 overflow-y-auto space-y-2">
                {devices.length === 0 ? (
                  <div className="text-center p-8 text-gray-500">
                    <Smartphone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm">No device tokens added</p>
                    <p className="text-xs text-gray-400">Add device tokens to test push notifications</p>
                  </div>
                ) : (
                  <TooltipProvider>
                    {devices.map((device) => (
                      <Tooltip key={device.token}>
                        <TooltipTrigger asChild>
                          <div
                            className={`p-3 rounded cursor-pointer border transition-colors ${
                              selectedDevice === device.token 
                                ? 'bg-pubnub-blue text-white border-pubnub-blue' 
                                : 'hover:bg-gray-50 border-gray-200'
                            }`}
                            onClick={() => {
                              setSelectedDevice(device.token);
                              setActiveTab('device-management');
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {(() => {
                                    const PlatformIcon = getPlatformIcon(device.platform);
                                    return <PlatformIcon className="w-4 h-4 flex-shrink-0" />;
                                  })()}
                                  <span className="font-medium text-sm truncate">
                                    {device.alias || `${device.platform.toUpperCase()} Device`}
                                  </span>
                                </div>
                                <div className={`text-xs ${selectedDevice === device.token ? 'text-blue-200' : 'text-gray-500'}`}>
                                  {device.channels.length} channels
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeDevice(device.token);
                                }}
                                className={`h-6 w-6 p-0 ${selectedDevice === device.token ? 'hover:bg-blue-600 text-blue-200' : 'hover:bg-red-50 text-red-500'}`}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <div className="max-w-xs">
                            <div className="font-semibold">
                              {device.alias || `${device.platform.toUpperCase()} Device`}
                            </div>
                            <div className="text-xs font-mono bg-gray-800 p-1 rounded mt-1">
                              {device.token.substring(0, 20)}...
                            </div>
                            <div className="text-xs text-gray-300 mt-1">
                              {device.channels.length} channels • {device.platform === 'apns' ? device.environment : 'FCM'}
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </TooltipProvider>
                )}
              </CardContent>
            </Card>

            {/* Test Channels */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Test Channels
                  </CardTitle>
                  <Dialog open={showAddChannelDialog} onOpenChange={setShowAddChannelDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Test Channel</DialogTitle>
                        <DialogDescription>
                          Add a channel for testing push notifications.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Channel Name</Label>
                          <Input
                            value={newChannelName}
                            onChange={(e) => setNewChannelName(e.target.value)}
                            placeholder="push-test"
                            onKeyDown={(e) => e.key === 'Enter' && addTestChannel()}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddChannelDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={addTestChannel} disabled={!newChannelName.trim()}>
                          Add Channel
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-1">
                {testChannels.map((channel) => (
                  <div
                    key={channel}
                    className={`p-2 rounded cursor-pointer flex items-center justify-between ${
                      selectedChannel === channel 
                        ? 'bg-pubnub-blue text-white' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedChannel(channel)}
                  >
                    <span className="text-sm">{channel}</span>
                    {selectedChannel === channel && debugChannelSubscribed !== `${channel}-pndebug` && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          subscribeToDebugChannel(channel);
                        }}
                        className="h-6 text-xs text-blue-200 hover:bg-blue-600"
                      >
                        Debug
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="notification">Notification Builder</TabsTrigger>
                <TabsTrigger value="device-management">Device Management</TabsTrigger>
                <TabsTrigger value="debug">Debug Monitor</TabsTrigger>
              </TabsList>

              {/* Notification Builder Tab */}
              <TabsContent value="notification" className="flex-1">
                <Card className="h-full flex flex-col">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="w-5 h-5" />
                      Push Notification Builder
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                      Create and test push notifications for iOS and Android devices
                    </p>
                  </CardHeader>
                  
                  <CardContent className="flex-1 overflow-y-auto space-y-6">
                    {/* Platform Selection */}
                    <div className="space-y-2">
                      <Label>Target Platform</Label>
                      <Select 
                        value={notification.platform} 
                        onValueChange={(value) => setNotification(prev => ({ ...prev, platform: value as 'apns' | 'fcm' | 'both' }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="both">Both iOS and Android</SelectItem>
                          <SelectItem value="apns">iOS (APNs) only</SelectItem>
                          <SelectItem value="fcm">Android (FCM) only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Basic Notification */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Title *</Label>
                        <Input
                          value={notification.title}
                          onChange={(e) => setNotification(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="Notification title"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Target Channel *</Label>
                        <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {testChannels.map(channel => (
                              <SelectItem key={channel} value={channel}>{channel}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Body *</Label>
                      <Textarea
                        value={notification.body}
                        onChange={(e) => setNotification(prev => ({ ...prev, body: e.target.value }))}
                        placeholder="Notification message body"
                        rows={3}
                      />
                    </div>

                    {/* iOS/APNs Specific */}
                    {(notification.platform === 'apns' || notification.platform === 'both') && (
                      <div className="space-y-4 p-4 border rounded-lg">
                        <h4 className="font-medium flex items-center gap-2">
                          <Apple className="w-4 h-4" />
                          iOS (APNs) Settings
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Badge Count</Label>
                            <Input
                              type="number"
                              value={notification.badge || ''}
                              onChange={(e) => setNotification(prev => ({ ...prev, badge: parseInt(e.target.value) || undefined }))}
                              placeholder="1"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Sound</Label>
                            <Input
                              value={notification.sound || ''}
                              onChange={(e) => setNotification(prev => ({ ...prev, sound: e.target.value }))}
                              placeholder="default"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Environment</Label>
                            <Select 
                              value={notification.apns?.environment || 'development'} 
                              onValueChange={(value) => setNotification(prev => ({ 
                                ...prev, 
                                apns: { ...prev.apns, environment: value as 'development' | 'production' }
                              }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="development">Development</SelectItem>
                                <SelectItem value="production">Production</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Topic (Bundle ID)</Label>
                            <Input
                              value={notification.apns?.topic || ''}
                              onChange={(e) => setNotification(prev => ({ 
                                ...prev, 
                                apns: { ...prev.apns, topic: e.target.value }
                              }))}
                              placeholder="com.example.app"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Collapse ID</Label>
                            <Input
                              value={notification.apns?.collapseId || ''}
                              onChange={(e) => setNotification(prev => ({ 
                                ...prev, 
                                apns: { ...prev.apns, collapseId: e.target.value }
                              }))}
                              placeholder="notification-group"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Android/FCM Specific */}
                    {(notification.platform === 'fcm' || notification.platform === 'both') && (
                      <div className="space-y-4 p-4 border rounded-lg">
                        <h4 className="font-medium flex items-center gap-2">
                          <Bot className="w-4 h-4" />
                          Android (FCM) Settings
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Icon</Label>
                            <Input
                              value={notification.fcm?.icon || ''}
                              onChange={(e) => setNotification(prev => ({ 
                                ...prev, 
                                fcm: { ...prev.fcm, icon: e.target.value }
                              }))}
                              placeholder="ic_notification"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Tag</Label>
                            <Input
                              value={notification.fcm?.tag || ''}
                              onChange={(e) => setNotification(prev => ({ 
                                ...prev, 
                                fcm: { ...prev.fcm, tag: e.target.value }
                              }))}
                              placeholder="notification-tag"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Click Action</Label>
                            <Input
                              value={notification.fcm?.clickAction || ''}
                              onChange={(e) => setNotification(prev => ({ 
                                ...prev, 
                                fcm: { ...prev.fcm, clickAction: e.target.value }
                              }))}
                              placeholder="FLUTTER_NOTIFICATION_CLICK"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Custom Data */}
                    <div className="space-y-2">
                      <Label>Custom Data (JSON)</Label>
                      <Textarea
                        value={JSON.stringify(notification.data || {}, null, 2)}
                        onChange={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value);
                            setNotification(prev => ({ ...prev, data: parsed }));
                          } catch {
                            // Invalid JSON, don't update
                          }
                        }}
                        rows={4}
                        className="font-mono text-xs"
                        placeholder='{"key": "value", "source": "pubnub-dev-tools"}'
                      />
                    </div>

                    {/* Send Button */}
                    <div className="flex items-center gap-4">
                      <Button 
                        onClick={sendTestNotification}
                        disabled={loading || !notification.title.trim() || !notification.body.trim() || !selectedChannel}
                        className="bg-pubnub-red hover:bg-pubnub-red/90"
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Send Test Notification
                          </>
                        )}
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={() => {
                          // Generate payload preview
                          let payload: any = { message: notification.data || {} };
                          
                          if (notification.platform === 'fcm' || notification.platform === 'both') {
                            payload.pn_fcm = {
                              notification: {
                                title: notification.title,
                                body: notification.body,
                                ...(notification.fcm?.icon && { icon: notification.fcm.icon }),
                                ...(notification.fcm?.tag && { tag: notification.fcm.tag }),
                                ...(notification.fcm?.clickAction && { click_action: notification.fcm.clickAction }),
                              },
                              data: notification.data || {},
                              ...(notification.sound && { sound: notification.sound }),
                            };
                          }

                          if (notification.platform === 'apns' || notification.platform === 'both') {
                            const apnsPayload: any = {
                              aps: {
                                alert: {
                                  title: notification.title,
                                  body: notification.body,
                                },
                                ...(notification.badge && { badge: notification.badge }),
                                ...(notification.sound && { sound: notification.sound }),
                              },
                              ...notification.data,
                            };

                            if (notification.apns?.topic) {
                              apnsPayload.pn_push = [{
                                targets: [{
                                  topic: notification.apns.topic,
                                  environment: notification.apns.environment || 'development'
                                }],
                                ...(notification.apns.collapseId && { collapse_id: notification.apns.collapseId }),
                                ...(notification.apns.expirationDate && { expiration: notification.apns.expirationDate }),
                              }];
                            }

                            payload.pn_apns = apnsPayload;
                          }

                          copyPayload(payload);
                        }}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Payload
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Device Management Tab */}
              <TabsContent value="device-management" className="flex-1">
                <Card className="h-full flex flex-col">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Device Management
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                      Manage device tokens and their channel associations
                    </p>
                  </CardHeader>
                  
                  <CardContent className="flex-1 overflow-y-auto">
                    {!selectedDeviceDetails ? (
                      <div className="pt-0">
                        <div className="text-center">
                          <Smartphone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Device</h3>
                          <p className="text-gray-500">
                            Choose a device from the sidebar to manage its channels
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Device Info */}
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3 mb-3">
                            {(() => {
                              const PlatformIcon = getPlatformIcon(selectedDeviceDetails.platform);
                              return <PlatformIcon className="w-6 h-6" />;
                            })()}
                            <div>
                              <h3 className="font-medium">
                                {selectedDeviceDetails.alias || `${selectedDeviceDetails.platform.toUpperCase()} Device`}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {selectedDeviceDetails.platform === 'apns' ? selectedDeviceDetails.environment : 'FCM'} • {selectedDeviceDetails.channels.length} channels
                              </p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <Label className="text-xs text-gray-500">Device Token</Label>
                              <div className="font-mono text-xs bg-white p-2 rounded border break-all">
                                {selectedDeviceDetails.token}
                              </div>
                            </div>
                            {selectedDeviceDetails.platform === 'apns' && selectedDeviceDetails.topic && (
                              <div>
                                <Label className="text-xs text-gray-500">Bundle ID / Topic</Label>
                                <div className="text-sm">{selectedDeviceDetails.topic}</div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Channel Management */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Associated Channels</h4>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => listDeviceChannels(selectedDeviceDetails.token)}
                                disabled={loading}
                              >
                                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                Refresh
                              </Button>
                              <Dialog open={showDeviceChannels} onOpenChange={setShowDeviceChannels}>
                                <DialogTrigger asChild>
                                  <Button size="sm" className="bg-pubnub-blue hover:bg-pubnub-blue/90">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Channel
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Add Channel to Device</DialogTitle>
                                    <DialogDescription>
                                      Associate this device with a channel for push notifications.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <Label>Channel Name</Label>
                                      <Input
                                        value={channelToAdd}
                                        onChange={(e) => setChannelToAdd(e.target.value)}
                                        placeholder="channel-name"
                                        onKeyDown={(e) => e.key === 'Enter' && addChannelToDevice(selectedDeviceDetails.token, channelToAdd)}
                                      />
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button variant="outline" onClick={() => setShowDeviceChannels(false)}>
                                      Cancel
                                    </Button>
                                    <Button 
                                      onClick={() => {
                                        addChannelToDevice(selectedDeviceDetails.token, channelToAdd);
                                        setChannelToAdd('');
                                        setShowDeviceChannels(false);
                                      }}
                                      disabled={!channelToAdd.trim()}
                                    >
                                      Add Channel
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>

                          {selectedDeviceDetails.channels.length === 0 ? (
                            <div className="text-center p-8">
                              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                              <p className="text-gray-500">No channels associated</p>
                            </div>
                          ) : (
                            <div className="grid gap-2">
                              {selectedDeviceDetails.channels.map((channel, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                                >
                                  <div className="flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4 text-gray-400" />
                                    <span className="font-mono text-sm">{channel}</span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeChannelFromDevice(selectedDeviceDetails.token, channel)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Debug Monitor Tab */}
              <TabsContent value="debug" className="flex-1">
                <Card className="h-full flex flex-col">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Monitor className="w-5 h-5" />
                          Push Debug Monitor
                        </CardTitle>
                        <p className="text-sm text-gray-600">
                          Monitor push notification debug messages and delivery status
                        </p>
                      </div>
                      {debugChannelSubscribed && (
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-green-600">Listening to {debugChannelSubscribed}</span>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="flex-1 overflow-y-auto">
                    {!debugChannelSubscribed ? (
                      <div className="pt-0">
                        <div className="text-center">
                          <Monitor className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">Debug Monitor</h3>
                          <p className="text-gray-500 mb-4">
                            Select a test channel and click "Debug" to monitor push notification delivery
                          </p>
                          <div className="text-xs text-gray-400 space-y-1">
                            <p>Debug channels follow the pattern: [channel-name]-pndebug</p>
                            <p>They provide detailed information about push delivery success/failure</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Debug Messages</h4>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDebugMessages([])}
                              disabled={debugMessages.length === 0}
                            >
                              Clear Messages
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (pubnub && debugChannelSubscribed) {
                                  pubnub.unsubscribe({ channels: [debugChannelSubscribed] });
                                  setDebugChannelSubscribed(null);
                                  setDebugMessages([]);
                                }
                              }}
                            >
                              Stop Monitoring
                            </Button>
                          </div>
                        </div>

                        {debugMessages.length === 0 ? (
                          <div className="text-center p-8">
                            <Zap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">No debug messages received yet</p>
                            <p className="text-xs text-gray-400 mt-1">
                              Send a push notification to see debug information here
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {debugMessages.map((message, index) => (
                              <div key={index} className="p-3 bg-gray-50 rounded-lg border">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium">Debug Message</span>
                                  <span className="text-xs text-gray-500">
                                    {new Date(message.timetoken / 10000).toLocaleString()}
                                  </span>
                                </div>
                                <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
                                  {JSON.stringify(message.message, null, 2)}
                                </pre>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}