import { useState, useEffect, useCallback } from 'react';

interface PresenceState {
  [channel: string]: {
    occupancy: number;
    uuids: string[];
    join?: string[];
    leave?: string[];
    timeout?: string[];
  };
}

interface UsePubNubPresenceOptions {
  pubnub: any | null;
  channels?: string[];
  channelGroups?: string[];
  includeUUIDs?: boolean;
  includeState?: boolean;
}

interface UsePubNubPresenceResult {
  presenceState: PresenceState;
  getPresence: (channels?: string[], channelGroups?: string[]) => Promise<void>;
  clearPresence: () => void;
  error: string | null;
}

export function usePubNubPresence(options: UsePubNubPresenceOptions): UsePubNubPresenceResult {
  const {
    pubnub,
    channels = [],
    channelGroups = [],
    includeUUIDs = true,
    includeState = true
  } = options;

  const [presenceState, setPresenceState] = useState<PresenceState>({});
  const [error, setError] = useState<string | null>(null);

  const getPresence = useCallback(async (
    targetChannels: string[] = channels,
    targetChannelGroups: string[] = channelGroups
  ) => {
    if (!pubnub) {
      setError('PubNub instance not available');
      return;
    }

    if (targetChannels.length === 0 && targetChannelGroups.length === 0) {
      setError('No channels or channel groups specified');
      return;
    }

    try {
      const presenceParams: any = {
        includeUUIDs,
        includeState
      };

      if (targetChannels.length > 0) {
        presenceParams.channels = targetChannels;
      }

      if (targetChannelGroups.length > 0) {
        presenceParams.channelGroups = targetChannelGroups;
      }

      console.log('Getting presence for:', presenceParams);

      const response = await pubnub.hereNow(presenceParams);

      console.log('Presence response:', response);

      const newPresenceState: PresenceState = {};

      // Process channels
      if (response.channels) {
        Object.entries(response.channels).forEach(([channel, data]: [string, any]) => {
          newPresenceState[channel] = {
            occupancy: data.occupancy || 0,
            uuids: data.uuids?.map((u: any) => typeof u === 'string' ? u : u.uuid) || []
          };
        });
      }

      // Process total occupancy if no channel-specific data
      if (response.totalOccupancy !== undefined && Object.keys(newPresenceState).length === 0) {
        targetChannels.forEach(channel => {
          newPresenceState[channel] = {
            occupancy: response.totalOccupancy,
            uuids: []
          };
        });
      }

      setPresenceState(newPresenceState);
      setError(null);
    } catch (err) {
      console.error('Failed to get presence:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to get presence information';
      setError(errorMsg);
    }
  }, [pubnub, channels, channelGroups, includeUUIDs, includeState]);

  const clearPresence = useCallback(() => {
    setPresenceState({});
    setError(null);
  }, []);

  // Auto-refresh presence periodically
  useEffect(() => {
    if (!pubnub || (channels.length === 0 && channelGroups.length === 0)) {
      return;
    }

    // Initial fetch
    getPresence();

    // Set up periodic refresh (every 10 seconds)
    const interval = setInterval(() => {
      getPresence();
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [pubnub, channels, channelGroups, getPresence]);

  return {
    presenceState,
    getPresence,
    clearPresence,
    error
  };
}