import { useState, useEffect, useRef, useCallback } from 'react';
import { storage } from '@/lib/storage';
import { ensurePubNubSdk } from '@/lib/sdk-loader';
import { MessageData, PresenceEvent, FilterCondition } from '../types';
import { generateFilterExpression, formatTimestamp, parseChannels } from '../utils';
import { MAX_MESSAGES } from '../constants';

interface UsePubNubSubscriptionOptions {
  channels: string;
  channelGroups: string;
  receivePresenceEvents: boolean;
  withPresence?: boolean;
  cursor?: {
    timetoken: string;
    region: string;
  };
  heartbeat?: number;
  restoreOnReconnect?: boolean;
  filters?: FilterCondition[];
  filterLogic?: '&&' | '||';
  onMessage?: (message: MessageData) => void;
  onPresenceEvent?: (event: PresenceEvent) => void;
  onStatusChange?: (status: any) => void;
  onError?: (error: Error) => void;
}

interface UsePubNubSubscriptionResult {
  isSubscribed: boolean;
  messages: MessageData[];
  presenceEvents: PresenceEvent[];
  subscribe: () => Promise<boolean>;
  unsubscribe: () => void;
  clearMessages: () => void;
  clearPresenceEvents: () => void;
  error: string | null;
}

export function usePubNubSubscription(options: UsePubNubSubscriptionOptions): UsePubNubSubscriptionResult {
  const {
    channels,
    channelGroups,
    receivePresenceEvents,
    withPresence = false,
    cursor,
    heartbeat = 300,
    restoreOnReconnect = true,
    filters = [],
    filterLogic = '&&',
    onMessage,
    onPresenceEvent,
    onStatusChange,
    onError,
  } = options;

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [presenceEvents, setPresenceEvents] = useState<PresenceEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const pubnubInstanceRef = useRef<any>(null);
  const subscriptionRef = useRef<any>(null);
  const listenersAddedRef = useRef(false);
  const initialSubscriptionMadeRef = useRef(false);

  const handleMessage = useCallback((messageEvent: any) => {
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

    onMessage?.(newMessage);
  }, [onMessage]);

  const handlePresenceEvent = useCallback((presenceEvent: any) => {
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

    onPresenceEvent?.(newPresenceEvent);
  }, [onPresenceEvent]);

  const handleStatus = useCallback((statusEvent: any) => {
    console.log('Status event:', statusEvent);
    
    if (statusEvent.category === 'PNConnectedCategory') {
      console.log('Connected to PubNub');
    } else if (statusEvent.category === 'PNReconnectedCategory') {
      console.log('Reconnected to PubNub');
    } else if (statusEvent.category === 'PNDisconnectedCategory') {
      console.log('Disconnected from PubNub');
    } else if (statusEvent.category === 'PNNetworkDownCategory') {
      console.log('Network is down');
    } else if (statusEvent.category === 'PNNetworkUpCategory') {
      console.log('Network is back up');
    }

    onStatusChange?.(statusEvent);
  }, [onStatusChange]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    const settings = storage.getSettings();
    
    if (!settings.credentials.subscribeKey) {
      const errorMsg = 'Missing PubNub Subscribe Key';
      setError(errorMsg);
      onError?.(new Error(errorMsg));
      return false;
    }

    const channelList = parseChannels(channels);
    const channelGroupList = parseChannels(channelGroups);

    if (channelList.length === 0 && channelGroupList.length === 0) {
      const errorMsg = 'No channels or channel groups specified';
      setError(errorMsg);
      onError?.(new Error(errorMsg));
      return false;
    }

    try {
      // Clean up any existing subscription first
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }

      if (pubnubInstanceRef.current) {
        pubnubInstanceRef.current.removeAllListeners();
        pubnubInstanceRef.current.destroy?.();
      }

      // Ensure new subscriptions reattach listeners correctly
      if (listenersAddedRef.current || initialSubscriptionMadeRef.current || isSubscribed) {
        listenersAddedRef.current = false;
        initialSubscriptionMadeRef.current = false;
        setIsSubscribed(false);
      }

      // Create new PubNub instance for this subscription
      await ensurePubNubSdk(settings.sdkVersion);
      const heartbeatInterval = withPresence ? heartbeat : 0;
      const pubnubConfig: any = {
        publishKey: settings.credentials.publishKey,
        subscribeKey: settings.credentials.subscribeKey,
        userId: settings.credentials.userId || 'pubsub-subscription-user',
        heartbeatInterval,
        restore: restoreOnReconnect
      };

      const pubnubInstance = new (window as any).PubNub(pubnubConfig);
      if (typeof pubnubInstance.setHeartbeatInterval === 'function') {
        pubnubInstance.setHeartbeatInterval(heartbeatInterval);
      }
      pubnubInstanceRef.current = pubnubInstance;

      // Apply filter expression if provided
      const filterExpression = generateFilterExpression(filters, filterLogic);
      if (filterExpression && filterExpression.trim()) {
        console.log('Applying server-side filter:', filterExpression);
        try {
          pubnubInstance.setFilterExpression(filterExpression);
          console.log('Filter expression set successfully');
        } catch (filterError) {
          console.warn('Failed to set filter expression:', filterError);
          setError('Filter expression may not be applied correctly');
        }
      }

      // Build subscription options
      const subscriptionOptions: any = {
        receivePresenceEvents
      };
      if (withPresence) {
        subscriptionOptions.withPresence = true;
      }

      if (cursor?.timetoken && cursor.timetoken.trim()) {
        subscriptionOptions.cursor = {
          timetoken: cursor.timetoken
        };
        
        if (cursor.region && cursor.region.trim()) {
          subscriptionOptions.cursor.region = parseInt(cursor.region);
        }
      }

      // Create subscription set
      let subscriptionSet;
      if (channelList.length > 0 && channelGroupList.length > 0) {
        subscriptionSet = pubnubInstance.subscriptionSet({
          channels: channelList,
          channelGroups: channelGroupList,
          subscriptionOptions
        });
      } else if (channelList.length > 0) {
        subscriptionSet = pubnubInstance.subscriptionSet({
          channels: channelList,
          subscriptionOptions
        });
      } else {
        subscriptionSet = pubnubInstance.subscriptionSet({
          channelGroups: channelGroupList,
          subscriptionOptions
        });
      }

      // Add listeners
      if (!listenersAddedRef.current) {
        subscriptionSet.addListener({
          message: handleMessage,
          presence: handlePresenceEvent,
          status: handleStatus
        });
        listenersAddedRef.current = true;
      }

      // Subscribe
      subscriptionSet.subscribe();
      subscriptionRef.current = subscriptionSet;
      setIsSubscribed(true);
      setError(null);
      initialSubscriptionMadeRef.current = true;

      console.log(`Subscribed to ${channelList.length} channel(s) and ${channelGroupList.length} group(s)`);
      return true;
    } catch (err) {
      console.error('Subscribe failed:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to subscribe';
      setError(errorMsg);
      onError?.(err instanceof Error ? err : new Error(errorMsg));
      return false;
    }
  }, [channels, channelGroups, receivePresenceEvents, withPresence, cursor, heartbeat, restoreOnReconnect, filters, filterLogic, handleMessage, handlePresenceEvent, handleStatus, onError, isSubscribed]);

  const unsubscribe = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
    
    if (pubnubInstanceRef.current) {
      pubnubInstanceRef.current.removeAllListeners();
      pubnubInstanceRef.current.destroy?.();
      pubnubInstanceRef.current = null;
    }
    
    listenersAddedRef.current = false;
    initialSubscriptionMadeRef.current = false;
    setIsSubscribed(false);
    setError(null);
    
    console.log('Unsubscribed from all channels');
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const clearPresenceEvents = useCallback(() => {
    setPresenceEvents([]);
  }, []);

  // Auto-resubscribe when subscription parameters change (if already subscribed)
  useEffect(() => {
    // Only resubscribe if we've made an initial subscription and parameters changed
    if (initialSubscriptionMadeRef.current && isSubscribed && subscriptionRef.current) {
      console.log('Subscription parameters changed, resubscribing...');
      // Use a timeout to debounce rapid parameter changes
      const timeout = setTimeout(() => {
        if (isSubscribed && subscriptionRef.current) {
          subscribe();
        }
      }, 100);
      
      return () => clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channels, channelGroups, receivePresenceEvents, withPresence, filters, filterLogic, heartbeat, restoreOnReconnect, cursor?.timetoken, cursor?.region]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
      if (pubnubInstanceRef.current) {
        pubnubInstanceRef.current.removeAllListeners();
        pubnubInstanceRef.current.destroy?.();
      }
    };
  }, []);

  return {
    isSubscribed,
    messages,
    presenceEvents,
    subscribe,
    unsubscribe,
    clearMessages,
    clearPresenceEvents,
    error
  };
}
