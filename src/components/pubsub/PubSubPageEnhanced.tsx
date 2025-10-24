import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import { MessageCircle, RotateCcw, Filter as FilterIcon, ActivitySquare, Users, PanelRightOpen, History, ListTree, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { storage } from '@/lib/storage';
import { useConfig } from '@/contexts/config-context';
import { usePubNub } from '@/hooks/usePubNub';
import { usePubNubSubscription, usePubNubPublish } from './hooks';
import LiveMessagesPanel from './LiveMessagesPanel';
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
  PublishStatus,
  PublishHistoryEntry,
  PublishAttemptResult,
} from './types';
import { 
  FIELD_DEFINITIONS, 
  CURRENT_CONFIG_VERSION,
  MAX_MESSAGES,
  PUBSUB_INSTANCE_ID
} from './constants';

// Storage keys for config persistence
const STORAGE_KEYS = {
  CONFIG: 'pubsub-config',
  UI_STATE: 'pubsub-ui-state',
  PUBLISH_HISTORY: 'pubsub-publish-history',
} as const;

const PUBLISH_HISTORY_LIMIT = 30;
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
import { copyAllMessages } from './shared/CopyHandlers';
import {
  scrollToBottom,
  handleScroll,
  useAutoScroll,
  useDelayedAutoScroll,
} from './shared/ScrollHandlers';

