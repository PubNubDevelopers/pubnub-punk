import { useState, useEffect, useRef, useMemo } from 'react';
import { MessageCircle, Play, Square, Copy, Settings, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { storage } from '@/lib/storage';
import { useConfig } from '@/contexts/config-context';
import { usePubNub } from '@/hooks/usePubNub';
import LiveMessagesPanel from './LiveMessagesPanel';
import StatusIndicator from './shared/StatusIndicator';
import { QuickPublishPanel } from './QuickPublishPanel';
import SubscriptionConfigPanel from './SubscriptionConfigPanel';

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

export default function PubSubPage() {
  const { toast } = useToast();
  const { setPageSettings: setConfigPageSettings, setConfigType } = useConfig();
  
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

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [presenceEvents, setPresenceEvents] = useState<PresenceEvent[]>([]);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);

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

  const [localPubnubInstance, setLocalPubnubInstance] = useState<any>(null);
  const [localSubscription, setLocalSubscription] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showMessages, setShowMessages] = useState(true);
  const [messagesHeight, setMessagesHeight] = useState(DEFAULT_MESSAGE_HEIGHT);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [presenceAutoScroll, setPresenceAutoScroll] = useState(true);
  const [showPresenceScrollButton, setShowPresenceScrollButton] = useState(false);
  const [showRawMessageData, setShowRawMessageData] = useState(false);
  const [publishStatus, setPublishStatus] = useState<PublishStatus>({
    isVisible: false,
    isSuccess: false,
    isFlashing: false
  });
  
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


  const [pageSettings, setPageSettings] = useState(() => createDefaultPageSettings());

  const restoreFromConfig = (config: any) => {
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
        setMessagesHeight(safeConfig.ui.messagesHeight || DEFAULT_MESSAGE_HEIGHT);
        setShowRawMessageData(safeConfig.ui.showRawMessageData || false);
      }
      if (safeConfig.filters) {
        setFilterLogic(safeConfig.filters.logic || '&&');
        if (safeConfig.filters.conditions) {
          setSubscribeFilters(safeConfig.filters.conditions);
        }
      }
      
      setPageSettings(safeConfig);
      
      console.log('🔧 PubSub Page Settings Restored:', safeConfig);
      return true;
    } catch (error) {
      console.error('Failed to restore config:', error);
      return false;
    }
  };

  const currentPageSettings = useMemo(() => {
    const uiState: UIState = {
      showFilters,
      showMessages,
      messagesHeight,
      showRawMessageData
    };
    const filterState: FilterState = {
      logic: filterLogic,
      conditions: subscribeFilters
    };
    
    return stateToPageSettings(publishData, subscribeData, uiState, filterState);
  }, [
    publishData.channel,
    publishData.message,
    publishData.storeInHistory,
    publishData.sendByPost,
    publishData.ttl,
    publishData.customMessageType,
    publishData.meta,
    subscribeData.channels,
    subscribeData.channelGroups,
    subscribeData.receivePresenceEvents,
    subscribeData.cursor.timetoken,
    subscribeData.cursor.region,
    subscribeData.withPresence,
    subscribeData.heartbeat,
    subscribeData.restoreOnReconnect,
    showFilters,
    showMessages,
    messagesHeight,
    showRawMessageData,
    filterLogic,
    subscribeFilters
  ]);

  useEffect(() => {
    setConfigPageSettings(currentPageSettings);
  }, [currentPageSettings, setConfigPageSettings]);


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


  const handlePublish = async () => {
    if (!pubnub || !pubnubReady) {
      toast({
        title: "PubNub Not Ready",
        description: "Please wait for PubNub to initialize or check your connection.",
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
      let messagePayload;
      try {
        messagePayload = JSON.parse(publishData.message);
      } catch {
        messagePayload = publishData.message;
      }

      let metaPayload = undefined;
      if (publishData.meta.trim()) {
        try {
          metaPayload = JSON.parse(publishData.meta);
        } catch {
          metaPayload = publishData.meta;
        }
      }

      const publishParams: any = {
        message: messagePayload,
        channel: publishData.channel,
        storeInHistory: publishData.storeInHistory,
        sendByPost: publishData.sendByPost
      };

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

      const publishResult = await pubnub.publish(publishParams);

      console.log('Publish successful:', publishResult);

      setPublishStatus({
        isVisible: true,
        isSuccess: true,
        timetoken: publishResult.timetoken,
        isFlashing: true
      });
      
      setTimeout(() => {
        setPublishStatus(prev => ({ ...prev, isFlashing: false }));
      }, 500);

    } catch (error) {
      console.error('Publish failed:', error);
      setPublishStatus({
        isVisible: true,
        isSuccess: false,
        isFlashing: true
      });
      
      setTimeout(() => {
        setPublishStatus(prev => ({ ...prev, isFlashing: false }));
      }, 500);
      
      const { title, description } = parsePublishError(error);
      toast({
        title, 
        description,
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

    const channelList = parseChannels(subscribeData.channels);
    const channelGroupList = parseChannels(subscribeData.channelGroups);

    if (channelList.length === 0 && channelGroupList.length === 0) {
      toast({
        title: "Channels Required",
        description: "Please enter at least one channel or channel group.",
        variant: "destructive",
      });
      return;
    }

    try {
      const localPubnub = new (window as any).PubNub({
        publishKey: settings.credentials.publishKey,
        subscribeKey: settings.credentials.subscribeKey,
        userId: settings.credentials.userId || 'pubsub-page-user',
        heartbeatInterval: subscribeData.heartbeat,
        restoreMessages: subscribeData.restoreOnReconnect
      });

      setLocalPubnubInstance(localPubnub);

      const filterExpression = generateFilterExpression(subscribeFilters, filterLogic);
      
      if (filterExpression && filterExpression.trim()) {
        console.log('Applying server-side filter:', filterExpression);
        
        try {
          localPubnub.setFilterExpression(filterExpression);
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

      const subscriptionOptions: any = {
        receivePresenceEvents: subscribeData.receivePresenceEvents
      };

      if (subscribeData.cursor.timetoken && subscribeData.cursor.timetoken.trim()) {
        subscriptionOptions.cursor = {
          timetoken: subscribeData.cursor.timetoken
        };
        
        if (subscribeData.cursor.region && subscribeData.cursor.region.trim()) {
          subscriptionOptions.cursor.region = parseInt(subscribeData.cursor.region);
        }
      }

      console.log('Subscription options:', subscriptionOptions);

      let subscriptionSet;
      if (channelList.length > 0 && channelGroupList.length > 0) {
        subscriptionSet = localPubnub.subscriptionSet({
          channels: channelList,
          channelGroups: channelGroupList,
          subscriptionOptions: subscriptionOptions
        });
      } else if (channelList.length > 0) {
        subscriptionSet = localPubnub.subscriptionSet({
          channels: channelList,
          subscriptionOptions: subscriptionOptions
        });
      } else {
        subscriptionSet = localPubnub.subscriptionSet({
          channelGroups: channelGroupList,
          subscriptionOptions: subscriptionOptions
        });
      }

      subscriptionSet.addListener({
        message: (messageEvent: any) => {
          console.log('Received message:', messageEvent);
          
          const newMessage: MessageData = {
            channel: messageEvent.channel,
            message: messageEvent.message,
            timetoken: messageEvent.timetoken,
            publisher: messageEvent.publisher,
            subscription: messageEvent.subscription,
            messageType: messageEvent.customMessageType || undefined,
            userMetadata: messageEvent.userMetadata || undefined,
            timestamp: formatTimestamp(messageEvent.timetoken)
          };

          setMessages(prev => {
            const updated = [...prev, newMessage];
            if (updated.length > MAX_MESSAGES) {
              return updated.slice(-MAX_MESSAGES);
            }
            return updated;
          });
        },
        presence: (presenceEvent: any) => {
          console.log('Received presence event:', presenceEvent);
          
          const newPresenceEvent: PresenceEvent = {
            action: presenceEvent.action,
            uuid: presenceEvent.uuid,
            channel: presenceEvent.channel,
            subscription: presenceEvent.subscription,
            timetoken: presenceEvent.timetoken,
            timestamp: formatTimestamp(presenceEvent.timetoken),
            occupancy: presenceEvent.occupancy,
            state: presenceEvent.state,
            join: presenceEvent.join,
            leave: presenceEvent.leave,
            timeout: presenceEvent.timeout
          };

          setPresenceEvents(prev => {
            const updated = [...prev, newPresenceEvent];
            if (updated.length > MAX_MESSAGES) {
              return updated.slice(-MAX_MESSAGES);
            }
            return updated;
          });
        },
        status: (statusEvent: any) => {
          console.log('Status event:', statusEvent);
          
          if (statusEvent.category === 'PNConnectedCategory') {
            toast({
              title: "Connected",
              description: "Successfully subscribed to channels",
            });
          } else if (statusEvent.category === 'PNNetworkDownCategory') {
            toast({
              title: "Network Down",
              description: "Lost connection to PubNub",
              variant: "destructive",
            });
          } else if (statusEvent.category === 'PNReconnectedCategory') {
            toast({
              title: "Reconnected",
              description: "Reconnected to PubNub",
            });
          }
        }
      });

      subscriptionSet.subscribe();
      setLocalSubscription(subscriptionSet);
      setIsSubscribed(true);

      toast({
        title: "Subscribed",
        description: `Subscribed to ${channelList.length} channel(s) and ${channelGroupList.length} group(s)`,
      });

    } catch (error) {
      console.error('Subscribe failed:', error);
      toast({
        title: "Subscribe Failed",
        description: error instanceof Error ? error.message : "Failed to subscribe to channels",
        variant: "destructive",
      });
    }
  };

  const handleUnsubscribe = () => {
    if (localSubscription) {
      localSubscription.unsubscribe();
      setLocalSubscription(null);
    }
    
    if (localPubnubInstance) {
      localPubnubInstance.removeAllListeners();
      setLocalPubnubInstance(null);
    }
    
    setIsSubscribed(false);
    setMessages([]);
    setPresenceEvents([]);
    
    toast({
      title: "Unsubscribed",
      description: "Disconnected from all channels",
    });
  };


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
        onClear={() => {
          setMessages([]);
          setPresenceEvents([]);
        }}
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

      {/* Subscription Configuration Panel */}
      <SubscriptionConfigPanel
        subscribeData={subscribeData}
        filters={subscribeFilters}
        filterLogic={filterLogic}
        onSubscribeDataChange={handleSubscribeInputChange}
        onFiltersChange={setSubscribeFilters}
        onFilterLogicChange={setFilterLogic}
      />
    </div>
  );
}