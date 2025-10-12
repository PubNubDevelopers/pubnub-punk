import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MessageCircle, Play, Square, Copy, Settings, HelpCircle, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { storage } from '@/lib/storage';
import { useConfig } from '@/contexts/config-context';
import { usePubNub } from '@/hooks/usePubNub';
import { usePubNubSubscription, usePubNubPublish } from './hooks';
import LiveMessagesPanel from './LiveMessagesPanel';
import StatusIndicator from './shared/StatusIndicator';
import { QuickPublishPanel } from './QuickPublishPanel';
import SubscriptionConfigPanel from './SubscriptionConfigPanel';
import { debounce } from 'lodash';

import {
  PubSubConfig,
  PublishFormData,
  SubscribeFormData,
  UIState,
  FilterState,
  FilterCondition,
  MessageData,
  PresenceEvent,
  PublishStatus
} from './types';
import { 
  FIELD_DEFINITIONS, 
  CURRENT_CONFIG_VERSION,
  DEFAULT_MESSAGE_HEIGHT,
  MAX_MESSAGES,
  PUBSUB_INSTANCE_ID
} from './constants';

// Storage keys for config persistence
const STORAGE_KEYS = {
  CONFIG: 'pubsub-config',
  UI_STATE: 'pubsub-ui-state'
} as const;
import {
  migrateConfig,
  pageSettingsToState,
  stateToPageSettings,
  createDefaultPageSettings,
  deepMerge,
  generateFilterExpression,
  validateChannel,
  validateJSON,
  validateCustomMessageType,
  formatTimestamp,
  parseChannels,
  copyToClipboard
} from './utils';
import { parsePublishError } from './shared/ErrorParser';
import { copyAllMessages, copyAllPresenceEvents } from './shared/CopyHandlers';
import { 
  scrollToBottom, 
  handleScroll, 
  useAutoScroll, 
  useDelayedAutoScroll 
} from './shared/ScrollHandlers';