export default function PubSubPageEnhanced() {
  const DEFAULT_CHANNEL = 'hello_world';
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
  const [autoScroll, setAutoScroll] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [presenceAutoScroll, setPresenceAutoScroll] = useState(true);
  const [showPresenceScrollButton, setShowPresenceScrollButton] = useState(false);
  const [showRawMessageData, setShowRawMessageData] = useState(false);
  const [hasAutoConnected, setHasAutoConnected] = useState(false);
  const [hasSentWelcomeMessage, setHasSentWelcomeMessage] = useState(false);
  const [isConfigDrawerOpen, setIsConfigDrawerOpen] = useState(false);
  const [configDrawerInitialTab, setConfigDrawerInitialTab] = useState<'channels' | 'groups' | 'filters' | 'advanced'>('channels');
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [lastSubscriptionStatus, setLastSubscriptionStatus] = useState<any>(null);
  const [isPublishLogOpen, setIsPublishLogOpen] = useState(false);
  const [publishHistory, setPublishHistory] = useState<PublishHistoryEntry[]>([]);
  const [resendingEntryId, setResendingEntryId] = useState<string | null>(null);
  const handlePublishAttemptComplete = useCallback((result: PublishAttemptResult) => {
    setPublishHistory((prev) => {
      const message = result.publishData.message ?? '';
      const meta = result.publishData.meta ?? '';
      const entry: PublishHistoryEntry = {
        id: `${result.startedAt}-${result.timetoken ?? Math.random()}`,
        timestamp: result.startedAt,
        channel: result.publishData.channel?.trim() || '—',
        messagePreview:
          message.length > 160 ? `${message.slice(0, 157)}…` : message || '—',
        metaPreview: meta ? (meta.length > 160 ? `${meta.slice(0, 157)}…` : meta) : undefined,
        rawMessage: message,
        rawMeta: meta || undefined,
        success: result.success,
        timetoken: result.timetoken,
        error: result.error,
        attempts: result.attempts,
        durationMs: result.durationMs,
        formData: result.publishData,
      };
      const next = [entry, ...prev].slice(0, PUBLISH_HISTORY_LIMIT);
      storage.setItem(STORAGE_KEYS.PUBLISH_HISTORY, next);
      return next;
    });
  }, [setPublishHistory]);

  const handleClearPublishHistory = useCallback(() => {
    setPublishHistory([]);
    storage.removeItem(STORAGE_KEYS.PUBLISH_HISTORY);
  }, [setPublishHistory]);
  
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const presenceContainerRef = useRef<HTMLDivElement>(null);
  
  const [subscribeFilters, setSubscribeFilters] = useState<FilterCondition[]>([]);
  const [filterLogic, setFilterLogic] = useState<'&&' | '||'>('&&');
  const activeFilters = useMemo(() => (
    subscribeFilters || []
  ).filter((filter) => {
    if (!filter.field || !filter.field.trim()) {
      return false;
    }

    if (filter.type === 'boolean') {
      return true;
    }

    return !!(filter.value && filter.value.trim());
  }), [subscribeFilters]);

  const validFilterCount = activeFilters.length;
  const filterExpression = useMemo(
    () => generateFilterExpression(subscribeFilters, filterLogic),
    [subscribeFilters, filterLogic]
  );
  const connectionSettings = useMemo(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    return storage.getSettings();
  }, []);

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
      setLastSubscriptionStatus(status);
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
    },
    onAttemptComplete: handlePublishAttemptComplete,
  });

  const handleResendPublishHistoryEntry = useCallback(async (entry: PublishHistoryEntry) => {
    const resolvedData: PublishFormData = entry.formData
      ? {
          ...entry.formData,
          channel: entry.formData.channel?.trim() || '',
          message: entry.formData.message ?? '',
          meta: entry.formData.meta ?? '',
        }
      : {
          ...publishData,
          channel: entry.channel === '—' ? publishData.channel : entry.channel,
          message: entry.rawMessage ?? '',
          meta: entry.rawMeta ?? '',
        };

    setPublishData(resolvedData);
    setResendingEntryId(entry.id);
    try {
      const wasSuccessful = await publish(resolvedData);
      if (wasSuccessful) {
        toast({
          title: "Publish resent",
          description: resolvedData.channel
            ? `Message re-sent to ${resolvedData.channel}.`
            : "Message re-sent using previous channel settings.",
        });
      }
    } finally {
      setResendingEntryId(null);
    }
  }, [publish, publishData, toast]);

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
        if (safeConfig.ui.showRawMessageData !== undefined) {
          setShowRawMessageData(safeConfig.ui.showRawMessageData);
        }
        setAutoScroll(safeConfig.ui.autoScroll !== false);
        setPresenceAutoScroll(safeConfig.ui.presenceAutoScroll !== false);
      }
      if (safeConfig.filters) {
        setSubscribeFilters(safeConfig.filters.conditions || []);
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

  useEffect(() => {
    const storedHistory = storage.getItem<PublishHistoryEntry[]>(STORAGE_KEYS.PUBLISH_HISTORY);
    if (storedHistory && Array.isArray(storedHistory)) {
      setPublishHistory(storedHistory);
    }
  }, []);

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

  useEffect(() => {
    if (!isConfigLoaded || hasAutoConnected || isSubscribed) {
      return;
    }

    const trimmedChannels = subscribeData.channels?.trim() || '';
    const trimmedGroups = subscribeData.channelGroups?.trim() || '';
    const shouldAutoConnect =
      trimmedChannels === DEFAULT_CHANNEL && trimmedGroups.length === 0;

    if (!shouldAutoConnect) {
      setHasAutoConnected(true);
      return;
    }

    (async () => {
      setHasAutoConnected(true);
      const success = await subscribe();
      if (success) {
        toast({
          title: `Connected to ${DEFAULT_CHANNEL}`,
          description: 'You can change channels in Advanced settings.',
        });

        if (!hasSentWelcomeMessage) {
          try {
            await publish({
              ...publishData,
              channel: DEFAULT_CHANNEL,
              message: JSON.stringify({
                text: 'Welcome! Live messages are streaming.',
                hint: 'Use Quick Publish to send your own messages.',
              }),
            });
          } catch (error) {
            console.warn('Auto welcome message failed:', error);
          } finally {
            setHasSentWelcomeMessage(true);
          }
        }
      }
    })();
  }, [
    DEFAULT_CHANNEL,
    isConfigLoaded,
    isSubscribed,
    subscribe,
    subscribeData.channels,
    subscribeData.channelGroups,
    publish,
    publishData,
    hasSentWelcomeMessage,
    toast,
    hasAutoConnected,
  ]);

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
      setNeedsReconnect(false);
      setIsConfigDrawerOpen(false);
    }
    return didSubscribe;
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
        setNeedsReconnect(true);
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
    setNeedsReconnect(false);
    toast({
      title: "Config Reset",
      description: "Settings have been reset to defaults",
    });
  }, [restoreFromConfig, toast]);

  const handleOpenConfigDrawer = useCallback((tab: 'channels' | 'groups' | 'filters' | 'advanced' = 'channels') => {
    setConfigDrawerInitialTab(tab);
    setIsConfigDrawerOpen(true);
  }, []);

  const parsedChannels = useMemo(
    () => parseChannels(subscribeData.channels || ''),
    [subscribeData.channels]
  );
  const primaryChannel = parsedChannels[0] || DEFAULT_CHANNEL;

  const channelGroups = useMemo(
    () =>
      (subscribeData.channelGroups || '')
        .split(',')
        .map((group) => group.trim())
        .filter(Boolean),
    [subscribeData.channelGroups]
  );

  const handleReconnectNow = useCallback(async () => {
    const didSubscribe = await subscribe();
    if (didSubscribe) {
      toast({
        title: "Reconnected",
        description: "Subscription settings applied successfully.",
      });
      setNeedsReconnect(false);
      setIsConfigDrawerOpen(false);
    }
  }, [subscribe, toast]);

  const handleCopyRawMessages = useCallback(async () => {
    await copyAllMessages(messages, toast);
  }, [messages, toast]);

  const handleCopyFormattedMessages = useCallback(async () => {
    if (messages.length === 0) {
      toast({
        title: "No Messages",
        description: "No messages to format",
        variant: "destructive",
      });
      return;
    }

    try {
      const formatted = messages.map((msg) => {
        const timestamp = msg.timetoken ? formatTimestamp(msg.timetoken) : 'Unknown time';
        return [
          `Channel: ${msg.channel}`,
          `Timetoken: ${timestamp}`,
          `Publisher: ${msg.publisher || 'Unknown'}`,
          `Message: ${typeof msg.message === 'string' ? msg.message : JSON.stringify(msg.message, null, 2)}`,
          msg.userMetadata ? `Metadata: ${JSON.stringify(msg.userMetadata, null, 2)}` : undefined,
        ]
          .filter(Boolean)
          .join('\n');
      }).join('\n\n');

      await copyToClipboard(formatted);
      toast({
        title: "Formatted Messages Copied",
        description: `Copied ${messages.length} formatted message${messages.length === 1 ? '' : 's'} to clipboard`,
      });
    } catch (error) {
      console.error('Failed to copy formatted messages:', error);
      toast({
        title: "Copy Failed",
        description: "Unable to copy formatted messages",
        variant: "destructive",
      });
    }
  }, [messages, toast]);

  const handleOpenDiagnostics = useCallback(() => {
    setIsDiagnosticsOpen(true);
  }, []);

  const handleOpenPublishLog = useCallback(() => {
    setIsPublishLogOpen(true);
  }, []);

  const maskValue = useCallback((value?: string) => {
    if (!value) return 'Not set';
    if (value.length <= 8) return value;
    return `${value.slice(0, 4)}…${value.slice(-4)}`;
  }, []);

  const boolLabel = useCallback((value: boolean, truthy = 'Yes', falsy = 'No') => {
    return value ? truthy : falsy;
  }, []);

  const connectionDetails = useMemo<DiagnosticItem[]>(() => {
    const settings = connectionSettings;
    return [
      { label: 'Publish Key', value: maskValue(settings?.credentials.publishKey) },
      { label: 'Subscribe Key', value: maskValue(settings?.credentials.subscribeKey) },
      { label: 'User ID', value: settings?.credentials.userId || 'Not set' },
      { label: 'Origin', value: settings?.environment.origin ?? 'ps.pndsn.com' },
      { label: 'SSL', value: boolLabel(settings?.environment.ssl ?? true, 'Enabled', 'Disabled') },
      { label: 'PubNub Ready', value: boolLabel(pubnubReady, 'Ready', 'Connecting'), tone: pubnubReady ? 'success' : 'warning' },
      { label: 'Primary Connection', value: boolLabel(isConnected, 'Connected', 'Disconnected'), tone: isConnected ? 'success' : 'warning' },
      { label: 'Heartbeat Interval', value: `${settings?.environment.heartbeatInterval ?? subscribeData.heartbeat}s` },
      { label: 'UUID', value: pubnub?.getUUID?.() || 'Unavailable' },
      { label: 'Connection Error', value: connectionError || 'None', tone: connectionError ? 'error' : 'success' },
    ];
  }, [connectionSettings, maskValue, boolLabel, pubnubReady, isConnected, connectionError, pubnub, subscribeData.heartbeat]);

  const subscriptionDetails = useMemo<DiagnosticItem[]>(() => {
    const channelCount = parsedChannels.length;
    const groupCount = channelGroups.length;
    const channelPreview =
      channelCount === 0
        ? 'None'
        : channelCount <= 3
        ? parsedChannels.join(', ')
        : `${parsedChannels.slice(0, 3).join(', ')} +${channelCount - 3}`;
    const groupPreview =
      groupCount === 0
        ? 'None'
        : groupCount <= 3
        ? channelGroups.join(', ')
        : `${channelGroups.slice(0, 3).join(', ')} +${groupCount - 3}`;

    return [
      { label: 'Subscribed', value: boolLabel(isSubscribed, 'Yes', 'No'), tone: isSubscribed ? 'success' : 'warning' },
      { label: 'Channels', value: `${channelCount} (${channelPreview})` },
      { label: 'Channel Groups', value: `${groupCount} (${groupPreview})` },
      { label: 'Active Filters', value: `${activeFilters.length}`, tone: activeFilters.length ? 'warning' : 'default' },
      { label: 'Filter Expression', value: filterExpression || 'None' },
      { label: 'Presence Events', value: boolLabel(subscribeData.receivePresenceEvents) },
      { label: 'With Presence', value: boolLabel(subscribeData.withPresence) },
      { label: 'Heartbeat', value: `${subscribeData.heartbeat}s` },
      { label: 'Restore on Reconnect', value: boolLabel(subscribeData.restoreOnReconnect) },
      { label: 'Last Status', value: lastSubscriptionStatus?.category || 'No status events yet' },
      { label: 'Subscription Error', value: subscriptionError || 'None', tone: subscriptionError ? 'error' : 'success' },
    ];
  }, [
    parsedChannels,
    channelGroups,
    boolLabel,
    isSubscribed,
    activeFilters.length,
    filterExpression,
    subscribeData.receivePresenceEvents,
    subscribeData.withPresence,
    subscribeData.heartbeat,
    subscribeData.restoreOnReconnect,
    lastSubscriptionStatus,
    subscriptionError,
  ]);

  const publishDetails = useMemo<DiagnosticItem[]>(() => {
    const statusLabel = publishStatus.isVisible
      ? publishStatus.isSuccess
        ? 'Success'
        : 'Failure'
      : 'Awaiting first publish';
    return [
      { label: 'Last Timetoken', value: publishStatus.timetoken ? String(publishStatus.timetoken) : 'None' },
      { label: 'Last Result', value: statusLabel, tone: publishStatus.isVisible ? (publishStatus.isSuccess ? 'success' : 'error') : 'default' },
      { label: 'Is Publishing', value: boolLabel(isPublishing) },
      { label: 'Last Error', value: publishError || 'None', tone: publishError ? 'error' : 'success' },
    ];
  }, [publishStatus, boolLabel, isPublishing, publishError]);

  const clientMetrics = useMemo<DiagnosticItem[]>(() => {
    return [
      { label: 'Messages Cached', value: `${messages.length} / ${MAX_MESSAGES}` },
      { label: 'Presence Events Cached', value: `${presenceEvents.length} / ${MAX_MESSAGES}` },
      { label: 'Message Auto-scroll', value: boolLabel(autoScroll, 'On', 'Off') },
      { label: 'Presence Auto-scroll', value: boolLabel(presenceAutoScroll, 'On', 'Off') },
      { label: 'Needs Reconnect', value: boolLabel(needsReconnect), tone: needsReconnect ? 'warning' : 'success' },
      { label: 'Has Auto Connected', value: boolLabel(hasAutoConnected) },
      { label: 'Welcome Message Sent', value: boolLabel(hasSentWelcomeMessage) },
      { label: 'Raw Message View', value: boolLabel(showRawMessageData) },
    ];
  }, [
    messages.length,
    presenceEvents.length,
    boolLabel,
    autoScroll,
    presenceAutoScroll,
    needsReconnect,
    hasAutoConnected,
    hasSentWelcomeMessage,
    showRawMessageData,
  ]);


  return (
    <TooltipProvider delayDuration={150}>
      <div className="p-6 max-w-7xl mx-auto">
      <div className="space-y-6">
        <div className="space-y-6 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start lg:gap-4 lg:space-y-0">
          <div className="space-y-4">
            <SubscriptionSummaryCard
              channels={parsedChannels}
              channelGroups={channelGroups}
              filters={activeFilters}
              filterLogic={filterLogic}
              withPresence={subscribeData.withPresence}
              receivePresenceEvents={subscribeData.receivePresenceEvents}
              needsReconnect={needsReconnect}
              isSubscribed={isSubscribed}
              isPublishing={isPublishing}
              onConnect={handleSubscribe}
              onDisconnect={handleUnsubscribe}
              onConfigure={(tab) => handleOpenConfigDrawer(tab)}
              onReset={handleResetConfig}
            />

            {needsReconnect && (
              <Alert className="border border-yellow-300 bg-yellow-50">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <AlertTitle>Reconnect required</AlertTitle>
                    <AlertDescription>
                      Subscription settings changed. Reconnect to apply the updates.
                    </AlertDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleReconnectNow}>
                      Reconnect
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setNeedsReconnect(false)}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </Alert>
            )}

            <LiveMessagesPanel
              className="min-h-[30rem] lg:h-[calc(100vh-20rem)]"
              messages={messages}
              presenceEvents={presenceEvents}
              receivePresenceEvents={subscribeData.receivePresenceEvents}
              showRawMessageData={showRawMessageData}
              onCopyRaw={handleCopyRawMessages}
              onCopyFormatted={handleCopyFormattedMessages}
              onClear={handleClear}
              onReceivePresenceEventsChange={(checked) =>
                handleSubscribeInputChange('receivePresenceEvents', checked)
              }
              onShowRawMessageDataChange={setShowRawMessageData}
              onEmptyConnectCta={() => handleOpenConfigDrawer()}
            />
          </div>

          <div className="space-y-4">
            <QuickPublishPanel
              publishData={publishData}
              publishStatus={publishStatus}
              isSubscribed={isSubscribed}
              onPublishDataChange={handlePublishInputChange}
              onPublish={handlePublish}
            />
          </div>
        </div>
      </div>

        <FloatingToolbar
          onOpenConfig={() => handleOpenConfigDrawer('channels')}
          onOpenFilters={() => handleOpenConfigDrawer('filters')}
          onTogglePresence={() =>
            handleSubscribeInputChange(
              'receivePresenceEvents',
              !subscribeData.receivePresenceEvents
            )
          }
          presenceEnabled={subscribeData.receivePresenceEvents}
          onOpenDiagnostics={handleOpenDiagnostics}
          onOpenPublishLog={handleOpenPublishLog}
        />

        <Sheet open={isConfigDrawerOpen} onOpenChange={setIsConfigDrawerOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl overflow-y-auto pb-8"
        >
          <SheetHeader>
            <SheetTitle>Subscription Configuration</SheetTitle>
            <SheetDescription>
              Adjust channels, filters, presence, and reconnection behavior.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            <SubscriptionConfigPanel
              subscribeData={subscribeData}
              filters={subscribeFilters}
              filterLogic={filterLogic}
              onSubscribeDataChange={handleSubscribeInputChange}
              onFiltersChange={setSubscribeFilters}
              onFilterLogicChange={setFilterLogic}
              isSubscribed={isSubscribed}
              onSubscribe={handleSubscribe}
              onUnsubscribe={handleUnsubscribe}
              initialTab={configDrawerInitialTab}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsConfigDrawerOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </SheetContent>
        </Sheet>
        <DiagnosticsDrawerSheet
          open={isDiagnosticsOpen}
          onOpenChange={setIsDiagnosticsOpen}
          connectionDetails={connectionDetails}
          subscriptionDetails={subscriptionDetails}
          publishDetails={publishDetails}
          clientMetrics={clientMetrics}
        />
        <PublishLogOverlay
          open={isPublishLogOpen}
          onOpenChange={setIsPublishLogOpen}
          entries={publishHistory}
          onClear={handleClearPublishHistory}
          onResend={handleResendPublishHistoryEntry}
          resendInFlightId={resendingEntryId}
        />
      </div>
    </TooltipProvider>
  );
}

