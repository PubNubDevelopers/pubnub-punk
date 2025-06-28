import { useState, useEffect, useRef, useMemo } from 'react';
import { MessageCircle, Send, Play, Square, ChevronDown, ChevronUp, Copy, ArrowDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { storage } from '@/lib/storage';
import { useConfig } from '@/contexts/config-context';

// Schema-driven field definitions for bidirectional sync
const FIELD_DEFINITIONS = {
  // Publish Panel
  'publish.channel': { section: 'publish', field: 'channel', type: 'string', default: 'hello_world' },
  'publish.message': { section: 'publish', field: 'message', type: 'string', default: '{"text": "Hello, World!", "sender": "PubNub Developer Tools"}' },
  'publish.storeInHistory': { section: 'publish', field: 'storeInHistory', type: 'boolean', default: true },
  'publish.sendByPost': { section: 'publish', field: 'sendByPost', type: 'boolean', default: false },
  'publish.ttl': { section: 'publish', field: 'ttl', type: 'string', default: '' },
  'publish.customMessageType': { section: 'publish', field: 'customMessageType', type: 'string', default: 'text-message' },
  'publish.meta': { section: 'publish', field: 'meta', type: 'string', default: '' },
  
  // Subscribe Panel
  'subscribe.channels': { section: 'subscribe', field: 'channels', type: 'string', default: 'hello_world' },
  'subscribe.channelGroups': { section: 'subscribe', field: 'channelGroups', type: 'string', default: '' },
  'subscribe.receivePresenceEvents': { section: 'subscribe', field: 'receivePresenceEvents', type: 'boolean', default: false },
  'subscribe.cursor.timetoken': { section: 'subscribe', field: 'cursor.timetoken', type: 'string', default: '' },
  'subscribe.cursor.region': { section: 'subscribe', field: 'cursor.region', type: 'string', default: '' },
  'subscribe.withPresence': { section: 'subscribe', field: 'withPresence', type: 'boolean', default: false },
  'subscribe.heartbeat': { section: 'subscribe', field: 'heartbeat', type: 'number', default: 300 },
  'subscribe.restoreOnReconnect': { section: 'subscribe', field: 'restoreOnReconnect', type: 'boolean', default: true },
  
  // UI State
  'ui.showAdvanced': { section: 'ui', field: 'showAdvanced', type: 'boolean', default: false },
  'ui.showFilters': { section: 'ui', field: 'showFilters', type: 'boolean', default: false },
  'ui.showMessages': { section: 'ui', field: 'showMessages', type: 'boolean', default: true },
  'ui.messagesHeight': { section: 'ui', field: 'messagesHeight', type: 'number', default: 200 },
  'ui.showRawMessageData': { section: 'ui', field: 'showRawMessageData', type: 'boolean', default: false },
  
  // Filter Settings
  'filters.logic': { section: 'filters', field: 'logic', type: 'string', default: '&&' },
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

// Convert individual state objects to pageSettings structure
const stateToPageSettings = (publishData: any, subscribeData: any, uiState: any, filterState: any) => {
  const pageSettings: any = { 
    publish: {}, 
    subscribe: { cursor: {} }, 
    ui: {}, 
    filters: { conditions: filterState.conditions || [] }
  };
  
  // Map publish data
  Object.entries(publishData).forEach(([key, value]) => {
    pageSettings.publish[key] = value;
  });
  
  // Map subscribe data
  Object.entries(subscribeData).forEach(([key, value]) => {
    if (key === 'cursor') {
      pageSettings.subscribe.cursor = value;
    } else {
      pageSettings.subscribe[key] = value;
    }
  });
  
  // Map UI state
  pageSettings.ui = { ...uiState };
  
  // Map filter state
  pageSettings.filters.logic = filterState.logic;
  
  pageSettings._version = CURRENT_CONFIG_VERSION;
  return pageSettings;
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
  const defaultSettings: any = { 
    publish: {}, 
    subscribe: { cursor: {} }, 
    ui: {}, 
    filters: { conditions: [{ id: 1, target: 'message', field: '', operator: '==', value: '', type: 'string' }] }
  };
  
  // Set defaults from field definitions
  Object.entries(FIELD_DEFINITIONS).forEach(([fullPath, definition]) => {
    const pathParts = fullPath.split('.');
    if (pathParts.length === 2) {
      const [section, field] = pathParts;
      if (!defaultSettings[section]) defaultSettings[section] = {};
      defaultSettings[section][field] = definition.default;
    } else if (pathParts.length === 3) {
      const [section, subsection, field] = pathParts;
      if (!defaultSettings[section]) defaultSettings[section] = {};
      if (!defaultSettings[section][subsection]) defaultSettings[section][subsection] = {};
      defaultSettings[section][subsection][field] = definition.default;
    }
  });
  
  defaultSettings._version = CURRENT_CONFIG_VERSION;
  return defaultSettings;
};

export default function PubSubPage() {
  const { toast } = useToast();
  const { setPageSettings: setConfigPageSettings, setConfigType } = useConfig();
  const [publishData, setPublishData] = useState({
    channel: 'hello_world',
    message: '{"text": "Hello, World!", "sender": "PubNub Developer Tools"}',
    storeInHistory: true,
    sendByPost: false,
    ttl: '',
    customMessageType: 'text-message',
    meta: ''
  });

  const [subscribeData, setSubscribeData] = useState({
    channels: 'hello_world',
    channelGroups: '',
    receivePresenceEvents: false,
    cursor: {
      timetoken: '',
      region: ''
    },
    // Advanced options
    withPresence: false,
    heartbeat: 300,
    restoreOnReconnect: true
  });

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [presenceEvents, setPresenceEvents] = useState<any[]>([]);
  const [pubnubInstance, setPubnubInstance] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showMessages, setShowMessages] = useState(true);
  const [messagesHeight, setMessagesHeight] = useState(200);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [presenceAutoScroll, setPresenceAutoScroll] = useState(true);
  const [showPresenceScrollButton, setShowPresenceScrollButton] = useState(false);
  const [showRawMessageData, setShowRawMessageData] = useState(false);
  const [publishStatus, setPublishStatus] = useState<{
    isVisible: boolean;
    isSuccess: boolean;
    timetoken?: string;
    isFlashing: boolean;
  }>({ isVisible: false, isSuccess: false, isFlashing: false });
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const presenceContainerRef = useRef<HTMLDivElement>(null);
  const [subscribeFilters, setSubscribeFilters] = useState([{
    id: 1,
    target: 'message',
    field: '',
    operator: '==',
    value: '',
    type: 'string'
  }]);
  const [filterLogic, setFilterLogic] = useState('&&');

  // Schema-driven page settings - auto-synced with state changes
  const [pageSettings, setPageSettings] = useState(() => createDefaultPageSettings());

  // Config restoration function
  const restoreFromConfig = (config: any) => {
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
        setShowAdvanced(safeConfig.ui.showAdvanced || false);
        setShowFilters(safeConfig.ui.showFilters || false);
        setShowMessages(safeConfig.ui.showMessages !== false);
        setMessagesHeight(safeConfig.ui.messagesHeight || 200);
        setShowRawMessageData(safeConfig.ui.showRawMessageData || false);
      }
      if (safeConfig.filters) {
        setFilterLogic(safeConfig.filters.logic || '&&');
        if (safeConfig.filters.conditions) {
          setSubscribeFilters(safeConfig.filters.conditions);
        }
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
    const uiState = {
      showAdvanced,
      showFilters,
      showMessages,
      messagesHeight,
      showRawMessageData
    };
    const filterState = {
      logic: filterLogic,
      conditions: subscribeFilters
    };
    
    return stateToPageSettings(publishData, subscribeData, uiState, filterState);
  }, [
    // Publish data dependencies
    publishData.channel,
    publishData.message,
    publishData.storeInHistory,
    publishData.sendByPost,
    publishData.ttl,
    publishData.customMessageType,
    publishData.meta,
    // Subscribe data dependencies
    subscribeData.channels,
    subscribeData.channelGroups,
    subscribeData.receivePresenceEvents,
    subscribeData.cursor.timetoken,
    subscribeData.cursor.region,
    subscribeData.withPresence,
    subscribeData.heartbeat,
    subscribeData.restoreOnReconnect,
    // UI state dependencies
    showAdvanced,
    showFilters,
    showMessages,
    messagesHeight,
    showRawMessageData,
    // Filter dependencies
    filterLogic,
    JSON.stringify(subscribeFilters) // Use JSON for array comparison
  ]);
  
  useEffect(() => {
    setPageSettings(currentPageSettings);
    setConfigPageSettings(currentPageSettings);
    console.log('🔧 PubSub Page Settings Updated:', currentPageSettings);
  }, [currentPageSettings, setConfigPageSettings]);

  // Set config type on mount
  useEffect(() => {
    setConfigType('PUBSUB');
  }, [setConfigType]);

  // Copy to clipboard function
  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${type} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  // Filter management functions (auto-sync via useMemo)
  const addFilter = () => {
    const newFilter = {
      id: Date.now(),
      target: 'message',
      field: '',
      operator: '==',
      value: '',
      type: 'string'
    };
    setSubscribeFilters(prev => [...prev, newFilter]);
  };

  const removeFilter = (id: number) => {
    setSubscribeFilters(prev => prev.filter(f => f.id !== id));
  };

  // UI State Management Functions (auto-sync via useMemo)
  const handleShowAdvancedToggle = () => {
    setShowAdvanced(!showAdvanced);
  };

  const handleShowFiltersToggle = () => {
    setShowFilters(!showFilters);
  };

  const handleShowMessagesToggle = () => {
    setShowMessages(!showMessages);
  };

  const handleShowRawMessageDataToggle = (value: boolean) => {
    setShowRawMessageData(value);
  };

  const handleFilterLogicChange = (value: string) => {
    setFilterLogic(value);
  };

  const updateFilter = (id: number, field: string, value: any) => {
    setSubscribeFilters(prev => prev.map(f => 
      f.id === id ? { ...f, [field]: value } : f
    ));
  };

  // Scroll handling functions
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      setAutoScroll(true);
      setShowScrollButton(false);
    }
  };

  const scrollPresenceToBottom = () => {
    if (presenceContainerRef.current) {
      presenceContainerRef.current.scrollTop = presenceContainerRef.current.scrollHeight;
      setPresenceAutoScroll(true);
      setShowPresenceScrollButton(false);
    }
  };

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 5; // 5px threshold
      
      if (isAtBottom) {
        setAutoScroll(true);
        setShowScrollButton(false);
      } else {
        setAutoScroll(false);
        setShowScrollButton(true);
      }
    }
  };

  const handlePresenceScroll = () => {
    if (presenceContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = presenceContainerRef.current;
      const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 5; // 5px threshold
      
      if (isAtBottom) {
        setPresenceAutoScroll(true);
        setShowPresenceScrollButton(false);
      } else {
        setPresenceAutoScroll(false);
        setShowPresenceScrollButton(true);
      }
    }
  };

  // Auto-scroll when new messages arrive (only if auto-scroll is enabled)
  useEffect(() => {
    if (autoScroll && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  // Maintain scroll position when switching between single/split view
  useEffect(() => {
    if (autoScroll && messagesContainerRef.current) {
      // Small delay to ensure DOM has updated after view change
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      }, 50);
    }
  }, [subscribeData.receivePresenceEvents, autoScroll]);

  // Auto-scroll when new presence events arrive (only if auto-scroll is enabled)
  useEffect(() => {
    if (presenceAutoScroll && presenceContainerRef.current) {
      presenceContainerRef.current.scrollTop = presenceContainerRef.current.scrollHeight;
    }
  }, [presenceEvents, presenceAutoScroll]);

  // Maintain scroll position for presence window when switching between single/split view
  useEffect(() => {
    if (presenceAutoScroll && presenceContainerRef.current && subscribeData.receivePresenceEvents) {
      // Small delay to ensure DOM has updated after view change
      setTimeout(() => {
        if (presenceContainerRef.current) {
          presenceContainerRef.current.scrollTop = presenceContainerRef.current.scrollHeight;
        }
      }, 50);
    }
  }, [subscribeData.receivePresenceEvents, presenceAutoScroll]);

  // Copy all messages to clipboard (always raw data)
  const copyAllMessages = async () => {
    if (messages.length === 0) {
      toast({
        title: "No Messages",
        description: "No messages to copy",
        variant: "destructive",
      });
      return;
    }

    try {
      const rawMessages = messages.map(msg => ({
        channel: msg.channel,
        timetoken: msg.timetoken,
        publisher: msg.publisher || null,
        subscription: msg.subscription || null,
        messageType: msg.messageType || null,
        message: msg.message,
        meta: msg.meta || null
      }));

      const fullText = JSON.stringify(rawMessages, null, 2);

      await navigator.clipboard.writeText(fullText);
      
      toast({
        title: "Raw Messages Copied",
        description: `Successfully copied ${messages.length} raw message${messages.length !== 1 ? 's' : ''} to clipboard`,
      });
    } catch (error) {
      console.error('Failed to copy messages:', error);
      toast({
        title: "Copy Failed",
        description: "Failed to copy messages to clipboard",
        variant: "destructive",
      });
    }
  };

  // Copy all presence events to clipboard (always raw data)
  const copyAllPresenceEvents = async () => {
    if (presenceEvents.length === 0) {
      toast({
        title: "No Presence Events",
        description: "No presence events to copy",
        variant: "destructive",
      });
      return;
    }

    try {
      const rawPresenceEvents = presenceEvents.map(event => ({
        channel: event.channel,
        action: event.action,
        occupancy: event.occupancy,
        uuid: event.uuid,
        timestamp: event.timestamp,
        timetoken: event.timetoken,
        messageType: event.messageType
      }));

      const fullText = JSON.stringify(rawPresenceEvents, null, 2);

      await navigator.clipboard.writeText(fullText);
      
      toast({
        title: "Raw Presence Events Copied",
        description: `Successfully copied ${presenceEvents.length} raw presence event${presenceEvents.length !== 1 ? 's' : ''} to clipboard`,
      });
    } catch (error) {
      console.error('Failed to copy presence events:', error);
      toast({
        title: "Copy Failed",
        description: "Failed to copy presence events to clipboard",
        variant: "destructive",
      });
    }
  };

  const generateFilterExpression = () => {
    if (subscribeFilters.length === 0) return '';
    
    const expressions = subscribeFilters.map(filter => {
      if (!filter.field || !filter.value) return '';
      
      let leftSide = '';
      if (filter.target === 'message') {
        leftSide = `message.${filter.field}`;
      } else if (filter.target === 'meta') {
        leftSide = `meta.${filter.field}`;
      } else if (filter.target === 'publisher') {
        leftSide = 'publisher';
      } else if (filter.target === 'channel') {
        leftSide = 'channel';
      } else if (filter.target === 'timetoken') {
        leftSide = 'timetoken';
      } else if (filter.target === 'messageType') {
        leftSide = 'messageType';
      }

      let value = filter.value;
      
      // Handle quoting based on operator and type
      if (filter.type === 'string' || ['contains', 'like'].includes(filter.operator.toLowerCase())) {
        // String values and like/contains operators need quotes
        value = `"${filter.value}"`;
      } else if (filter.operator.toLowerCase() === 'like') {
        // Like operator always needs quotes for pattern matching
        value = `"${filter.value}"`;
      }

      // Format operator - PubNub expects uppercase LIKE
      let operator = filter.operator;
      if (operator.toLowerCase() === 'like') {
        operator = 'LIKE';
      } else if (operator.toLowerCase() === 'contains') {
        operator = 'CONTAINS';
      }

      return `${leftSide} ${operator} ${value}`;
    }).filter(expr => expr);

    if (expressions.length === 0) return '';
    if (expressions.length === 1) return expressions[0];
    
    return expressions.join(` ${filterLogic} `);
  };

  const handlePublish = async () => {
    const settings = storage.getSettings();
    
    if (!settings.credentials.publishKey || !settings.credentials.subscribeKey) {
      toast({
        title: "Configuration Required",
        description: "Please configure your PubNub keys in Settings first.",
        variant: "destructive",
      });
      return;
    }

    if (!publishData.channel.trim()) {
      toast({
        title: "Channel Required",
        description: "Please enter a channel name.",
        variant: "destructive",
      });
      return;
    }

    if (!publishData.message.trim()) {
      toast({
        title: "Message Required",
        description: "Please enter a message to publish.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Parse message as JSON if possible, otherwise use as string
      let messagePayload;
      try {
        messagePayload = JSON.parse(publishData.message);
      } catch {
        messagePayload = publishData.message;
      }

      // Parse meta as JSON if provided
      let metaPayload = undefined;
      if (publishData.meta.trim()) {
        try {
          metaPayload = JSON.parse(publishData.meta);
        } catch {
          metaPayload = publishData.meta;
        }
      }

      // Initialize PubNub instance from global CDN
      const pubnubConfig: any = {
        publishKey: settings.credentials.publishKey,
        subscribeKey: settings.credentials.subscribeKey,
        userId: settings.credentials.userId || 'pubsub-page-user'
      };
      
      // Add PAM token if available
      if (settings.credentials.pamToken) {
        pubnubConfig.authKey = settings.credentials.pamToken;
      }
      
      const pubnub = new window.PubNub(pubnubConfig);

      // Prepare publish parameters
      const publishParams: any = {
        message: messagePayload,
        channel: publishData.channel,
        storeInHistory: publishData.storeInHistory,
        sendByPost: publishData.sendByPost
      };

      // Add optional parameters if provided
      if (publishData.ttl && publishData.ttl.trim()) {
        publishParams.ttl = parseInt(publishData.ttl);
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

      // Show success indicator
      setPublishStatus({
        isVisible: true,
        isSuccess: true,
        timetoken: publishResult.timetoken,
        isFlashing: true
      });
      
      // Stop flashing after 500ms
      setTimeout(() => {
        setPublishStatus(prev => ({ ...prev, isFlashing: false }));
      }, 500);

    } catch (error) {
      console.error('Publish failed:', error);
      // Show error indicator and keep the toast for error details
      setPublishStatus({
        isVisible: true,
        isSuccess: false,
        isFlashing: true
      });
      
      // Stop flashing after 500ms
      setTimeout(() => {
        setPublishStatus(prev => ({ ...prev, isFlashing: false }));
      }, 500);
      
      // Show error details in toast
      toast({
        title: "Publish Failed", 
        description: `Failed to publish message: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

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

  const handleSubscribe = async () => {
    const settings = storage.getSettings();
    
    if (!settings.credentials.subscribeKey) {
      toast({
        title: "Configuration Required",
        description: "Please configure your PubNub Subscribe Key in Settings first.",
        variant: "destructive",
      });
      return;
    }

    const channelList = subscribeData.channels.split(',').map(c => c.trim()).filter(c => c);
    const channelGroupList = subscribeData.channelGroups.split(',').map(c => c.trim()).filter(c => c);

    if (channelList.length === 0 && channelGroupList.length === 0) {
      toast({
        title: "Channels Required",
        description: "Please enter at least one channel or channel group.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Initialize PubNub instance from global CDN
      const pubnubConfig: any = {
        publishKey: settings.credentials.publishKey,
        subscribeKey: settings.credentials.subscribeKey,
        userId: settings.credentials.userId || 'pubsub-page-user',
        heartbeatInterval: subscribeData.heartbeat,
        restoreMessages: subscribeData.restoreOnReconnect
      };
      
      // Add PAM token if available
      if (settings.credentials.pamToken) {
        pubnubConfig.authKey = settings.credentials.pamToken;
      }
      
      const pubnub = new window.PubNub(pubnubConfig);

      setPubnubInstance(pubnub);

      // Generate filter expression for subscription
      const filterExpression = generateFilterExpression();
      
      // Build subscription options
      const subscriptionOptions: any = {
        receivePresenceEvents: subscribeData.receivePresenceEvents
      };

      // Add cursor if provided
      if (subscribeData.cursor.timetoken && subscribeData.cursor.timetoken.trim()) {
        subscriptionOptions.cursor = {
          timetoken: subscribeData.cursor.timetoken
        };
        
        if (subscribeData.cursor.region && subscribeData.cursor.region.trim()) {
          subscriptionOptions.cursor.region = parseInt(subscribeData.cursor.region);
        }
      }

      console.log('Subscription options:', subscriptionOptions);

      // Create subscription using entity-based approach
      let subscriptionSet;
      
      if (channelList.length > 0 && channelGroupList.length > 0) {
        // Both channels and channel groups
        subscriptionSet = pubnub.subscriptionSet({
          channels: channelList,
          channelGroups: channelGroupList,
          subscriptionOptions: subscriptionOptions
        });
      } else if (channelList.length > 0) {
        // Only channels
        subscriptionSet = pubnub.subscriptionSet({
          channels: channelList,
          subscriptionOptions: subscriptionOptions
        });
      } else {
        // Only channel groups
        subscriptionSet = pubnub.subscriptionSet({
          channelGroups: channelGroupList,
          subscriptionOptions: subscriptionOptions
        });
      }

      // Add message listener
      subscriptionSet.addListener({
        message: (messageEvent: any) => {
          console.log('Received message:', messageEvent);
          
          // Apply client-side filter if specified
          if (filterExpression) {
            // Note: Server-side filtering is preferred, but we can add client-side as fallback
            console.log('Filter expression (for reference):', filterExpression);
          }

          const newMessage = {
            channel: messageEvent.channel,
            message: messageEvent.message,
            timetoken: messageEvent.timetoken,
            publisher: messageEvent.publisher,
            subscription: messageEvent.subscription,
            messageType: messageEvent.customMessageType || null,
            meta: messageEvent.userMetadata || null
          };

          setMessages(prev => [...prev, newMessage]);

          // Store message history if enabled
          if (settings.storage.storeMessageHistory) {
            const storedMessages = JSON.parse(localStorage.getItem('pubsub_message_history') || '[]');
            storedMessages.unshift(newMessage);
            // Keep only last 100 messages
            const limitedMessages = storedMessages.slice(0, 100);
            localStorage.setItem('pubsub_message_history', JSON.stringify(limitedMessages));
          }
        },
        
        presence: (presenceEvent: any) => {
          console.log('Received presence event:', presenceEvent);
          
          if (subscribeData.receivePresenceEvents) {
            const presenceMessage = {
              channel: presenceEvent.channel,
              action: presenceEvent.action,
              occupancy: presenceEvent.occupancy,
              uuid: presenceEvent.uuid,
              timestamp: presenceEvent.timestamp,
              timetoken: presenceEvent.timetoken,
              messageType: 'presence-event'
            };

            setPresenceEvents(prev => [...prev, presenceMessage]);
          }
        },

        signal: (signalEvent: any) => {
          console.log('Received signal:', signalEvent);
          
          const signalMessage = {
            channel: signalEvent.channel,
            message: signalEvent.message,
            timetoken: signalEvent.timetoken,
            publisher: signalEvent.publisher,
            messageType: 'signal'
          };

          setMessages(prev => [...prev, signalMessage]);
        },

        status: (statusEvent: any) => {
          console.log('Status event:', statusEvent);
          
          if (statusEvent.category === 'PNConnectedCategory') {
            console.log('Successfully connected and subscribed');
          } else if (statusEvent.category === 'PNReconnectedCategory') {
            console.log('Reconnected to PubNub');
          } else if (statusEvent.category === 'PNDisconnectedCategory') {
            console.log('Disconnected from PubNub');
          }
        }
      });

      // Apply filter expression if provided (server-side filtering)
      if (filterExpression && filterExpression.trim()) {
        console.log('Applying server-side filter:', filterExpression);
        
        // Set filter expression on the PubNub instance for server-side filtering
        // Note: This is applied globally to the instance
        try {
          pubnub.setFilterExpression(filterExpression);
          console.log('Filter expression set successfully:', filterExpression);
        } catch (filterError) {
          console.warn('Failed to set filter expression:', filterError);
          toast({
            title: "Filter Warning",
            description: "Server-side filtering may not be applied. Check filter syntax.",
            variant: "destructive"
          });
        }
      }

      // Subscribe to the channels/groups
      subscriptionSet.subscribe();
      setSubscription(subscriptionSet);
      setIsSubscribed(true);

      const hasFilters = filterExpression ? ' with filters' : '';
      const channelCount = channelList.length;
      const groupCount = channelGroupList.length;
      
      toast({
        title: "Subscribed Successfully",
        description: `Subscribed to ${channelCount} channels and ${groupCount} channel groups${hasFilters}`,
      });

    } catch (error) {
      console.error('Subscribe failed:', error);
      toast({
        title: "Subscribe Failed", 
        description: `Failed to subscribe: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const handleUnsubscribe = () => {
    try {
      // Unsubscribe from current subscription
      if (subscription) {
        subscription.unsubscribe();
        setSubscription(null);
      }

      // Clean up PubNub instance
      if (pubnubInstance) {
        pubnubInstance.removeAllListeners();
        pubnubInstance.destroy();
        setPubnubInstance(null);
      }

      setIsSubscribed(false);
      setMessages([]);
      setPresenceEvents([]);
      
      toast({
        title: "Unsubscribed",
        description: "Successfully unsubscribed from all channels",
      });
    } catch (error) {
      console.error('Error during unsubscribe:', error);
      // Force cleanup even if there's an error
      setIsSubscribed(false);
      setMessages([]);
      setPresenceEvents([]);
      setSubscription(null);
      setPubnubInstance(null);
      
      toast({
        title: "Unsubscribed",
        description: "Unsubscribed with cleanup (some errors occurred)",
        variant: "destructive",
      });
    }
  };

  const formatMessage = () => {
    try {
      const parsed = JSON.parse(publishData.message);
      setPublishData(prev => ({
        ...prev,
        message: JSON.stringify(parsed, null, 2)
      }));
    } catch {
      // Already formatted or not JSON
    }
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
      if (pubnubInstance) {
        pubnubInstance.removeAllListeners();
        pubnubInstance.destroy();
      }
    };
  }, [subscription, pubnubInstance]);

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Real-Time Messages Panel */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                  <MessageCircle className="text-white h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Real-Time Messages</CardTitle>
                  <p className="text-sm text-gray-600">
                    {isSubscribed 
                      ? `Listening for messages • ${messages.length} received` 
                      : "Subscribe to channels to see messages here"}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2 text-sm">
                    <Label htmlFor="receive-presence" className="text-xs font-medium">
                      Receive Presence Events
                    </Label>
                    <Switch
                      id="receive-presence"
                      checked={subscribeData.receivePresenceEvents}
                      onCheckedChange={(value) => handleSubscribeInputChange('receivePresenceEvents', value)}
                    />
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Label htmlFor="show-raw-data" className="text-xs font-medium">
                      Show Raw Message Data
                    </Label>
                    <Switch
                      id="show-raw-data"
                      checked={showRawMessageData}
                      onCheckedChange={handleShowRawMessageDataToggle}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {/* Show copy button only when presence events are disabled */}
                  {!subscribeData.receivePresenceEvents && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyAllMessages}
                      disabled={messages.length === 0}
                      className="flex items-center space-x-1"
                      title="Copy all messages to clipboard"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShowMessagesToggle}
                    className="flex items-center space-x-2"
                  >
                    {showMessages ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    <span>{showMessages ? 'Hide' : 'Show'}</span>
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          {showMessages && (
            <CardContent>
              <div className="relative">
                {subscribeData.receivePresenceEvents ? (
                  /* Split View - Messages and Presence Events */
                  <div className="grid grid-cols-2 gap-4">
                    {/* Left Window - Messages */}
                    <div className="space-y-2 relative">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-700">Messages</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={copyAllMessages}
                          disabled={messages.length === 0}
                          className="h-6 px-2"
                          title="Copy all messages to clipboard"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <div 
                        ref={messagesContainerRef}
                        onScroll={handleScroll}
                        className="bg-gray-50 rounded-lg p-4 overflow-y-auto resize-y border-b-2 border-gray-300"
                        style={{ height: `${messagesHeight}px`, minHeight: '120px', maxHeight: '600px' }}
                      >
                        {messages.length === 0 ? (
                          <div className="flex items-center justify-center h-full text-center">
                            <div>
                              <MessageCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                              <p className="text-xs text-gray-500">
                                {isSubscribed 
                                  ? "No messages received yet..." 
                                  : "Subscribe to channels to start receiving messages"}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {messages.map((msg, index) => (
                              <div key={index}>
                                {showRawMessageData ? (
                                  <pre className="font-mono text-xs bg-gray-100 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                                    {JSON.stringify({
                                      channel: msg.channel,
                                      timetoken: msg.timetoken,
                                      publisher: msg.publisher || null,
                                      subscription: msg.subscription || null,
                                      messageType: msg.messageType || null,
                                      message: msg.message,
                                      meta: msg.meta || null
                                    }, null, 2)}
                                  </pre>
                                ) : (
                                  <div className="bg-white rounded border shadow-sm p-2">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-mono text-blue-600 bg-blue-50 px-1 py-0.5 rounded">
                                        #{msg.channel}
                                      </span>
                                      <span className="text-xs text-gray-500 font-mono">
                                        {new Date(msg.timetoken / 10000).toLocaleTimeString()}
                                      </span>
                                    </div>
                                    <pre className="font-mono text-xs bg-gray-100 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                                      {JSON.stringify(msg.message, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* Scroll to bottom button for messages window */}
                      {showScrollButton && (
                        <Button
                          onClick={scrollToBottom}
                          size="sm"
                          className="absolute bottom-4 right-4 rounded-full w-8 h-8 p-0 shadow-lg bg-blue-500 hover:bg-blue-600 text-white"
                          title="Scroll to bottom"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    {/* Right Window - Presence Events */}
                    <div className="space-y-2 relative">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-700">Presence Events</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={copyAllPresenceEvents}
                          disabled={presenceEvents.length === 0}
                          className="h-6 px-2"
                          title="Copy all presence events to clipboard"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <div 
                        ref={presenceContainerRef}
                        onScroll={handlePresenceScroll}
                        className="bg-green-50 rounded-lg p-4 overflow-y-auto resize-y border-b-2 border-green-300"
                        style={{ height: `${messagesHeight}px`, minHeight: '120px', maxHeight: '600px' }}
                      >
                        {presenceEvents.length === 0 ? (
                          <div className="flex items-center justify-center h-full text-center">
                            <div>
                              <MessageCircle className="h-8 w-8 text-green-300 mx-auto mb-2" />
                              <p className="text-xs text-green-600">
                                {isSubscribed 
                                  ? "No presence events received yet..." 
                                  : "Subscribe to channels to see presence events"}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {presenceEvents.map((event, index) => (
                              <div key={index}>
                                {showRawMessageData ? (
                                  <pre className="font-mono text-xs bg-green-100 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                                    {JSON.stringify({
                                      channel: event.channel,
                                      action: event.action,
                                      occupancy: event.occupancy,
                                      uuid: event.uuid,
                                      timestamp: event.timestamp,
                                      timetoken: event.timetoken,
                                      messageType: event.messageType
                                    }, null, 2)}
                                  </pre>
                                ) : (
                                  <div className="bg-white rounded border border-green-200 shadow-sm p-2">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-mono text-green-600 bg-green-100 px-1 py-0.5 rounded">
                                        #{event.channel}
                                      </span>
                                      <span className="text-xs text-gray-500 font-mono">
                                        {new Date(event.timetoken / 10000).toLocaleTimeString()}
                                      </span>
                                    </div>
                                    <div className="text-xs space-y-1">
                                      <div><span className="font-semibold">Action:</span> {event.action}</div>
                                      <div><span className="font-semibold">UUID:</span> {event.uuid}</div>
                                      <div><span className="font-semibold">Occupancy:</span> {event.occupancy}</div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* Scroll to bottom button for presence events window */}
                      {showPresenceScrollButton && (
                        <Button
                          onClick={scrollPresenceToBottom}
                          size="sm"
                          className="absolute bottom-4 right-4 rounded-full w-8 h-8 p-0 shadow-lg bg-green-500 hover:bg-green-600 text-white"
                          title="Scroll to bottom"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Single View - Messages Only */
                  <div 
                    ref={messagesContainerRef}
                    onScroll={handleScroll}
                    className="bg-gray-50 rounded-lg p-4 overflow-y-auto resize-y border-b-2 border-gray-300"
                    style={{ height: `${messagesHeight}px`, minHeight: '120px', maxHeight: '600px' }}
                  >
                    {messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-center">
                        <div>
                          <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-sm text-gray-500">
                            {isSubscribed 
                              ? "No messages received yet..." 
                              : "Subscribe to channels to start receiving real-time messages"}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {messages.map((msg, index) => (
                          <div key={index}>
                            {showRawMessageData ? (
                              /* Raw Message Data View - No borders, just data */
                              <pre className="font-mono text-xs bg-gray-100 p-3 rounded overflow-x-auto whitespace-pre-wrap">
                                {JSON.stringify({
                                  channel: msg.channel,
                                  timetoken: msg.timetoken,
                                  publisher: msg.publisher || null,
                                  subscription: msg.subscription || null,
                                  messageType: msg.messageType || null,
                                  message: msg.message,
                                  meta: msg.meta || null
                                }, null, 2)}
                              </pre>
                            ) : (
                              /* Simple Message View - Clean display */
                              <div className="bg-white rounded border shadow-sm p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                    #{msg.channel}
                                  </span>
                                  <span className="text-xs text-gray-500 font-mono">
                                    {new Date(msg.timetoken / 10000).toLocaleTimeString()}
                                  </span>
                                </div>
                                <pre className="font-mono text-xs bg-gray-100 p-3 rounded overflow-x-auto whitespace-pre-wrap">
                                  {JSON.stringify(msg.message, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Scroll to bottom button - only in single view */}
                {!subscribeData.receivePresenceEvents && showScrollButton && (
                  <Button
                    onClick={scrollToBottom}
                    size="sm"
                    className="absolute bottom-4 right-4 rounded-full w-10 h-10 p-0 shadow-lg bg-blue-500 hover:bg-blue-600 text-white"
                    title="Scroll to bottom"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {(messages.length > 0 || presenceEvents.length > 0) && (
                <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
                  <span>
                    {messages.length} message{messages.length !== 1 ? 's' : ''} received
                    {subscribeData.receivePresenceEvents && presenceEvents.length > 0 && 
                      `, ${presenceEvents.length} presence event${presenceEvents.length !== 1 ? 's' : ''}`
                    }
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMessages([]);
                      setPresenceEvents([]);
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    Clear Messages
                  </Button>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Publish Panel */}
          <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-pubnub-red rounded-lg flex items-center justify-center" style={{ backgroundColor: 'hsl(351, 72%, 47%)' }}>
                  <Send className="text-white h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Publish Message</CardTitle>
                  <p className="text-sm text-gray-600">Send messages to PubNub channels</p>
                </div>
              </div>
              <div className="flex flex-col items-end space-y-2">
                <Button 
                  onClick={handlePublish}
                  className="shrink-0"
                  style={{ backgroundColor: 'hsl(351, 72%, 47%)' }}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Publish Message
                </Button>
                
                {/* Publish Status Indicator */}
                {publishStatus.isVisible && (
                  <div className="flex items-center space-x-2">
                    <div 
                      className={`w-3 h-3 rounded-full transition-colors duration-150 ${
                        publishStatus.isFlashing
                          ? publishStatus.isSuccess 
                            ? 'bg-green-500 animate-pulse' 
                            : 'bg-red-500 animate-pulse'
                          : publishStatus.isSuccess
                            ? 'bg-green-500'
                            : 'bg-red-500'
                      } ${!publishStatus.isFlashing ? 'bg-gray-400' : ''}`}
                    />
                    <span className="text-xs text-gray-600 font-mono">
                      {publishStatus.isSuccess 
                        ? `timetoken=${publishStatus.timetoken}`
                        : 'Publish Error'
                      }
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Channel */}
            <div className="space-y-2">
              <Label htmlFor="channel">Channel *</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="channel"
                  placeholder="hello_world"
                  value={publishData.channel}
                  onChange={(e) => handlePublishInputChange('channel', e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(publishData.channel, 'Channel name')}
                  disabled={!publishData.channel.trim()}
                  className="px-2"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500">The channel to publish the message to</p>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="message">Message *</Label>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={formatMessage}
                  className="text-xs"
                >
                  Format JSON
                </Button>
              </div>
              <Textarea
                id="message"
                placeholder='{"text": "Hello, World!", "sender": "Your Name"}'
                value={publishData.message}
                onChange={(e) => handlePublishInputChange('message', e.target.value)}
                rows={4}
                className="font-mono"
              />
              <p className="text-xs text-gray-500">The message payload (JSON object, array, string, or number)</p>
            </div>

            {/* Message Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Custom Message Type */}
              <div className="space-y-2">
                <Label htmlFor="customMessageType">Custom Message Type</Label>
                <Input
                  id="customMessageType"
                  placeholder="text-message"
                  value={publishData.customMessageType}
                  onChange={(e) => handlePublishInputChange('customMessageType', e.target.value)}
                />
                <p className="text-xs text-gray-500">Business-specific label (3-50 chars, alphanumeric, -, _)</p>
              </div>

              {/* TTL */}
              <div className="space-y-2">
                <Label htmlFor="ttl">TTL (Hours)</Label>
                <Input
                  id="ttl"
                  type="number"
                  placeholder="24"
                  value={publishData.ttl}
                  onChange={(e) => handlePublishInputChange('ttl', e.target.value)}
                />
                <p className="text-xs text-gray-500">Time to live in Message Persistence (hours)</p>
              </div>
            </div>

            {/* Meta */}
            <div className="space-y-2">
              <Label htmlFor="meta">Meta (Optional)</Label>
              <Textarea
                id="meta"
                placeholder='{"source": "developer-tools", "version": "1.0"}'
                value={publishData.meta}
                onChange={(e) => handlePublishInputChange('meta', e.target.value)}
                rows={2}
                className="font-mono"
              />
              <p className="text-xs text-gray-500">Extra metadata to publish with the request (JSON object)</p>
            </div>

            {/* Switches */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Store in History</Label>
                  <p className="text-xs text-gray-500">Whether to store the message in history</p>
                </div>
                <Switch
                  checked={publishData.storeInHistory}
                  onCheckedChange={(value) => handlePublishInputChange('storeInHistory', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Send by POST</Label>
                  <p className="text-xs text-gray-500">Use HTTP POST instead of GET (for large messages)</p>
                </div>
                <Switch
                  checked={publishData.sendByPost}
                  onCheckedChange={(value) => handlePublishInputChange('sendByPost', value)}
                />
              </div>
            </div>

          </CardContent>
        </Card>

          {/* Subscribe Panel */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-pubnub-blue rounded-lg flex items-center justify-center" style={{ backgroundColor: 'hsl(217, 96%, 64%)' }}>
                    <MessageCircle className="text-white h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>Subscribe to Messages</CardTitle>
                    <p className="text-sm text-gray-600">Listen for real-time messages and events</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {isSubscribed ? 'Active' : 'Inactive'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {isSubscribed ? 'Receiving messages' : 'Not subscribed'}
                    </div>
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
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Subscription */}
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="subscribe-channels">Channels</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="subscribe-channels"
                      placeholder="hello_world, channel1, channel2"
                      value={subscribeData.channels}
                      onChange={(e) => handleSubscribeInputChange('channels', e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(subscribeData.channels, 'Channel names')}
                      disabled={!subscribeData.channels.trim()}
                      className="px-2"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">Comma-separated list of channels to subscribe to</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="channel-groups">Channel Groups</Label>
                  <Input
                    id="channel-groups"
                    placeholder="group1, group2"
                    value={subscribeData.channelGroups}
                    onChange={(e) => handleSubscribeInputChange('channelGroups', e.target.value)}
                  />
                  <p className="text-xs text-gray-500">Comma-separated list of channel groups to subscribe to</p>
                </div>

              </div>

              {/* Subscribe Filters */}
              <div>
                <Button 
                  variant="outline" 
                  className="w-full justify-between bg-blue-50 hover:bg-blue-100 border-blue-200"
                  onClick={handleShowFiltersToggle}
                >
                  Subscribe Filters
                  {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
                {showFilters && (
                  <div className="space-y-4 mt-4">
                    <p className="text-sm text-gray-600">Configure server-side message filtering to receive only messages that match your criteria.</p>
                    
                    {/* Filter List */}
                    {subscribeFilters.map((filter, index) => (
                      <div key={filter.id} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Filter {index + 1}</span>
                          {subscribeFilters.length > 1 && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => removeFilter(filter.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          {/* Target */}
                          <div className="space-y-1">
                            <Label className="text-xs">Target</Label>
                            <Select 
                              value={filter.target} 
                              onValueChange={(value) => updateFilter(filter.id, 'target', value)}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="message">Message</SelectItem>
                                <SelectItem value="meta">Metadata</SelectItem>
                                <SelectItem value="publisher">Publisher ID</SelectItem>
                                <SelectItem value="channel">Channel</SelectItem>
                                <SelectItem value="timetoken">Timetoken</SelectItem>
                                <SelectItem value="messageType">Message Type</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Field */}
                          <div className="space-y-1">
                            <Label className="text-xs">Field</Label>
                            <Input
                              className="h-8"
                              placeholder={filter.target === 'message' ? 'text, priority, etc.' : 
                                          filter.target === 'meta' ? 'region, source, etc.' : 
                                          filter.target === 'publisher' ? 'Leave empty' :
                                          filter.target === 'channel' ? 'Leave empty' :
                                          filter.target === 'timetoken' ? 'Leave empty' :
                                          'Leave empty'}
                              value={filter.field}
                              onChange={(e) => updateFilter(filter.id, 'field', e.target.value)}
                              disabled={!['message', 'meta'].includes(filter.target)}
                            />
                          </div>

                          {/* Operator */}
                          <div className="space-y-1">
                            <Label className="text-xs">Operator</Label>
                            <Select 
                              value={filter.operator} 
                              onValueChange={(value) => updateFilter(filter.id, 'operator', value)}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="==">Equals (==)</SelectItem>
                                <SelectItem value="!=">Not Equals (!=)</SelectItem>
                                <SelectItem value="<">Less Than (&lt;)</SelectItem>
                                <SelectItem value=">">Greater Than (&gt;)</SelectItem>
                                <SelectItem value="<=">Less or Equal (&le;)</SelectItem>
                                <SelectItem value=">=">Greater or Equal (&ge;)</SelectItem>
                                <SelectItem value="contains">Contains</SelectItem>
                                <SelectItem value="like">Like (wildcard)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Value */}
                          <div className="space-y-1">
                            <Label className="text-xs">Value</Label>
                            <Input
                              className="h-8"
                              placeholder={filter.operator === 'like' ? 'pattern*' : 
                                          ['<', '>', '<=', '>='].includes(filter.operator) ? '123' : 
                                          'value'}
                              value={filter.value}
                              onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Add Filter Button */}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={addFilter}
                      className="w-full"
                    >
                      Add Another Filter
                    </Button>

                    {/* Logic Operator (when multiple filters) */}
                    {subscribeFilters.length > 1 && (
                      <div className="space-y-2">
                        <Label className="text-sm">Logic Between Filters</Label>
                        <Select value={filterLogic} onValueChange={handleFilterLogicChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="&&">AND (&&) - All filters must match</SelectItem>
                            <SelectItem value="||">OR (||) - Any filter can match</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Generated Filter Expression */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Generated Filter Expression</Label>
                      <div className="bg-gray-100 p-3 rounded-lg">
                        <code className="text-sm font-mono">
                          {generateFilterExpression() || 'No filters configured'}
                        </code>
                      </div>
                      <p className="text-xs text-gray-500">
                        This expression will be sent to PubNub to filter messages server-side before they reach your client.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Advanced Options */}
              <div>
                <Button 
                  variant="outline" 
                  className="w-full justify-between bg-gray-50 hover:bg-gray-100 border-gray-200"
                  onClick={handleShowAdvancedToggle}
                >
                  Advanced Options
                  {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
                {showAdvanced && (
                  <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cursor-timetoken">Cursor Timetoken</Label>
                      <Input
                        id="cursor-timetoken"
                        placeholder="15123456789012345"
                        value={subscribeData.cursor.timetoken}
                        onChange={(e) => handleSubscribeInputChange('cursor.timetoken', e.target.value)}
                      />
                      <p className="text-xs text-gray-500">Start from specific timetoken</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cursor-region">Cursor Region</Label>
                      <Input
                        id="cursor-region"
                        type="number"
                        placeholder="1"
                        value={subscribeData.cursor.region}
                        onChange={(e) => handleSubscribeInputChange('cursor.region', e.target.value)}
                      />
                      <p className="text-xs text-gray-500">Timetoken region number</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Enable Heartbeat</Label>
                        <p className="text-xs text-gray-500">Send periodic heartbeat messages</p>
                      </div>
                      <Switch
                        checked={subscribeData.withPresence}
                        onCheckedChange={(value) => handleSubscribeInputChange('withPresence', value)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Restore on Reconnect</Label>
                        <p className="text-xs text-gray-500">Automatically restore subscription on reconnection</p>
                      </div>
                      <Switch
                        checked={subscribeData.restoreOnReconnect}
                        onCheckedChange={(value) => handleSubscribeInputChange('restoreOnReconnect', value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="heartbeat-interval">Heartbeat Interval (seconds)</Label>
                      <Input
                        id="heartbeat-interval"
                        type="number"
                        placeholder="300"
                        value={subscribeData.heartbeat}
                        onChange={(e) => handleSubscribeInputChange('heartbeat', parseInt(e.target.value) || 300)}
                      />
                      <p className="text-xs text-gray-500">How often to send heartbeat messages</p>
                    </div>
                  </div>
                  </div>
                )}
              </div>


            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