export default function PubSubPageEnhanced() {
  const { toast } = useToast();
  const { setPageSettings: setConfigPageSettings, setConfigType, pageSettings: contextPageSettings } = useConfig();
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);
  
  // Initialize state with defaults
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

  const [showFilters, setShowFilters] = useState(false);
  const [showMessages, setShowMessages] = useState(true);
  const [messagesHeight, setMessagesHeight] = useState(DEFAULT_MESSAGE_HEIGHT);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [presenceAutoScroll, setPresenceAutoScroll] = useState(true);
  const [showPresenceScrollButton, setShowPresenceScrollButton] = useState(false);
  const [showRawMessageData, setShowRawMessageData] = useState(false);
  
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const presenceContainerRef = useRef<HTMLDivElement>(null);
  
  const [subscribeFilters, setSubscribeFilters] = useState<FilterCondition[]>([{
    id: 1,
    target: 'message',
    field: '',
    operator: '==',
    value: '',
    type: 'string'
  }]);
  const [filterLogic, setFilterLogic] = useState<'&&' | '||'>('&&');

  // PubNub instance for publishing
  const { 
    pubnub, 
    isReady: pubnubReady, 
    connectionError, 
    isConnected,
  } = usePubNub({
    instanceId: PUBSUB_INSTANCE_ID,
    userId: 'pubsub-page-user',
    onConnectionError: (error) => {
      toast({
        title: "PubNub Connection Failed",
        description: error,
        variant: "destructive",
      });
    }
  });

  // Use the new subscription hook
  const {
    isSubscribed,
    messages,
    presenceEvents,
    subscribe,
    unsubscribe,
    clearMessages,
    clearPresenceEvents,
    error: subscriptionError
  } = usePubNubSubscription({
    channels: subscribeData.channels,
    channelGroups: subscribeData.channelGroups,
    receivePresenceEvents: subscribeData.receivePresenceEvents,
    withPresence: subscribeData.withPresence,
    cursor: subscribeData.cursor,
    heartbeat: subscribeData.heartbeat,
    restoreOnReconnect: subscribeData.restoreOnReconnect,
    filters: subscribeFilters,
    filterLogic,
    onError: (error) => {
      toast({
        title: "Subscription Error",
        description: error.message,
        variant: "destructive",
      });
    },
    onStatusChange: (status) => {
      if (status.category === 'PNReconnectedCategory') {
        toast({
          title: "Reconnected",
          description: "Successfully reconnected to PubNub",
        });
      } else if (status.category === 'PNNetworkDownCategory') {
        toast({
          title: "Network Down",
          description: "Lost connection to PubNub",
          variant: "destructive",
        });
      }
    }
  });

  // Use the new publish hook with retry logic
  const {
    publish,
    publishStatus,
    isPublishing,
    error: publishError
  } = usePubNubPublish({
    pubnub,
    maxRetries: 3,
    retryDelay: 1000,
    onSuccess: (timetoken) => {
      console.log('Message published with timetoken:', timetoken);
    },
    onError: (error) => {
      const { title, description } = parsePublishError(error);
      toast({
        title,
        description,
        variant: "destructive",
      });
    }
  });

  const [pageSettings, setPageSettings] = useState(() => createDefaultPageSettings());

  const restoreFromConfig = useCallback((config: any) => {
    try {
      const migratedConfig = migrateConfig(config);
      const defaultSettings = createDefaultPageSettings();
      const safeConfig = deepMerge(defaultSettings, migratedConfig);
      
      if (safeConfig.publish) {
        setPublishData(safeConfig.publish);
      }
      if (safeConfig.subscribe) {
        setSubscribeData(safeConfig.subscribe);
      }
      if (safeConfig.ui) {
        setShowFilters(safeConfig.ui.showFilters || false);
        setShowMessages(safeConfig.ui.showMessages !== false);
        if (safeConfig.ui.messagesHeight) {
          setMessagesHeight(safeConfig.ui.messagesHeight);
        }
        if (safeConfig.ui.showRawMessageData !== undefined) {
          setShowRawMessageData(safeConfig.ui.showRawMessageData);
        }
        setAutoScroll(safeConfig.ui.autoScroll !== false);
        setPresenceAutoScroll(safeConfig.ui.presenceAutoScroll !== false);
      }
      if (safeConfig.filters) {
        setSubscribeFilters(safeConfig.filters.conditions || [{
          id: 1,
          target: 'message',
          field: '',
          operator: '==',
          value: '',
          type: 'string'
        }]);
        setFilterLogic(safeConfig.filters.logic || '&&');
      }
      
      setPageSettings(safeConfig);
      return true;
    } catch (error) {
      console.error('Failed to restore config:', error);
      const defaultSettings = createDefaultPageSettings();
      setPageSettings(defaultSettings);
      return false;
    }
  }, []);

  // Load config from storage on mount
  useEffect(() => {
    if (!isConfigLoaded) {
      try {
        // First check if there's config from context (from another page)
        if (contextPageSettings && contextPageSettings.publish) {
          restoreFromConfig(contextPageSettings);
          setIsConfigLoaded(true);
          return;
        }

        // Otherwise load from localStorage
        const savedConfig = storage.getItem<PubSubConfig>(STORAGE_KEYS.CONFIG);
        if (savedConfig) {
          const success = restoreFromConfig(savedConfig);
          if (success) {
            toast({
              title: "Config Loaded",
              description: "Your previous settings have been restored",
            });
          }
        }
      } catch (error) {
        console.error('Error loading config:', error);
        toast({
          title: "Config Load Failed",
          description: "Using default settings",
          variant: "destructive",
        });
      }
      setIsConfigLoaded(true);
      setConfigType('pubsub');
    }
  }, [isConfigLoaded, contextPageSettings, restoreFromConfig, toast, setConfigType]);

  // Debounced save function
  const saveConfig = useMemo(
    () => debounce((config: PubSubConfig) => {
      try {
        storage.setItem(STORAGE_KEYS.CONFIG, config);
        console.log('Config auto-saved');
      } catch (error) {
        console.error('Failed to save config:', error);
      }
    }, 500),
    []
  );

  const currentPageSettings = useMemo(() => ({
    publish: publishData,
    subscribe: subscribeData,
    ui: {
      showFilters,
      showMessages,
      messagesHeight,
      autoScroll,
      presenceAutoScroll,
      showRawMessageData
    },
    filters: {
      conditions: subscribeFilters,
      logic: filterLogic
    },
    _version: CURRENT_CONFIG_VERSION
  }), [
    publishData, 
    subscribeData, 
    showFilters, 
    showMessages, 
    messagesHeight, 
    autoScroll, 
    presenceAutoScroll, 
    showRawMessageData,
    subscribeFilters, 
    filterLogic
  ]);

  // Sync with global config context and auto-save
  useEffect(() => {
    if (isConfigLoaded) {
      setConfigPageSettings(currentPageSettings);
      saveConfig(currentPageSettings);
    }
  }, [currentPageSettings, setConfigPageSettings, saveConfig, isConfigLoaded]);

  // Scroll handlers
  const handleMessagesScroll = () => {
    handleScroll(messagesContainerRef, { setAutoScroll, setShowScrollButton });
  };

  const handlePresenceScroll = () => {
    handleScroll(presenceContainerRef, { 
      setAutoScroll: setPresenceAutoScroll, 
      setShowScrollButton: setShowPresenceScrollButton 
    });
  };

  const scrollMessagesToBottom = () => {
    scrollToBottom(messagesContainerRef, { setAutoScroll, setShowScrollButton });
  };

  const scrollPresenceToBottom = () => {
    scrollToBottom(presenceContainerRef, { 
      setAutoScroll: setPresenceAutoScroll, 
      setShowScrollButton: setShowPresenceScrollButton 
    });
  };

  // Auto-scroll hooks
  useAutoScroll(messagesContainerRef, autoScroll, [messages]);
  useDelayedAutoScroll(messagesContainerRef, autoScroll, true, [subscribeData.receivePresenceEvents]);
  useAutoScroll(presenceContainerRef, presenceAutoScroll, [presenceEvents]);
  useDelayedAutoScroll(presenceContainerRef, presenceAutoScroll, subscribeData.receivePresenceEvents, [subscribeData.receivePresenceEvents]);

  const handleCopyAllMessages = async () => {
    await copyAllMessages(messages, toast);
  };

  const handleCopyAllPresenceEvents = async () => {
    await copyAllPresenceEvents(presenceEvents, toast);
  };

  const handlePublish = useCallback(async () => {
    await publish(publishData);
  }, [publish, publishData]);

  const handlePublishInputChange = (field: string, value: any) => {
    setPublishData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubscribeInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setSubscribeData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev] as any,
          [child]: value
        }
      }));
    } else {
      setSubscribeData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSubscribe = useCallback(async () => {
    const didSubscribe = await subscribe();
    if (didSubscribe) {
      toast({
        title: "Subscribed",
        description: `Connected to channels and groups`,
      });
    }
  }, [subscribe, toast]);

  const handleUnsubscribe = useCallback(() => {
    unsubscribe();
    toast({
      title: "Unsubscribed",
      description: "Disconnected from all channels",
    });
  }, [unsubscribe, toast]);

  // Auto-unsubscribe when subscription configuration changes
  const prevSubscribeConfig = useRef({
    channels: subscribeData.channels,
    channelGroups: subscribeData.channelGroups,
    filters: subscribeFilters,
    filterLogic: filterLogic,
    withPresence: subscribeData.withPresence
  });

  useEffect(() => {
    const currentConfig = {
      channels: subscribeData.channels,
      channelGroups: subscribeData.channelGroups,
      filters: subscribeFilters,
      filterLogic: filterLogic,
      withPresence: subscribeData.withPresence
    };

    // Only check for changes after initial load and if currently subscribed
    if (isConfigLoaded && isSubscribed) {
      const hasChannelChanges = 
        prevSubscribeConfig.current.channels !== currentConfig.channels ||
        prevSubscribeConfig.current.channelGroups !== currentConfig.channelGroups;
      
      const hasFilterChanges = 
        prevSubscribeConfig.current.filterLogic !== currentConfig.filterLogic ||
        JSON.stringify(prevSubscribeConfig.current.filters) !== JSON.stringify(currentConfig.filters);
      const hasPresenceModeChange =
        prevSubscribeConfig.current.withPresence !== currentConfig.withPresence;

      if (hasChannelChanges || hasFilterChanges || hasPresenceModeChange) {
        unsubscribe();
        toast({
          title: "Configuration Changed",
          description: "Subscription stopped. Please reconnect to apply changes.",
          variant: "default",
        });
      }
    }

    // Update previous config reference
    prevSubscribeConfig.current = currentConfig;
  }, [subscribeData.channels, subscribeData.channelGroups, subscribeFilters, filterLogic, subscribeData.withPresence, isConfigLoaded, isSubscribed, unsubscribe, toast]);

  const handleClear = useCallback(() => {
    clearMessages();
    clearPresenceEvents();
  }, [clearMessages, clearPresenceEvents]);

  // Reset config to defaults
  const handleResetConfig = useCallback(() => {
    const defaultSettings = createDefaultPageSettings();
    restoreFromConfig(defaultSettings);
    storage.removeItem(STORAGE_KEYS.CONFIG);
    toast({
      title: "Config Reset",
      description: "Settings have been reset to defaults",
    });
  }, [restoreFromConfig, toast]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
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
          <Button variant="ghost" size="sm" onClick={handleResetConfig}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
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

      {/* Subscription Status */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <StatusIndicator
                isConnected={isSubscribed}
                channels={subscribeData.channels ? subscribeData.channels.split(',').map(c => c.trim()).filter(c => c) : []}
                channelGroups={subscribeData.channelGroups ? subscribeData.channelGroups.split(',').map(c => c.trim()).filter(c => c) : []}
                hasFilters={subscribeFilters.length > 0}
                filterExpression={generateFilterExpression(subscribeFilters, filterLogic)}
              />
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="text-right text-sm">
                  <div className="font-medium">{isSubscribed ? 'ON' : 'OFF'}</div>
                  {isSubscribed ? (
                    <div className="text-gray-500 text-xs">
                      <span className="font-mono bg-blue-50 px-1 py-0.5 rounded mr-1">
                        {subscribeData.channels.length > 45 ? 
                          `${subscribeData.channels.substring(0, 42)}...` : 
                          subscribeData.channels || 'No channels'
                        }
                      </span>
                      <button 
                        onClick={() => {
                          const element = document.querySelector('[data-testid="subscription-config"]');
                          element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                        className="text-blue-600 hover:text-blue-800 underline text-xs"
                      >
                        change
                      </button>
                    </div>
                  ) : (
                    <div className="text-gray-500">Subscribe</div>
                  )}
                </div>
                <Switch 
                  checked={isSubscribed}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      handleSubscribe();
                    } else {
                      handleUnsubscribe();
                    }
                  }}
                  className="scale-125"
                  disabled={isPublishing}
                />
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Live Messages Panel */}
      <LiveMessagesPanel
        messages={messages}
        presenceEvents={presenceEvents}
        receivePresenceEvents={subscribeData.receivePresenceEvents}
        showRawMessageData={showRawMessageData}
        onCopyAll={handleCopyAllMessages}
        onClear={handleClear}
        onReceivePresenceEventsChange={(checked) => handleSubscribeInputChange('receivePresenceEvents', checked)}
        onShowRawMessageDataChange={setShowRawMessageData}
      />

      {/* Quick Publish Bar */}
      <QuickPublishPanel
        publishData={publishData}
        publishStatus={publishStatus}
        onPublishDataChange={handlePublishInputChange}
        onPublish={handlePublish}
      />

      {/* Subscription Configuration */}
      <div data-testid="subscription-config">
        <SubscriptionConfigPanel
          subscribeData={subscribeData}
          filters={subscribeFilters}
          filterLogic={filterLogic}
          onSubscribeDataChange={handleSubscribeInputChange}
          onFiltersChange={setSubscribeFilters}
          onFilterLogicChange={setFilterLogic}
        />
      </div>
    </div>
  );
}