interface SubscriptionSummaryCardProps {
  channels: string[];
  channelGroups: string[];
  filters: FilterCondition[];
  filterLogic: '&&' | '||';
  withPresence: boolean;
  receivePresenceEvents: boolean;
  needsReconnect: boolean;
  isSubscribed: boolean;
  isPublishing: boolean;
  onConnect?: () => void | Promise<void> | Promise<boolean>;
  onDisconnect?: () => void | Promise<void>;
  onConfigure: (tab?: 'channels' | 'groups' | 'filters' | 'advanced') => void;
  onReset: () => void;
}

function SubscriptionSummaryCard({
  channels,
  channelGroups,
  filters,
  filterLogic,
  withPresence,
  receivePresenceEvents,
  needsReconnect,
  isSubscribed,
  isPublishing,
  onConnect,
  onDisconnect,
  onConfigure,
  onReset,
}: SubscriptionSummaryCardProps) {
  const buildDisplayItems = (items: string[], maxCount: number, moreLabel: (count: number) => string) => {
    if (items.length <= maxCount) {
      return items;
    }
    const remaining = items.length - maxCount;
    return [...items.slice(0, maxCount), moreLabel(remaining)];
  };

  const channelItems = buildDisplayItems(channels, 4, (count) => `+${count} more`);
  const groupItems = buildDisplayItems(channelGroups, 4, (count) => `+${count} more`);

  const filterExpression =
    filters.length > 0 ? generateFilterExpression(filters, filterLogic) : 'No filters active';
  const hasFilters = filters.length > 0;

  const connectionLabel = isSubscribed ? 'Connected' : 'Disconnected';
  const channelChips = channelItems.length
    ? channelItems.map((item, index) => (
        <Badge
          key={`channel-${index}-${item}`}
          variant="outline"
          className="rounded-full border-green-200 bg-green-100 text-green-700 font-medium"
        >
          {item}
        </Badge>
      ))
    : [
        <Badge
          key="channel-empty"
          variant="outline"
          className="rounded-full border-gray-200 bg-white text-gray-500"
        >
          No channels
        </Badge>,
      ];

  const groupChips = groupItems.length
    ? groupItems.map((item, index) => (
        <Badge
          key={`group-${index}-${item}`}
          variant="outline"
          className="rounded-full border-blue-200 bg-blue-100 text-blue-700 font-medium"
        >
          {item}
        </Badge>
      ))
    : [
        <Badge
          key="group-empty"
          variant="outline"
          className="rounded-full border-gray-200 bg-white text-gray-500"
        >
          No groups
        </Badge>,
      ];

  const handleConnectionClick = () => {
    if (isSubscribed) {
      onDisconnect?.();
    } else {
      void onConnect?.();
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <CardTitle className="text-lg flex items-start gap-3">
              <span className="flex items-center gap-2">
                <ListTree className="h-5 w-5 text-purple-600" />
                Channel Subscriptions
              </span>
              <Badge
                variant="outline"
                className={`self-start font-normal border ${isSubscribed ? 'border-green-200 bg-green-100 text-green-700' : 'border-red-200 bg-red-100 text-red-700'}`}
              >
                {connectionLabel}
              </Badge>
            </CardTitle>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Channels</span>
                <div className="flex flex-wrap gap-2">{channelChips}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Groups</span>
                <div className="flex flex-wrap gap-2">{groupChips}</div>
              </div>
              {hasFilters && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge className="flex items-center gap-1 rounded-full border-purple-200 bg-purple-100 text-purple-700 font-medium">
                      <ToggleRight className="h-3.5 w-3.5" />
                      Filter
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    {filterExpression}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleConnectionClick}>
                {isSubscribed ? 'Disconnect' : 'Connect'}
              </Button>
              <Button size="sm" onClick={() => onConfigure()}>
                Configure
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 text-gray-500 hover:text-gray-700"
              onClick={onReset}
            >
              <span>Reset</span>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-0" />
    </Card>
  );
}

interface FloatingToolbarProps {
  onOpenConfig: () => void;
  onOpenFilters: () => void;
  onTogglePresence: () => void;
  presenceEnabled: boolean;
  onOpenDiagnostics: () => void;
  onOpenPublishLog: () => void;
}

function FloatingToolbar({
  onOpenConfig,
  onOpenFilters,
  onTogglePresence,
  presenceEnabled,
  onOpenDiagnostics,
  onOpenPublishLog,
}: FloatingToolbarProps) {
  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="secondary"
            className="shadow-md"
            onClick={onOpenDiagnostics}
            aria-label="Open diagnostics"
          >
            <ActivitySquare className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">Diagnostics</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="secondary"
            className="shadow-md"
            onClick={onOpenPublishLog}
            aria-label="Open publish log"
          >
            <History className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">Publish log</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="secondary"
            className="shadow-md"
            onClick={onOpenConfig}
            aria-label="Open configuration"
          >
            <PanelRightOpen className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">Open configuration</TooltipContent>
      </Tooltip>
    </div>
  );
}

