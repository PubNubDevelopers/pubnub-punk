import { useState, useEffect, useRef, useMemo } from 'react';
import { MessageCircle, Send, Play, Square, Copy, Settings, HelpCircle, Filter, Zap, RefreshCw, MapPin, Plus, X, ArrowDown, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { storage } from '@/lib/storage';
import { useConfig } from '@/contexts/config-context';
import { usePubNub } from '@/hooks/usePubNub';
import { LiveMessagesPanel } from './LiveMessagesPanel';
import { QuickPublishPanel } from './QuickPublishPanel';

import {
  PubSubConfig,
  PublishFormData,
  SubscribeFormData,
  UIState,
  FilterState,
  FilterConfig,
  MessageData,
  PresenceEvent,
  PublishStatus,
  PubSubPageProps
} from './types';

import {
  createDefaultPageSettings,
  migrateConfig,
  deepMerge,
  stateToPageSettings,
  parseChannels,
  generateFilterExpression,
  createDefaultFilter,
  generateUniqueId
} from './utils';

export default function PubSubPage({ className }: PubSubPageProps) {
  const { toast } = useToast();
  const { setPageSettings: setConfigPageSettings, setConfigType } = useConfig();

  // Core form data state
  const [publishData, setPublishData] = useState<PublishFormData>({
    channel: 'hello_world',
    message: '{"text": "Hello, World!", "sender": "PubNub Developer Tools"}',
    storeInHistory: true,
    sendByPost: false,
    ttl: '',
    customMessageType: 'text-message',
    meta: ''
  });

  const [subscribeData, setSubscribeData] = useState<SubscribeFormData>({
    channels: 'hello_world',
    channelGroups: '',
    receivePresenceEvents: false,
    cursor: {
      timetoken: '',
      region: ''
    },
    withPresence: false,
    heartbeat: 300,
    restoreOnReconnect: true
  });

  // UI state
  const [uiState, setUIState] = useState<UIState>({
    showAdvanced: false,
    showFilters: false,
    showMessages: true,
    messagesHeight: 200,
    showRawMessageData: false
  });

  // Filter state
  const [filterState, setFilterState] = useState<FilterState>({
    logic: '&&',
    conditions: [createDefaultFilter(1)]
  });

  // Message and subscription state
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [presenceEvents, setPresenceEvents] = useState<PresenceEvent[]>([]);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);

  // Publish status
  const [publishStatus, setPublishStatus] = useState<PublishStatus>({
    isVisible: false,
    isSuccess: false,
    isFlashing: false
  });

  // Refs for scrolling
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const presenceContainerRef = useRef<HTMLDivElement>(null);

  // Schema-driven page settings - auto-synced with state changes
  const [pageSettings, setPageSettings] = useState<PubSubConfig>(() => createDefaultPageSettings());

  // Use centralized PubNub hook for stateless operations (publish, etc.)
  const {
    pubnub,
    isReady: pubnubReady,
    connectionError,
    isConnected,
  } = usePubNub({
    instanceId: 'pubsub-page',
    userId: 'pubsub-page-user',
    onConnectionError: (error) => {
      toast({
        title: "PubNub Connection Failed",
        description: error,
        variant: "destructive",
      });
    }
  });

  // Local subscription management (separate instance for subscriptions)
  const [localPubnubInstance, setLocalPubnubInstance] = useState<any>(null);
  const [localSubscription, setLocalSubscription] = useState<any>(null);

  // Additional UI state for LiveMessagesPanel
  const [showRawMessageData, setShowRawMessageData] = useState(false);
  const [showMessages, setShowMessages] = useState(true);
  const [messagesHeight, setMessagesHeight] = useState(300);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showPresenceScrollButton, setShowPresenceScrollButton] = useState(false);

  // Config restoration function
  const restoreFromConfig = (config: any): boolean => {
    try {
      // Migrate config to current version
      const migratedConfig = migrateConfig(config);

      // Merge with defaults for graceful degradation
      const defaultSettings = createDefaultPageSettings();
      const safeConfig = deepMerge(defaultSettings, migratedConfig);

      // Update individual state objects from config
      if (safeConfig.publish) {
        setPublishData(safeConfig.publish);
      }
      if (safeConfig.subscribe) {
        setSubscribeData(safeConfig.subscribe);
      }
      if (safeConfig.ui) {
        setUIState(safeConfig.ui);
      }
      if (safeConfig.filters) {
        setFilterState(safeConfig.filters);
      }

      // Update page settings
      setPageSettings(safeConfig);

      console.log('🔧 PubSub Page Settings Restored:', safeConfig);
      return true;
    } catch (error) {
      console.error('Failed to restore config:', error);
      return false;
    }
  };

  // Auto-sync: Create pageSettings from current state
  const currentPageSettings = useMemo(() => {
    return stateToPageSettings(publishData, subscribeData, uiState, filterState);
  }, [publishData, subscribeData, uiState, filterState]);

  useEffect(() => {
    setPageSettings(currentPageSettings);
    setConfigPageSettings(currentPageSettings);
    console.log('🔧 PubSub Page Settings Updated:', currentPageSettings);
  }, [currentPageSettings, setConfigPageSettings]);

  // Set config type on mount
  useEffect(() => {
    setConfigType('pubsub-page');
  }, [setConfigType]);

  // Event handlers for form data changes
  const handlePublishDataChange = (field: keyof PublishFormData, value: any) => {
    setPublishData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubscribeDataChange = (field: string, value: any) => {
    setSubscribeData(prev => {
      const newData = { ...prev };
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        (newData as any)[parent] = { ...(newData as any)[parent], [child]: value };
      } else {
        (newData as any)[field] = value;
      }
      return newData;
    });
  };

  const handleUIStateChange = (field: keyof UIState, value: any) => {
    setUIState(prev => ({ ...prev, [field]: value }));
  };

  const handleFilterStateChange = (filters: FilterConfig[]) => {
    setFilterState(prev => ({ ...prev, conditions: filters }));
  };

  const handleFilterLogicChange = (logic: string) => {
    setFilterState(prev => ({ ...prev, logic }));
  };

  // Publish functionality - Phase 3 implementation
  const handlePublish = async () => {
    if (!pubnub || !pubnubReady) {
      toast({
        title: "PubNub Not Ready",
        description: "Please wait for PubNub to initialize or check your connection.",
        variant: "destructive",
      });
      return;
    }

    setPublishStatus({
      isVisible: true,
      isSuccess: false,
      isFlashing: false
    });

    try {
      // Parse message as JSON if possible, otherwise use as string
      let messagePayload;
      try {
        const trimmedMessage = publishData.message.trim();
        if ((trimmedMessage.startsWith('{') && trimmedMessage.endsWith('}')) || 
            (trimmedMessage.startsWith('[') && trimmedMessage.endsWith(']'))) {
          messagePayload = JSON.parse(trimmedMessage);
        } else {
          messagePayload = publishData.message;
        }
      } catch {
        messagePayload = publishData.message;
      }

      // Parse meta as JSON if provided
      let metaPayload = undefined;
      if (publishData.meta.trim()) {
        try {
          metaPayload = JSON.parse(publishData.meta);
        } catch {
          toast({
            title: "Invalid Meta JSON",
            description: "Meta field contains invalid JSON. Please fix the format.",
            variant: "destructive",
          });
          setPublishStatus({
            isVisible: true,
            isSuccess: false,
            isFlashing: false
          });
          return;
        }
      }

      // Prepare publish parameters
      const publishParams: any = {
        message: messagePayload,
        channel: publishData.channel,
        storeInHistory: publishData.storeInHistory,
        sendByPost: publishData.sendByPost
      };

      // Add optional parameters if provided
      if (publishData.ttl && publishData.ttl.trim()) {
        const ttlValue = parseInt(publishData.ttl);
        if (isNaN(ttlValue) || ttlValue < 0) {
          toast({
            title: "Invalid TTL",
            description: "TTL must be a positive number.",
            variant: "destructive",
          });
          setPublishStatus({
            isVisible: true,
            isSuccess: false,
            isFlashing: false
          });
          return;
        }
        publishParams.ttl = ttlValue;
      }

      if (publishData.customMessageType && publishData.customMessageType.trim()) {
        publishParams.customMessageType = publishData.customMessageType;
      }

      if (metaPayload) {
        publishParams.meta = metaPayload;
      }

      console.log('Publishing with params:', publishParams);

      // Make the actual PubNub publish API call
      const publishResult = await pubnub.publish(publishParams);
      console.log('Publish successful:', publishResult);

      setPublishStatus({
        isVisible: true,
        isSuccess: true,
        timetoken: publishResult.timetoken,
        isFlashing: false
      });
      
      toast({
        title: "Message Published",
        description: `Message successfully published to channel "${publishData.channel}"`,
      });

      // Status persists until next publish attempt (no auto-reset)

    } catch (error) {
      console.error('Publish failed:', error);
      setPublishStatus({
        isVisible: true,
        isSuccess: false,
        isFlashing: false
      });
      
      toast({
        title: "Publish Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });

      // Error status persists until next publish attempt (no auto-reset)
    }
  };

  const handleToggleSubscription = () => {
    console.log('Subscription toggle functionality will be implemented in Phase 4');
    // TODO: Implement in Phase 4
  };

  const handleFormatMessage = () => {
    try {
      const parsed = JSON.parse(publishData.message);
      handlePublishDataChange('message', JSON.stringify(parsed, null, 2));
    } catch (error) {
      toast({
        title: "Invalid JSON",
        description: "Unable to format message - not valid JSON",
        variant: "destructive",
      });
    }
  };

  const handleCopyAll = () => {
    if (messages.length === 0) return;
    
    const messagesText = messages.map(msg => 
      JSON.stringify({
        channel: msg.channel,
        timetoken: msg.timetoken,
        message: msg.message,
        publisher: (msg as any).publisher || null
      }, null, 2)
    ).join('\n\n');
    
    navigator.clipboard.writeText(messagesText).then(() => {
      toast({
        title: "Copied",
        description: `${messages.length} message${messages.length === 1 ? '' : 's'} copied to clipboard`,
      });
    }).catch(() => {
      toast({
        title: "Copy Failed",
        description: "Failed to copy messages to clipboard",
        variant: "destructive",
      });
    });
  };

  const handleCopyAllPresenceEvents = () => {
    if (presenceEvents.length === 0) return;
    
    const eventsText = presenceEvents.map(event => 
      JSON.stringify({
        channel: event.channel,
        action: event.action,
        occupancy: event.occupancy,
        uuid: event.uuid,
        timestamp: event.timestamp,
        timetoken: event.timetoken
      }, null, 2)
    ).join('\n\n');
    
    navigator.clipboard.writeText(eventsText).then(() => {
      toast({
        title: "Copied",
        description: `${presenceEvents.length} presence event${presenceEvents.length === 1 ? '' : 's'} copied to clipboard`,
      });
    }).catch(() => {
      toast({
        title: "Copy Failed",
        description: "Failed to copy presence events to clipboard",
        variant: "destructive",
      });
    });
  };

  const handleClear = () => {
    setMessages([]);
    setPresenceEvents([]);
  };

  // LiveMessagesPanel specific handlers
  const handleShowRawMessageDataToggle = (value: boolean) => {
    setShowRawMessageData(value);
  };

  const handleShowMessagesToggle = () => {
    setShowMessages(prev => !prev);
  };

  const handleScrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  const handleScrollToBottomPresence = () => {
    if (presenceContainerRef.current) {
      presenceContainerRef.current.scrollTop = presenceContainerRef.current.scrollHeight;
    }
  };

  const handleMessagesScroll = (container: HTMLDivElement) => {
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    setShowScrollButton(!isNearBottom && container.scrollHeight > container.clientHeight);
  };

  const handlePresenceScroll = (container: HTMLDivElement) => {
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    setShowPresenceScrollButton(!isNearBottom && container.scrollHeight > container.clientHeight);
  };

  const handleMessagesHeightChange = (height: number) => {
    setMessagesHeight(height);
  };

  const addFilter = () => {
    const newFilter = createDefaultFilter(generateUniqueId());
    handleFilterStateChange([...filterState.conditions, newFilter]);
  };

  const removeFilter = (id: number) => {
    handleFilterStateChange(filterState.conditions.filter(f => f.id !== id));
  };

  const updateFilter = (id: number, field: keyof FilterConfig, value: any) => {
    handleFilterStateChange(
      filterState.conditions.map(f => 
        f.id === id ? { ...f, [field]: value } : f
      )
    );
  };

  return (
    <div className={`p-6 max-w-7xl mx-auto ${className || ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <MessageCircle className="text-white h-4 w-4" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">PubNub Pub/Sub Tool</h1>
            <p className="text-gray-600">Real-time messaging with advanced filtering and controls</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm">
            <HelpCircle className="h-4 w-4 mr-2" />
            Help
          </Button>
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Live Messages Panel */}
      <LiveMessagesPanel
        messages={messages}
        presenceEvents={presenceEvents}
        isSubscribed={isSubscribed}
        showRawMessageData={showRawMessageData}
        receivePresenceEvents={subscribeData.receivePresenceEvents}
        messagesHeight={messagesHeight}
        showMessages={showMessages}
        showScrollButton={showScrollButton}
        showPresenceScrollButton={showPresenceScrollButton}
        onShowRawMessageDataToggle={handleShowRawMessageDataToggle}
        onReceivePresenceEventsToggle={(value) => handleSubscribeDataChange('receivePresenceEvents', value)}
        onShowMessagesToggle={handleShowMessagesToggle}
        onCopyAllMessages={handleCopyAll}
        onCopyAllPresenceEvents={handleCopyAllPresenceEvents}
        onScrollToBottom={handleScrollToBottom}
        onScrollToBottomPresence={handleScrollToBottomPresence}
        onMessagesScroll={handleMessagesScroll}
        onPresenceScroll={handlePresenceScroll}
        onMessagesHeightChange={handleMessagesHeightChange}
      />

      {/* Quick Publish Panel - Phase 3 Implementation - Full Width */}
      <QuickPublishPanel
        publishData={publishData}
        publishStatus={publishStatus}
        onPublishDataChange={setPublishData}
        onFormatMessage={handleFormatMessage}
        onPublish={handlePublish}
      />

      <div className="grid gap-6">
        {/* Subscription Configuration Panel - Placeholder for Phase 4 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">SUBSCRIPTION CONFIGURATION</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="channels" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="channels">CHANNELS</TabsTrigger>
                <TabsTrigger value="groups">GROUPS</TabsTrigger>
                <TabsTrigger value="filters">
                  FILTERS {filterState.conditions.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {filterState.conditions.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="advanced">ADVANCED</TabsTrigger>
              </TabsList>
              
              <TabsContent value="channels" className="space-y-4">
                <div>
                  <Label>Channel Names (comma-separated)</Label>
                  <Input
                    value={subscribeData.channels}
                    onChange={(e) => handleSubscribeDataChange('channels', e.target.value)}
                    placeholder="hello_world, sensors-*, alerts"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Subscribe to individual channels. Use wildcards (*) for pattern matching.
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="groups" className="space-y-4">
                <div>
                  <Label>Channel Group Names (comma-separated)</Label>
                  <Input
                    value={subscribeData.channelGroups}
                    onChange={(e) => handleSubscribeDataChange('channelGroups', e.target.value)}
                    placeholder="group1, group2, sensors-group"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Subscribe to channel groups containing multiple channels.
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="filters" className="space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <Label>Message Filters (Server-side)</Label>
                    <Button onClick={addFilter} size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Filter
                    </Button>
                  </div>
                  {filterState.conditions.map((filter, index) => (
                    <div key={filter.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Filter {index + 1}</span>
                        {filterState.conditions.length > 1 && (
                          <Button
                            onClick={() => removeFilter(filter.id)}
                            size="sm"
                            variant="ghost"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <Input
                          placeholder="Target"
                          value={filter.target}
                          onChange={(e) => updateFilter(filter.id, 'target', e.target.value)}
                        />
                        <Input
                          placeholder="Field"
                          value={filter.field}
                          onChange={(e) => updateFilter(filter.id, 'field', e.target.value)}
                        />
                        <Input
                          placeholder="Operator"
                          value={filter.operator}
                          onChange={(e) => updateFilter(filter.id, 'operator', e.target.value)}
                        />
                        <Input
                          placeholder="Value"
                          value={filter.value}
                          onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="advanced" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Cursor Timetoken</Label>
                    <Input
                      value={subscribeData.cursor.timetoken}
                      onChange={(e) => handleSubscribeDataChange('cursor.timetoken', e.target.value)}
                      placeholder="15123456789012345"
                    />
                  </div>
                  <div>
                    <Label>Cursor Region</Label>
                    <Input
                      type="number"
                      value={subscribeData.cursor.region}
                      onChange={(e) => handleSubscribeDataChange('cursor.region', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4" />
                        <span className="text-sm font-medium">Enable Heartbeat</span>
                      </div>
                      <p className="text-xs text-gray-500">Send periodic heartbeat messages</p>
                    </div>
                    <Switch
                      checked={subscribeData.withPresence}
                      onCheckedChange={(value) => handleSubscribeDataChange('withPresence', value)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <RefreshCw className="h-4 w-4" />
                        <span className="text-sm font-medium">Restore on Reconnect</span>
                      </div>
                      <p className="text-xs text-gray-500">Auto-restore subscription after disconnect</p>
                    </div>
                    <Switch
                      checked={subscribeData.restoreOnReconnect}
                      onCheckedChange={(value) => handleSubscribeDataChange('restoreOnReconnect', value)}
                    />
                  </div>
                  <div>
                    <Label>Heartbeat Interval (seconds)</Label>
                    <Input
                      type="number"
                      value={subscribeData.heartbeat}
                      onChange={(e) => handleSubscribeDataChange('heartbeat', parseInt(e.target.value) || 300)}
                      placeholder="300"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Active Filters Display */}
      <div className="mt-6 flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
        <Filter className="h-4 w-4 text-blue-600" />
        <div>
          <span className="text-sm font-medium text-blue-800">Active Filters:</span>
          <span className="text-sm text-blue-600 ml-2">
            {generateFilterExpression(filterState.conditions, filterState.logic)}
          </span>
        </div>
      </div>
    </div>
  );
}