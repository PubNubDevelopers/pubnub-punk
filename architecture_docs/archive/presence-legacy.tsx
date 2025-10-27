// Archived copy of the original Presence page implementation.
// This file is preserved for reference only and is no longer part of the build.
import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Users, 
  Plus, 
  Minus, 
  Activity, 
  Eye, 
  UserPlus, 
  UserMinus, 
  Trash2, 
  Play, 
  Square, 
  Copy, 
  Settings,
  RefreshCw,
  Database
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { usePubNub } from '@/hooks/usePubNub';
import { storage } from '@/lib/storage';
import { ensurePubNubSdk } from '@/lib/sdk-loader';
import { useConfig } from '@/contexts/config-context';

// Current config version
const CURRENT_CONFIG_VERSION = 1;

// Create default page settings
const createDefaultPageSettings = () => {
  return {
    monitor: {
      channel: 'presence-demo-channel',
      enableHereNow: true,
      enableWhereNow: true,
      autoRefresh: true,
      refreshInterval: 5000
    },
    instances: {
      maxInstances: 10,
      namePrefix: 'Test-User'
    },
    ui: {
      showInstanceDetails: true
    },
    _version: CURRENT_CONFIG_VERSION
  };
};

// User instance interface
interface UserInstance {
  id: string;
  name: string;
  pubnub: any;
  subscription: any;
  isConnected: boolean;
  joinedChannels: string[];
  state?: any;
  lastSeen?: Date;
}

// Presence event interface
interface PresenceEvent {
  id: string;
  channel: string;
  action: 'join' | 'leave' | 'timeout' | 'state-change';
  uuid: string;
  occupancy: number;
  timestamp: Date;
  state?: any;
}

// Here Now data interface
interface HereNowData {
  channel: string;
  occupancy: number;
  uuids: string[];
  lastUpdated: Date;
}