type DiagnosticTone = 'default' | 'success' | 'warning' | 'error';

interface DiagnosticItem {
  label: string;
  value: ReactNode;
  tone?: DiagnosticTone;
}

interface DiagnosticsDrawerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionDetails: DiagnosticItem[];
  subscriptionDetails: DiagnosticItem[];
  publishDetails: DiagnosticItem[];
  clientMetrics: DiagnosticItem[];
}

function DiagnosticsDrawerSheet({
  open,
  onOpenChange,
  connectionDetails,
  subscriptionDetails,
  publishDetails,
  clientMetrics,
}: DiagnosticsDrawerSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full sm:max-w-xl overflow-y-auto pb-8">
        <SheetHeader>
          <SheetTitle>Diagnostics</SheetTitle>
          <SheetDescription>
            Inspect recent connection activity, publish attempts, and client metrics.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          <DiagnosticsSection title="Connection Details" items={connectionDetails} />
          <DiagnosticsSection title="Subscription Status" items={subscriptionDetails} />
          <DiagnosticsSection title="Publish Activity" items={publishDetails} />
          <DiagnosticsSection title="Client Metrics" items={clientMetrics} />
        </div>
        <div className="mt-8 flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DiagnosticsSection({ title, items }: { title: string; items: DiagnosticItem[] }) {
  if (!items || items.length === 0) {
    return null;
  }

  const toneClass = (tone: DiagnosticTone = 'default') => {
    switch (tone) {
      case 'success':
        return 'text-green-600';
      case 'warning':
        return 'text-amber-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-900';
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </h3>
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <dl className="space-y-3">
          {items.map((item) => (
            <div key={item.label} className="flex items-start justify-between gap-4 text-sm">
              <dt className="text-gray-600">{item.label}</dt>
              <dd className={`max-w-[12rem] text-right break-words font-medium ${toneClass(item.tone)}`}>
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

interface PublishLogOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: PublishHistoryEntry[];
  onClear: () => void;
  onResend: (entry: PublishHistoryEntry) => void | Promise<void>;
  resendInFlightId: string | null;
}

function PublishLogOverlay({
  open,
  onOpenChange,
  entries,
  onClear,
  onResend,
  resendInFlightId,
}: PublishLogOverlayProps) {
  const [filter, setFilter] = useState<'all' | 'success' | 'error'>('all');

  const filteredEntries = useMemo(() => {
    if (filter === 'success') {
      return entries.filter((entry) => entry.success);
    }
    if (filter === 'error') {
      return entries.filter((entry) => !entry.success);
    }
    return entries;
  }, [entries, filter]);

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms} ms`;
    return `${(ms / 1000).toFixed(2)} s`;
  };

  const formatTimestampValue = (timestamp: number) => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return 'Unknown time';
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto pb-8">
        <SheetHeader>
          <SheetTitle>Publish Log</SheetTitle>
          <SheetDescription>
            Review recent publish attempts with status, timing, and payload previews.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              size="sm"
              variant={filter === 'success' ? 'default' : 'outline'}
              onClick={() => setFilter('success')}
            >
              Success
            </Button>
            <Button
              size="sm"
              variant={filter === 'error' ? 'default' : 'outline'}
              onClick={() => setFilter('error')}
            >
              Errors
            </Button>
          </div>
          <Button size="sm" variant="ghost" onClick={onClear} disabled={entries.length === 0}>
            Clear log
          </Button>
        </div>

        <div className="mt-4 space-y-4">
          {filteredEntries.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
              {entries.length === 0
                ? 'No publish attempts recorded yet.'
                : 'No entries match the selected filter.'}
            </div>
          ) : (
            filteredEntries.map((entry) => {
              const isResending = resendInFlightId === entry.id;
              const canResend = Boolean(entry.rawMessage);
              return (
                <div
                  key={entry.id}
                  className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={entry.success ? 'secondary' : 'destructive'}>
                        {entry.success ? 'Success' : 'Error'}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        {formatTimestampValue(entry.timestamp)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{formatDuration(entry.durationMs)}</span>
                      <span>Attempts: {entry.attempts}</span>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-slate-900">Channel</p>
                        <p className="text-slate-700 break-words">{entry.channel}</p>
                      </div>
                      {entry.timetoken && (
                        <div className="text-right">
                          <p className="font-medium text-slate-900">Timetoken</p>
                          <p className="text-slate-700">{entry.timetoken}</p>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Message</p>
                      <pre className="mt-1 max-h-32 overflow-auto rounded bg-slate-50 p-2 text-xs text-slate-700">
                        {entry.messagePreview || '—'}
                      </pre>
                    </div>
                    {entry.metaPreview && (
                      <div>
                        <p className="font-medium text-slate-900">Metadata</p>
                        <pre className="mt-1 max-h-24 overflow-auto rounded bg-slate-50 p-2 text-xs text-slate-700">
                          {entry.metaPreview}
                        </pre>
                      </div>
                    )}
                    {entry.error && (
                      <div className="text-xs text-red-600">
                        Error: {entry.error}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      size="sm"
                      className="bg-red-600 hover:bg-red-700 text-white"
                      onClick={() => onResend(entry)}
                      disabled={!canResend || isResending}
                    >
                      {isResending ? 'Resending…' : 'Resend'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(entry.rawMessage)}
                    >
                      Copy message
                    </Button>
                    {entry.rawMeta && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(entry.rawMeta!)}
                      >
                        Copy metadata
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