export default function PresencePage() {
  const { toast } = useToast();
  const { setPageSettings: setConfigPageSettings, setConfigType } = useConfig();
  
  // Page settings state
  const [pageSettings, setPageSettings] = useState(() => createDefaultPageSettings());
  
  // Monitor settings
  const [monitorChannel, setMonitorChannel] = useState('presence-demo-channel');
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [enableHereNow, setEnableHereNow] = useState(true);
  const [enableWhereNow, setEnableWhereNow] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  
  // User instances state
  const [userInstances, setUserInstances] = useState<UserInstance[]>([]);
  const [maxInstances, setMaxInstances] = useState(10);
  const [namePrefix, setNamePrefix] = useState('Test-User');
  const [nextInstanceId, setNextInstanceId] = useState(1);
  
  // Presence data state
  const [presenceEvents, setPresenceEvents] = useState<PresenceEvent[]>([]);
  const [hereNowData, setHereNowData] = useState<HereNowData[]>([]);
  const [whereNowData, setWhereNowData] = useState<{uuid: string, channels: string[]}[]>([]);
  
  // UI state
  const [showInstanceDetails, setShowInstanceDetails] = useState(true);
  
  // Use centralized connection manager for monitoring (stateless operations)
  const { pubnub: monitorPubnub, isReady: monitorReady, isConnected: monitorConnected } = usePubNub({
    instanceId: 'presence-monitor',
    userId: 'presence-monitor-user',
    onConnectionError: (error) => {
      toast({
        title: "Monitor Connection Failed",
        description: error,
        variant: "destructive",
      });
    }
  });
  
  // Local subscription management (subscriptions stay local)
  const [monitorSubscription, setMonitorSubscription] = useState<any>(null);
  
  // Auto refresh timer
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Auto-sync: Create pageSettings from current state
  const currentPageSettings = useMemo(() => {
    return {
      monitor: {
        channel: monitorChannel,
        enableHereNow,
        enableWhereNow,
        autoRefresh,
        refreshInterval
      },
      instances: {
        maxInstances,
        namePrefix
      },
      ui: {
        showInstanceDetails
      },
      _version: CURRENT_CONFIG_VERSION
    };
  }, [
    monitorChannel,
    enableHereNow,
    enableWhereNow,
    autoRefresh,
    refreshInterval,
    maxInstances,
    namePrefix,
    showInstanceDetails
  ]);
  
  useEffect(() => {
    setPageSettings(currentPageSettings);
    setConfigPageSettings(currentPageSettings);
    console.log('🔧 Presence Page Settings Updated:', currentPageSettings);
  }, [currentPageSettings, setConfigPageSettings]);

  // Set config type on mount
  useEffect(() => {
    setConfigType('PRESENCE');
  }, [setConfigType]);

  // Auto refresh timer effect
  useEffect(() => {
    if (autoRefresh && isMonitoring && refreshInterval > 0) {
      refreshTimerRef.current = setInterval(() => {
        refreshPresenceData();
      }, refreshInterval);
    } else {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [autoRefresh, isMonitoring, refreshInterval, monitorPubnub, enableHereNow, enableWhereNow, monitorChannel, userInstances]);

  // Cleanup on unmount (monitor uses centralized manager, users use direct instances)
  useEffect(() => {
    return () => {
      if (monitorSubscription) {
        monitorSubscription.unsubscribe();
      }
      // Cleanup all user instances (they use direct PubNub instances)
      userInstances.forEach(instance => {
        if (instance.subscription) {
          instance.subscription.unsubscribe();
        }
        if (instance.pubnub) {
          instance.pubnub.removeAllListeners();
          instance.pubnub.destroy();
        }
      });
    };
  }, []);

  // Start monitoring function
  const startMonitoring = async () => {
    if (!monitorReady || !monitorConnected) {
      toast({
        title: "Connection Not Ready",
        description: "Please wait for PubNub connection to be established.",
        variant: "destructive",
      });
      return;
    }

    if (!monitorChannel.trim()) {
      toast({
        title: "Channel Required",
        description: "Please enter a channel name to monitor.",
        variant: "destructive",
      });
      return;
    }

    try {

      // Create subscription for presence events using centralized instance
      const channel = monitorPubnub.channel(monitorChannel);
      const subscription = channel.subscription({
        receivePresenceEvents: true
      });

      // Add presence event listener
      subscription.onPresence = (presenceEvent: any) => {
        console.log('Received presence event:', presenceEvent);
        
        const newPresenceEvent: PresenceEvent = {
          id: Date.now().toString(),
          channel: presenceEvent.channel,
          action: presenceEvent.action,
          uuid: presenceEvent.uuid,
          occupancy: presenceEvent.occupancy,
          timestamp: new Date(),
          state: presenceEvent.state
        };

        setPresenceEvents(prev => {
          const newEvents = [newPresenceEvent, ...prev];
          // Keep only last 100 events
          return newEvents.slice(0, 100);
        });
      };

      // Add status listener
      subscription.onStatus = (statusEvent: any) => {
        console.log('Monitor status event:', statusEvent);
        
        if (statusEvent.category === 'PNConnectedCategory') {
          console.log('Successfully connected to presence monitoring');
          // Initial data fetch
          refreshPresenceData();
        }
      };

      // Subscribe
      subscription.subscribe();
      setMonitorSubscription(subscription);
      setIsMonitoring(true);

      toast({
        title: "Monitoring Started",
        description: `Now monitoring presence events on ${monitorChannel}`,
      });

    } catch (error) {
      console.error('Failed to start monitoring:', error);
      toast({
        title: "Monitor Failed",
        description: `Failed to start monitoring: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  // Stop monitoring function
  const stopMonitoring = async () => {
    try {
      if (monitorSubscription) {
        monitorSubscription.unsubscribe();
        setMonitorSubscription(null);
      }

      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }

      setIsMonitoring(false);

      toast({
        title: "Monitoring Stopped",
        description: "Presence monitoring has been stopped",
      });
    } catch (error) {
      console.error('Error stopping monitoring:', error);
      setIsMonitoring(false);
      toast({
        title: "Stopped",
        description: "Monitoring stopped with cleanup (some errors occurred)",
        variant: "destructive",
      });
    }
  };

  // Refresh presence data function
  const refreshPresenceData = async () => {
    if (!monitorPubnub || !monitorReady || !enableHereNow) return;

    try {
      // Get Here Now data
      const hereNowResult = await monitorPubnub.hereNow({
        channels: [monitorChannel],
        includeUUIDs: true,
        includeState: true
      });

      const channelData = hereNowResult.channels[monitorChannel];
      if (channelData) {
        const newHereNowData: HereNowData = {
          channel: monitorChannel,
          occupancy: channelData.occupancy,
          uuids: channelData.occupants?.map((occupant: any) => occupant.uuid) || [],
          lastUpdated: new Date()
        };

        setHereNowData(prev => {
          const filtered = prev.filter(data => data.channel !== monitorChannel);
          return [newHereNowData, ...filtered];
        });
      }

      // Get Where Now data for user instances if enabled
      if (enableWhereNow && userInstances.length > 0) {
        const whereNowPromises = userInstances.map(async (instance) => {
          try {
            const whereNowResult = await monitorPubnub.whereNow({
              uuid: instance.id
            });
            return {
              uuid: instance.id,
              channels: whereNowResult.channels || []
            };
          } catch (error) {
            console.warn(`Where Now failed for ${instance.id}:`, error);
            return {
              uuid: instance.id,
              channels: []
            };
          }
        });

        const whereNowResults = await Promise.all(whereNowPromises);
        setWhereNowData(whereNowResults);
      }

    } catch (error) {
      console.error('Failed to refresh presence data:', error);
    }
  };

  // Create new user instance
  const createUserInstance = async () => {
    const settings = storage.getSettings();
    
    if (!settings.credentials.subscribeKey) {
      toast({
        title: "Configuration Required",
        description: "Please configure your PubNub Subscribe Key in Settings first.",
        variant: "destructive",
      });
      return;
    }

    if (userInstances.length >= maxInstances) {
      toast({
        title: "Limit Reached",
        description: `Maximum of ${maxInstances} instances allowed.`,
        variant: "destructive",
      });
      return;
    }

    try {
      const instanceId = `${namePrefix}-${nextInstanceId}`;
      const userId = `${instanceId}-${Date.now()}`;

      // Initialize PubNub instance for this user
      const pubnubConfig: any = {
        publishKey: settings.credentials.publishKey,
        subscribeKey: settings.credentials.subscribeKey,
        userId: userId,
        enableEventEngine: true
      };
      
      if (settings.credentials.pamToken) {
        pubnubConfig.authKey = settings.credentials.pamToken;
      }
      
      await ensurePubNubSdk(settings.sdkVersion);

      if (!window.PubNub) {
        throw new Error('PubNub SDK not available');
      }

      const pubnub = new window.PubNub(pubnubConfig);

      const newInstance: UserInstance = {
        id: userId,
        name: instanceId,
        pubnub: pubnub,
        subscription: null,
        isConnected: false,
        joinedChannels: [],
        state: {},
        lastSeen: new Date()
      };

      setUserInstances(prev => [...prev, newInstance]);
      setNextInstanceId(prev => prev + 1);

      toast({
        title: "User Created",
        description: `Created test user: ${instanceId}`,
      });

    } catch (error) {
      console.error('Failed to create user instance:', error);
      toast({
        title: "Creation Failed",
        description: `Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  // Remove user instance
  const removeUserInstance = async (instanceId: string) => {
    const instance = userInstances.find(inst => inst.id === instanceId);
    if (!instance) return;

    try {
      // Cleanup PubNub instance (direct instance, not centralized)
      if (instance.subscription) {
        instance.subscription.unsubscribe();
      }
      if (instance.pubnub) {
        instance.pubnub.removeAllListeners();
        instance.pubnub.destroy();
      }

      // Remove from state
      setUserInstances(prev => prev.filter(inst => inst.id !== instanceId));

      toast({
        title: "User Removed",
        description: `Removed test user: ${instance.name}`,
      });

    } catch (error) {
      console.error('Failed to remove user instance:', error);
      toast({
        title: "Removal Failed",
        description: "Failed to remove user instance",
        variant: "destructive",
      });
    }
  };

  // Toggle user instance connection
  const toggleUserConnection = async (instanceId: string) => {
    const instance = userInstances.find(inst => inst.id === instanceId);
    if (!instance) return;

    try {
      if (instance.isConnected) {
        // Disconnect
        if (instance.subscription) {
          instance.subscription.unsubscribe();
        }
        
        setUserInstances(prev => prev.map(inst => 
          inst.id === instanceId 
            ? { ...inst, isConnected: false, subscription: null, joinedChannels: [] }
            : inst
        ));

        toast({
          title: "User Disconnected",
          description: `${instance.name} disconnected from all channels`,
        });
      } else {
        // Connect to monitor channel
        if (!monitorChannel.trim()) {
          toast({
            title: "No Channel",
            description: "Please set a monitor channel first",
            variant: "destructive",
          });
          return;
        }

        const channel = instance.pubnub.channel(monitorChannel);
        const subscription = channel.subscription({
          receivePresenceEvents: false // Don't need presence events on test instances
        });

        // Add message listener (optional)
        subscription.onMessage = (messageEvent: any) => {
          console.log(`${instance.name} received message:`, messageEvent);
        };

        subscription.onStatus = (statusEvent: any) => {
          console.log(`${instance.name} status:`, statusEvent);
          
          if (statusEvent.category === 'PNConnectedCategory') {
            console.log(`${instance.name} successfully connected`);
          }
        };

        // Subscribe
        subscription.subscribe();

        setUserInstances(prev => prev.map(inst => 
          inst.id === instanceId 
            ? { 
                ...inst, 
                isConnected: true, 
                subscription: subscription, 
                joinedChannels: [monitorChannel],
                lastSeen: new Date()
              }
            : inst
        ));

        toast({
          title: "User Connected",
          description: `${instance.name} joined ${monitorChannel}`,
        });
      }

    } catch (error) {
      console.error('Failed to toggle user connection:', error);
      toast({
        title: "Connection Failed",
        description: `Failed to toggle connection for ${instance.name}`,
        variant: "destructive",
      });
    }
  };

  // Remove all user instances
  const removeAllUserInstances = async () => {
    try {
      // Cleanup all instances (direct instances, not centralized)
      userInstances.forEach(instance => {
        if (instance.subscription) {
          instance.subscription.unsubscribe();
        }
        if (instance.pubnub) {
          instance.pubnub.removeAllListeners();
          instance.pubnub.destroy();
        }
      });

      setUserInstances([]);
      setNextInstanceId(1);

      toast({
        title: "All Users Removed",
        description: "All test users have been removed",
      });

    } catch (error) {
      console.error('Failed to remove all instances:', error);
      toast({
        title: "Cleanup Failed",
        description: "Failed to remove all user instances",
        variant: "destructive",
      });
    }
  };

  // Connect all instances to monitor channel
  const connectAllInstances = async () => {
    if (!monitorChannel.trim()) {
      toast({
        title: "No Channel",
        description: "Please set a monitor channel first",
        variant: "destructive",
      });
      return;
    }

    try {
      const promises = userInstances
        .filter(instance => !instance.isConnected)
        .map(instance => toggleUserConnection(instance.id));

      await Promise.all(promises);

      toast({
        title: "Users Connected",
        description: `Connected ${promises.length} users to ${monitorChannel}`,
      });

    } catch (error) {
      console.error('Failed to connect all instances:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect all users",
        variant: "destructive",
      });
    }
  };

  // Disconnect all instances
  const disconnectAllInstances = async () => {
    try {
      const promises = userInstances
        .filter(instance => instance.isConnected)
        .map(instance => toggleUserConnection(instance.id));

      await Promise.all(promises);

      toast({
        title: "Users Disconnected",
        description: `Disconnected ${promises.length} users`,
      });

    } catch (error) {
      console.error('Failed to disconnect all instances:', error);
      toast({
        title: "Disconnection Failed",
        description: "Failed to disconnect all users",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Real-Time Monitoring and REST Calls - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Real-Time Presence Monitor */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                    <Activity className="text-white h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>Real-Time Presence Monitor</CardTitle>
                    <p className="text-sm text-gray-600">
                      {isMonitoring 
                        ? `Monitoring ${monitorChannel} • ${presenceEvents.length} events received` 
                        : "Start monitoring to see presence events"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {isMonitoring ? 'Active' : 'Inactive'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {isMonitoring ? 'Receiving events' : 'Not monitoring'}
                    </div>
                  </div>
                  <Switch
                    checked={isMonitoring}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        startMonitoring();
                      } else {
                        stopMonitoring();
                      }
                    }}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Monitor Configuration */}
              <div className="space-y-2">
                <Label htmlFor="monitor-channel">Channel to Monitor</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="monitor-channel"
                    placeholder="presence-demo-channel"
                    value={monitorChannel}
                    onChange={(e) => setMonitorChannel(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(monitorChannel)}
                    disabled={!monitorChannel.trim()}
                    className="px-2"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500">Channel to monitor for presence events</p>
              </div>

              {/* Recent Presence Events */}
              {isMonitoring ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-700">Recent Events</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPresenceEvents([])}
                      disabled={presenceEvents.length === 0}
                      className="h-6 px-2 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="bg-white rounded-lg border p-4 max-h-64 overflow-y-auto">
                    {presenceEvents.length === 0 ? (
                      <div className="text-center text-gray-500 text-sm">
                        No presence events yet...
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {presenceEvents.map((event) => (
                          <div key={event.id} className="text-xs border-b last:border-b-0 pb-2 last:pb-0">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center space-x-2">
                                <span className={`w-2 h-2 rounded-full ${
                                  event.action === 'join' ? 'bg-green-500' :
                                  event.action === 'leave' ? 'bg-red-500' :
                                  event.action === 'timeout' ? 'bg-orange-500' :
                                  'bg-blue-500'
                                }`} />
                                <span className="font-medium">
                                  {event.action.charAt(0).toUpperCase() + event.action.slice(1)}
                                </span>
                              </div>
                              <span className="text-gray-500">
                                {event.timestamp.toLocaleTimeString()}
                              </span>
                            </div>
                            <div className="text-gray-600">
                              <div><strong>User:</strong> {event.uuid}</div>
                              <div><strong>Channel:</strong> {event.channel}</div>
                              <div><strong>Occupancy:</strong> {event.occupancy}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-6 text-center">
                  <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">
                    Start monitoring to see real-time presence events
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Presence REST Calls Panel */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Database className="text-white h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>Presence REST Calls</CardTitle>
                    <p className="text-sm text-gray-600">Execute PubNub Presence API calls and view results</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* API Settings */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-700">API Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={enableHereNow}
                        onCheckedChange={setEnableHereNow}
                      />
                      <Label>Here Now API</Label>
                    </div>
                    <p className="text-xs text-gray-500">Get current occupancy</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={enableWhereNow}
                        onCheckedChange={setEnableWhereNow}
                      />
                      <Label>Where Now API</Label>
                    </div>
                    <p className="text-xs text-gray-500">Track user channels</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={autoRefresh}
                        onCheckedChange={setAutoRefresh}
                      />
                      <Label>Auto Refresh</Label>
                    </div>
                    <p className="text-xs text-gray-500">Automatically update data</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="refresh-interval">Auto Refresh Interval (ms)</Label>
                  <Input
                    id="refresh-interval"
                    type="number"
                    placeholder="5000"
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(parseInt(e.target.value) || 5000)}
                    disabled={!autoRefresh}
                    className="max-w-xs"
                  />
                  <p className="text-xs text-gray-500">How often to refresh occupancy data</p>
                </div>
              </div>

              {/* Current Occupancy Data */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-700">Current Occupancy</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshPresenceData}
                    disabled={!isMonitoring || !enableHereNow}
                    className="flex items-center space-x-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Refresh Data</span>
                  </Button>
                </div>

                <div className="bg-white rounded-lg border p-4 max-h-64 overflow-y-auto">
                  {!isMonitoring ? (
                    <div className="text-center text-gray-500 text-sm">
                      Start monitoring to see occupancy data
                    </div>
                  ) : !enableHereNow ? (
                    <div className="text-center text-gray-500 text-sm">
                      Enable Here Now API to see occupancy data
                    </div>
                  ) : hereNowData.length === 0 ? (
                    <div className="text-center text-gray-500 text-sm">
                      No occupancy data yet...
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {hereNowData.map((data, index) => (
                        <div key={index} className="border-b last:border-b-0 pb-3 last:pb-0">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">#{data.channel}</span>
                            <span className="text-sm text-gray-500">
                              {data.lastUpdated.toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="text-lg font-bold text-green-600 mb-2">
                            {data.occupancy} user{data.occupancy !== 1 ? 's' : ''} online
                          </div>
                          {data.uuids.length > 0 && (
                            <div className="text-xs">
                              <div className="text-gray-600 mb-1">Active Users:</div>
                              <div className="flex flex-wrap gap-1">
                                {data.uuids.slice(0, 3).map((uuid, i) => (
                                  <span key={i} className="bg-gray-100 px-2 py-1 rounded text-xs">
                                    {uuid.length > 12 ? uuid.substring(0, 12) + '...' : uuid}
                                  </span>
                                ))}
                                {data.uuids.length > 3 && (
                                  <span className="text-gray-500 text-xs">
                                    +{data.uuids.length - 3} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Where Now Data */}
              {enableWhereNow && whereNowData.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-700">Where Now Results</h4>
                  <div className="bg-white rounded-lg border p-4 max-h-32 overflow-y-auto">
                    <div className="space-y-2">
                      {whereNowData.map((data, index) => (
                        <div key={index} className="text-xs border-b last:border-b-0 pb-2 last:pb-0">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{data.uuid.length > 20 ? data.uuid.substring(0, 20) + '...' : data.uuid}</span>
                            <span className="text-gray-500">{data.channels.length} channels</span>
                          </div>
                          {data.channels.length > 0 && (
                            <div className="text-gray-600 mt-1">
                              Channels: {data.channels.join(', ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Test User Instances */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-pubnub-red rounded-lg flex items-center justify-center" style={{ backgroundColor: 'hsl(351, 72%, 47%)' }}>
                    <Users className="text-white h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>Test User Instances</CardTitle>
                    <p className="text-sm text-gray-600">Create simulated users to test presence</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={createUserInstance}
                    size="sm"
                    className="bg-pubnub-red hover:bg-pubnub-red/90"
                    style={{ backgroundColor: 'hsl(351, 72%, 47%)' }}
                    disabled={userInstances.length >= maxInstances}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add User
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Instance Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name-prefix">User Name Prefix</Label>
                  <Input
                    id="name-prefix"
                    placeholder="Test-User"
                    value={namePrefix}
                    onChange={(e) => setNamePrefix(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">Prefix for generated user names</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-instances">Max Instances</Label>
                  <Input
                    id="max-instances"
                    type="number"
                    placeholder="10"
                    value={maxInstances}
                    onChange={(e) => setMaxInstances(parseInt(e.target.value) || 10)}
                    min="1"
                    max="50"
                  />
                  <p className="text-xs text-gray-500">Maximum number of test users</p>
                </div>
              </div>

              {/* Instance List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-700">Active Instances ({userInstances.length})</h4>
                  {userInstances.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={removeAllUserInstances}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Clear All
                    </Button>
                  )}
                </div>
                
                {userInstances.length === 0 ? (
                  <div className="bg-gray-50 rounded-lg p-6 text-center">
                    <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No test users created yet</p>
                    <p className="text-xs text-gray-400 mt-1">Add users to simulate presence activity</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {userInstances.map((instance) => (
                      <div key={instance.id} className="bg-white border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${
                              instance.isConnected ? 'bg-green-500' : 'bg-gray-400'
                            }`} />
                            <div>
                              <div className="text-sm font-medium">{instance.name}</div>
                              <div className="text-xs text-gray-500">
                                {instance.isConnected 
                                  ? `Connected • ${instance.joinedChannels.length} channels`
                                  : 'Disconnected'
                                }
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleUserConnection(instance.id)}
                              className="h-6 px-2"
                            >
                              {instance.isConnected ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeUserInstance(instance.id)}
                              className="h-6 px-2 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        {showInstanceDetails && instance.isConnected && (
                          <div className="mt-2 pt-2 border-t border-gray-100">
                            <div className="text-xs text-gray-600">
                              <div><strong>ID:</strong> {instance.id}</div>
                              <div><strong>Channels:</strong> {instance.joinedChannels.join(', ') || 'None'}</div>
                              {instance.lastSeen && (
                                <div><strong>Last Seen:</strong> {instance.lastSeen.toLocaleTimeString()}</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Presence Administration */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-pubnub-blue rounded-lg flex items-center justify-center" style={{ backgroundColor: 'hsl(217, 96%, 64%)' }}>
                    <Settings className="text-white h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>Presence Administration</CardTitle>
                    <p className="text-sm text-gray-600">Advanced presence management tools</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Quick Actions */}
              <div className="grid grid-cols-1 gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPresenceEvents([]);
                    setHereNowData([]);
                    setWhereNowData([]);
                    toast({ title: "Cleared", description: "All presence data cleared" });
                  }}
                  className="justify-start text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All Presence Data
                </Button>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show Instance Details</Label>
                    <p className="text-xs text-gray-500">Display detailed instance information</p>
                  </div>
                  <Switch
                    checked={showInstanceDetails}
                    onCheckedChange={setShowInstanceDetails}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Batch Operations</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={connectAllInstances}
                      disabled={userInstances.length === 0}
                    >
                      <UserPlus className="h-3 w-3 mr-1" />
                      Join All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={disconnectAllInstances}
                      disabled={userInstances.length === 0}
                    >
                      <UserMinus className="h-3 w-3 mr-1" />
                      Leave All
                    </Button>
                  </div>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="text-sm text-yellow-800">
                    <strong>Note:</strong> Make sure Presence is enabled for your channels in the PubNub Admin Portal.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
