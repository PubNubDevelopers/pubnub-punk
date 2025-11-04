import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Play, Square, Users, Radio, User, Plus, Pencil, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePubNub } from '@/hooks/usePubNub';
import { useToast } from '@/hooks/use-toast';
import { parsePresenceMessage, ParsedPresenceEvent } from '@/lib/presence/presence-parser';
import { ensurePubNubSdk } from '@/lib/sdk-loader';
import { storage } from '@/lib/storage';

const DEFAULT_CHANNEL = 'presence-demo-channel';
const MAX_SIMULATED_USERS = 16;

interface PresenceUUID {
  uuid: string;
  state?: Record<string, unknown>;
}

interface HereNowHistoryEntry {
  id: string;
  channel: string;
  occupancy: number;
  uuids: string[];
  timestamp: number;
  raw: unknown;
}

interface SimulatedUser {
  internalId: string;
  userId: string;
  pubnub: any | null;
  subscription: any | null;
  mode: 'event-engine' | 'legacy';
  legacyListener?: any | null;
  isConnected: boolean;
  channel: string | null;
  stateDraft: string;
  isUpdatingState: boolean;
  lastStateError: string | null;
  isStateExpanded: boolean;
}

interface WhereNowHistoryEntry {
  id: string;
  uuid: string;
  channels: string[];
  states?: Record<string, Record<string, unknown> | null>;
  timestamp: number;
  raw: unknown;
}

export default function PresenceV2Page() {
  const { toast } = useToast();
  const {
    pubnub,
    isReady,
    isConnected,
    connectionError,
    reconnect,
  } = usePubNub({
    instanceId: 'presence-v2-monitor',
    userId: 'presence-v2-monitor',
    onConnectionError: (error) => {
      toast({
        title: 'Presence monitor connection failed',
        description: error,
        variant: 'destructive',
      });
    },
  });

  const [inputChannel, setInputChannel] = useState(DEFAULT_CHANNEL);
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [connectedUUIDs, setConnectedUUIDs] = useState<string[]>([]);
  const [occupancy, setOccupancy] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [snapshotData, setSnapshotData] = useState<{
    channel: string;
    occupancy: number;
    uuids: string[];
    states: Record<string, Record<string, unknown> | null>;
    timestamp: number | null;
    raw: unknown;
  } | null>(null);
  const [lastPresenceEvent, setLastPresenceEvent] = useState<ParsedPresenceEvent | null>(null);
  const [hereNowChannel, setHereNowChannel] = useState(DEFAULT_CHANNEL);
  const [isHereNowChannelCustom, setIsHereNowChannelCustom] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [hereNowHistory, setHereNowHistory] = useState<HereNowHistoryEntry[]>([]);
  const [whereNowUuid, setWhereNowUuid] = useState('');
  const [isWhereNowUuidCustom, setIsWhereNowUuidCustom] = useState(false);
  const [isWhereNowHistoryOpen, setIsWhereNowHistoryOpen] = useState(false);
  const [whereNowHistory, setWhereNowHistory] = useState<WhereNowHistoryEntry[]>([]);
  const [isWhereNowLoading, setIsWhereNowLoading] = useState(false);
  const [whereNowSnapshot, setWhereNowSnapshot] = useState<{
    uuid: string;
    channels: string[];
    states: Record<string, Record<string, unknown> | null>;
    timestamp: number | null;
    raw: unknown;
  } | null>(null);
  const [simulatedUsers, setSimulatedUsers] = useState<SimulatedUser[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [nextSimulatedUserIndex, setNextSimulatedUserIndex] = useState(1);
  const [isCreatingSimulatedUser, setIsCreatingSimulatedUser] = useState(false);
  const simulatedUsersRef = useRef<SimulatedUser[]>([]);
  const [presenceStateByUuid, setPresenceStateByUuid] = useState<Record<string, Record<string, unknown> | null>>({});
  const presenceStateRef = useRef<Record<string, Record<string, unknown> | null>>({});

  const formattedActiveChannel = useMemo(() => activeChannel ?? '', [activeChannel]);
  const presenceChannel = useMemo(() => (activeChannel ? `${activeChannel}-pnpres` : null), [activeChannel]);
  const snapshotChannel = useMemo(
    () => hereNowChannel.trim() || inputChannel.trim() || activeChannel || '',
    [hereNowChannel, inputChannel, activeChannel],
  );

  const sortedUUIDs = useMemo(() => {
    return [...connectedUUIDs].sort((a, b) => a.localeCompare(b));
  }, [connectedUUIDs]);

  const whereNowTargetUuid = useMemo(
    () => whereNowUuid.trim() || sortedUUIDs[0] || '',
    [whereNowUuid, sortedUUIDs],
  );

  const simulatedChannelTarget = useMemo(
    () => formattedActiveChannel || inputChannel.trim(),
    [formattedActiveChannel, inputChannel],
  );

  const normalizeUuid = useCallback((value?: string): string | undefined => {
    if (!value) {
      return undefined;
    }
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }, []);

  const upsertPresenceStates = useCallback(
    (
      entries: Array<{ uuid?: string | null; state?: Record<string, unknown> | null | undefined }>,
      options?: { notify?: boolean },
    ) => {
      if (!entries || entries.length === 0) {
        return;
      }

      const current = presenceStateRef.current;
      let mutated = false;
      const next: Record<string, Record<string, unknown> | null> = { ...current };
      const diffs: Array<{ uuid: string; before: Record<string, unknown> | null | undefined; after: Record<string, unknown> | null }> = [];

      for (const entry of entries) {
        const normalized = normalizeUuid(entry.uuid || undefined);
        if (!normalized) {
          continue;
        }

        const stateValue = entry.state && typeof entry.state === 'object' && Object.keys(entry.state).length > 0
          ? (entry.state as Record<string, unknown>)
          : null;

        const before = Object.prototype.hasOwnProperty.call(next, normalized) ? next[normalized] : undefined;
        const beforeSerialized = before ? JSON.stringify(before) : null;
        const afterSerialized = stateValue ? JSON.stringify(stateValue) : null;

        if (stateValue === null) {
          if (before !== undefined) {
            mutated = true;
            delete next[normalized];
            diffs.push({ uuid: normalized, before: before ?? null, after: null });
          }
          continue;
        }

        if (beforeSerialized === afterSerialized) {
          continue;
        }

        mutated = true;
        next[normalized] = stateValue;
        diffs.push({ uuid: normalized, before: before ?? null, after: stateValue });
      }

      if (!mutated) {
        return;
      }

      presenceStateRef.current = next;
      setPresenceStateByUuid(next);

      if (options?.notify === false || diffs.length === 0) {
        return;
      }

      diffs.forEach(({ uuid, before, after }) => {
        const beforeLabel = before ? JSON.stringify(before) : 'none';
        const afterLabel = after ? JSON.stringify(after) : 'none';
        toast({
          title: 'Presence state changed',
          description: `${uuid}: ${beforeLabel} → ${afterLabel}`,
        });
      });
    },
    [normalizeUuid, toast],
  );

  const removePresenceStates = useCallback(
    (uuids: string[] | undefined, notify = false) => {
      if (!uuids || uuids.length === 0) {
        return;
      }
      const entries = uuids.map((uuid) => ({ uuid, state: null }));
      upsertPresenceStates(entries, { notify });
    },
    [upsertPresenceStates],
  );

  const resetPresenceState = useCallback(() => {
    setConnectedUUIDs([]);
    setOccupancy(0);
    setSnapshotData(null);
    setWhereNowSnapshot(null);
    presenceStateRef.current = {};
    setPresenceStateByUuid({});
  }, []);

  const hydratePresenceFromHereNow = useCallback(
    async (channel: string) => {
      if (!pubnub || !channel) {
        return;
      }

      try {
        setIsLoading(true);
        const response = await pubnub.hereNow({
          channels: [channel],
          includeUUIDs: true,
          includeState: true,
        });

        const channelData = response?.channels?.[channel];
        const occupants = (channelData?.occupants ?? []) as PresenceUUID[];
        const uuids = occupants
          .map((entry) => (typeof entry === 'string' ? entry : entry?.uuid))
          .map((entry) => normalizeUuid(entry))
          .filter((entry): entry is string => Boolean(entry));

        const states: Record<string, Record<string, unknown> | null> = {};
        occupants.forEach((entry) => {
          const candidateUuid = typeof entry === 'string' ? entry : entry?.uuid;
          const normalizedUuid = normalizeUuid(candidateUuid);
          if (!normalizedUuid) {
            return;
          }
          const stateValue = typeof entry === 'string' ? null : entry?.state;
          if (stateValue && typeof stateValue === 'object' && Object.keys(stateValue).length > 0) {
            states[normalizedUuid] = stateValue;
          } else {
            states[normalizedUuid] = null;
          }
        });
        const stateEntries = Object.entries(states).map(([uuid, state]) => ({ uuid, state }));
        if (stateEntries.length > 0) {
          upsertPresenceStates(stateEntries, { notify: false });
        }

        const occupancyValue = typeof channelData?.occupancy === 'number' ? channelData.occupancy : uuids.length;
        const timestamp = Date.now();
        const historyEntry: HereNowHistoryEntry = {
          id: `${timestamp}-${channel}`,
          channel,
          occupancy: occupancyValue,
          uuids: Array.from(new Set(uuids)),
          timestamp,
          raw: response,
        };

        setSnapshotData({
          channel,
          occupancy: occupancyValue,
          uuids: Array.from(new Set(uuids)),
          states,
          timestamp,
          raw: response,
        });
        setHereNowHistory((prev) => [historyEntry, ...prev]);
      } catch (error) {
        console.error('Failed to fetch presence data', error);
        toast({
          title: 'Unable to fetch presence data',
          description:
            error instanceof Error ? error.message : 'Check your network connection or channel name.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [pubnub, toast, normalizeUuid],
  );

  const primeLivePresence = useCallback(
    async (channel: string) => {
      if (!pubnub || !channel) {
        return;
      }

      try {
        const response = await pubnub.hereNow({
          channels: [channel],
          includeUUIDs: true,
          includeState: true,
        });

        const channelData = response?.channels?.[channel];
        const occupants = (channelData?.occupants ?? []) as PresenceUUID[];
        const uuids = occupants
          .map((entry) => (typeof entry === 'string' ? entry : entry?.uuid))
          .map((entry) => normalizeUuid(entry))
          .filter((entry): entry is string => Boolean(entry));

        const states: Record<string, Record<string, unknown> | null> = {};
        occupants.forEach((entry) => {
          const candidateUuid = typeof entry === 'string' ? entry : entry?.uuid;
          const normalizedUuid = normalizeUuid(candidateUuid);
          if (!normalizedUuid) {
            return;
          }
          const stateValue = typeof entry === 'string' ? null : entry?.state;
          if (stateValue && typeof stateValue === 'object' && Object.keys(stateValue).length > 0) {
            states[normalizedUuid] = stateValue;
          } else {
            states[normalizedUuid] = null;
          }
        });
        const stateEntries = Object.entries(states).map(([uuid, state]) => ({ uuid, state }));
        if (stateEntries.length > 0) {
          upsertPresenceStates(stateEntries, { notify: false });
        }

        const uniqueUuids = Array.from(new Set(uuids));
        const occupancyValue = typeof channelData?.occupancy === 'number' ? channelData.occupancy : uniqueUuids.length;

        setOccupancy(occupancyValue);
        setConnectedUUIDs(uniqueUuids);
      } catch (error) {
        console.error('Failed to seed live presence data', error);
        toast({
          title: 'Unable to seed live presence',
          description: error instanceof Error ? error.message : 'Check your network connection or channel name.',
          variant: 'destructive',
        });
      }
    },
    [pubnub, toast, normalizeUuid],
  );

  const hydratePresenceFromWhereNow = useCallback(
    async (uuid: string) => {
      if (!pubnub || !uuid) {
        return;
      }

      try {
        setIsWhereNowLoading(true);
        const response = await pubnub.whereNow({ uuid });
        const channels = Array.isArray(response?.channels) ? response.channels : [];

        let stateByChannel: Record<string, Record<string, unknown> | null> = {};
        if (channels.length > 0) {
          try {
            const stateResponse = await pubnub.getState({ uuid, channels });
            const channelStates = stateResponse?.channels && typeof stateResponse.channels === 'object'
              ? (stateResponse.channels as Record<string, unknown>)
              : {};

            Object.entries(channelStates).forEach(([channelName, value]) => {
              if (value && typeof value === 'object' && Object.keys(value as Record<string, unknown>).length > 0) {
                stateByChannel[channelName] = value as Record<string, unknown>;
              } else {
                stateByChannel[channelName] = null;
              }
            });
          } catch (stateError) {
            console.warn('Failed to retrieve presence state for Where Now lookup', stateError);
          }
        }

        const timestamp = Date.now();
        const historyEntry: WhereNowHistoryEntry = {
          id: `${timestamp}-${uuid}`,
          uuid,
          channels,
          states: stateByChannel,
          timestamp,
          raw: response,
        };

        setWhereNowSnapshot({
          uuid,
          channels,
          states: stateByChannel,
          timestamp,
          raw: response,
        });
        setWhereNowHistory((prev) => [historyEntry, ...prev]);
      } catch (error) {
        console.error('Failed to fetch Where Now data', error);
        toast({
          title: 'Unable to fetch Where Now data',
          description: error instanceof Error ? error.message : 'Provide a valid UUID to lookup.',
          variant: 'destructive',
        });
      } finally {
        setIsWhereNowLoading(false);
      }
    },
    [pubnub, toast],
  );

  const applyPresenceUpdate = useCallback((event: ParsedPresenceEvent) => {
    if (!event) {
      return;
    }

    setLastPresenceEvent(event);

    if (typeof event.occupancy === 'number') {
      setOccupancy(event.occupancy);
    }

    if (event.state && event.uuid) {
      upsertPresenceStates([{ uuid: event.uuid, state: event.state }]);
    }

    if (event.action === 'leave' || event.action === 'timeout') {
      if (event.uuid) {
        removePresenceStates([event.uuid]);
      }
    }

    setConnectedUUIDs((prev) => {
      const nextSet = new Set(prev);

      const addUuid = (value?: string) => {
        const normalized = normalizeUuid(value);
        if (normalized) {
          nextSet.add(normalized);
        }
      };

      const removeUuid = (value?: string) => {
        const normalized = normalizeUuid(value);
        if (normalized) {
          nextSet.delete(normalized);
        }
      };

      event.join?.forEach(addUuid);
      event.leave?.forEach(removeUuid);
      event.timeout?.forEach(removeUuid);

      if (event.uuid) {
        if (event.action === 'join' || event.action === 'state-change') {
          addUuid(event.uuid);
        } else if (event.action === 'leave' || event.action === 'timeout') {
          removeUuid(event.uuid);
        }
      }

      if (typeof event.occupancy === 'number' && event.occupancy === 0) {
        presenceStateRef.current = {};
        setPresenceStateByUuid({});
        return [];
      }

      return Array.from(nextSet);
    });

  }, [normalizeUuid, removePresenceStates, upsertPresenceStates]);

  useEffect(() => {
    if (!isHereNowChannelCustom) {
      setHereNowChannel(inputChannel);
    }
  }, [inputChannel, isHereNowChannelCustom]);

  useEffect(() => {
    if (isHereNowChannelCustom && hereNowChannel.trim() === inputChannel.trim()) {
      setIsHereNowChannelCustom(false);
    }
  }, [hereNowChannel, inputChannel, isHereNowChannelCustom]);

  useEffect(() => {
    if (!isWhereNowUuidCustom) {
      setWhereNowUuid(sortedUUIDs[0] ?? '');
    }
  }, [sortedUUIDs, isWhereNowUuidCustom]);

  useEffect(() => {
    if (isWhereNowUuidCustom && whereNowUuid.trim() === (sortedUUIDs[0] ?? '').trim()) {
      setIsWhereNowUuidCustom(false);
    }
  }, [whereNowUuid, sortedUUIDs, isWhereNowUuidCustom]);

  useEffect(() => {
    simulatedUsersRef.current = simulatedUsers;
  }, [simulatedUsers]);

  useEffect(() => {
    presenceStateRef.current = presenceStateByUuid;
  }, [presenceStateByUuid]);

  useEffect(() => {
    return () => {
      simulatedUsersRef.current.forEach((user) => {
        try {
          user.subscription?.unsubscribe?.();
        } catch (error) {
          console.warn('Failed to unsubscribe simulated user on cleanup', error);
        }
        try {
          user.pubnub?.removeAllListeners?.();
        } catch (error) {
          console.warn('Failed to remove listeners for simulated user on cleanup', error);
        }
        try {
          user.pubnub?.destroy?.();
        } catch (error) {
          console.warn('Failed to destroy simulated user client on cleanup', error);
        }
      });
    };
  }, []);

  useEffect(() => {
    if (!pubnub || !isMonitoring || !presenceChannel) {
      return;
    }

    const listener = {
      message: (envelope: any) => {
        const parsed = parsePresenceMessage(envelope);
        if (!parsed || parsed.presenceChannel !== presenceChannel || parsed.baseChannel !== activeChannel) {
          return;
        }
        applyPresenceUpdate(parsed);
      },
      presence: (presenceEvent: any) => {
        if (!presenceEvent) {
          return;
        }

        const subscriptionName = presenceEvent.subscription || presenceEvent.subscribedChannel;
        if (subscriptionName !== presenceChannel) {
          return;
        }

        const parsed: ParsedPresenceEvent = {
          raw: presenceEvent,
          presenceChannel: presenceChannel,
          baseChannel: presenceEvent.channel || activeChannel || presenceChannel.replace(/-pnpres$/, ''),
          action: presenceEvent.action,
          uuid: presenceEvent.uuid,
          occupancy: typeof presenceEvent.occupancy === 'number' ? presenceEvent.occupancy : undefined,
          timestamp: typeof presenceEvent.timestamp === 'number' ? presenceEvent.timestamp : undefined,
          state: presenceEvent.state && typeof presenceEvent.state === 'object' ? presenceEvent.state : null,
          join: Array.isArray(presenceEvent.join) ? presenceEvent.join : undefined,
          leave: Array.isArray(presenceEvent.leave) ? presenceEvent.leave : undefined,
          timeout: Array.isArray(presenceEvent.timeout) ? presenceEvent.timeout : undefined,
          timetoken: presenceEvent.timetoken,
          publisher: presenceEvent.uuid,
        };

        applyPresenceUpdate(parsed);
      },
    };

    pubnub.addListener(listener);
    pubnub.subscribe({ channels: [presenceChannel] });

    return () => {
      pubnub.unsubscribe({ channels: [presenceChannel] });
      pubnub.removeListener(listener);
    };
  }, [pubnub, isMonitoring, presenceChannel, activeChannel, applyPresenceUpdate]);

  useEffect(() => {
    (window as any).__PRESENCE_DEBUG__ = {
      occupancy,
      connectedUUIDs,
      snapshotData,
      lastPresenceEvent,
      whereNowSnapshot,
      hereNowHistory,
      whereNowHistory,
      simulatedUsers,
      presenceStateByUuid,
    };
  }, [
    occupancy,
    connectedUUIDs,
    snapshotData,
    lastPresenceEvent,
    whereNowSnapshot,
    hereNowHistory,
    whereNowHistory,
    simulatedUsers,
    presenceStateByUuid,
  ]);

  const handleConnect = async () => {
    const nextChannel = inputChannel.trim();
    if (!nextChannel) {
      toast({
        title: 'Channel name is required',
        description: 'Enter a valid channel to monitor.',
        variant: 'destructive',
      });
      return;
    }

    setActiveChannel(nextChannel);
    setIsMonitoring(true);
    resetPresenceState();
    setIsHereNowChannelCustom(false);
    setHereNowChannel(nextChannel);
    setIsWhereNowUuidCustom(false);
    setWhereNowUuid('');

    await primeLivePresence(nextChannel);
  };

  const statusLabelTone = isMonitoring ? 'text-emerald-600' : 'text-muted-foreground';

  const handleDisconnect = () => {
    setIsMonitoring(false);
    setActiveChannel(null);
    resetPresenceState();
    setIsHereNowChannelCustom(false);
    setIsWhereNowUuidCustom(false);
    setWhereNowUuid('');
  };

  const handleCopyHereNowHistory = useCallback(async () => {
    if (hereNowHistory.length === 0) {
      return;
    }

    try {
      const payload = JSON.stringify(
        hereNowHistory.map(({ channel, occupancy, uuids, timestamp, raw }) => ({
          channel,
          occupancy,
          uuids,
          timestamp,
          raw,
        })),
        null,
        2,
      );
      await navigator.clipboard.writeText(payload);
      toast({
        title: 'Copied Here Now data',
        description: 'All Here Now responses are ready to paste.',
      });
    } catch (error) {
      console.error('Failed to copy Here Now history', error);
      toast({
        title: 'Copy failed',
        description: 'Unable to copy the Here Now history. Try again.',
        variant: 'destructive',
      });
    }
  }, [hereNowHistory, toast]);

  const handleClearHereNowHistory = useCallback(() => {
    setHereNowHistory([]);
    setSnapshotData(null);
    setIsHistoryOpen(false);
    toast({
      title: 'History cleared',
      description: 'Here Now history has been reset for this session.',
    });
  }, [toast]);

  const handleCopyWhereNowHistory = useCallback(async () => {
    if (whereNowHistory.length === 0) {
      return;
    }

    try {
      const payload = JSON.stringify(
        whereNowHistory.map(({ uuid, channels, timestamp, raw }) => ({
          uuid,
          channels,
          timestamp,
          raw,
        })),
        null,
        2,
      );
      await navigator.clipboard.writeText(payload);
      toast({
        title: 'Copied Where Now data',
        description: 'All Where Now responses are ready to paste.',
      });
    } catch (error) {
      console.error('Failed to copy Where Now history', error);
      toast({
        title: 'Copy failed',
        description: 'Unable to copy the Where Now history. Try again.',
        variant: 'destructive',
      });
    }
  }, [whereNowHistory, toast]);

  const handleClearWhereNowHistory = useCallback(() => {
    setWhereNowHistory([]);
    setWhereNowSnapshot(null);
    setIsWhereNowHistoryOpen(false);
    toast({
      title: 'History cleared',
      description: 'Where Now history has been reset for this session.',
    });
  }, [toast]);

  const createSimulatedUser = useCallback(async () => {
    if (isCreatingSimulatedUser) {
      return;
    }

    const settings = storage.getSettings();

    if (!settings.credentials.subscribeKey) {
      toast({
        title: 'Configuration required',
        description: 'Add your PubNub keys in Settings before creating simulated users.',
        variant: 'destructive',
      });
      return;
    }

    const targetChannel = simulatedChannelTarget;

    if (!targetChannel) {
      toast({
        title: 'Channel required',
        description: 'Select a channel in the monitor before adding simulated users.',
        variant: 'destructive',
      });
      return;
    }

    if (simulatedUsersRef.current.length >= MAX_SIMULATED_USERS) {
      toast({
        title: 'Limit reached',
        description: `You can only create up to ${MAX_SIMULATED_USERS} simulated users.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsCreatingSimulatedUser(true);
      await ensurePubNubSdk(settings.sdkVersion);

      if (!(window as any).PubNub) {
        throw new Error('PubNub SDK not available');
      }

      const internalId = `presence-v2-sim-${Date.now()}-${nextSimulatedUserIndex}`;
      const userId = `user-${nextSimulatedUserIndex}`;

      const config: Record<string, unknown> = {
        publishKey: settings.credentials.publishKey,
        subscribeKey: settings.credentials.subscribeKey,
        userId,
        enableEventEngine: settings.environment.enableEventEngine,
      };

      if (settings.credentials.pamToken) {
        config.authKey = settings.credentials.pamToken;
      }

      const pubnub = new (window as any).PubNub(config);
      const useEventEngine = Boolean(settings.environment.enableEventEngine);
      let subscription: any | null = null;
      let legacyListener: any | null = null;

      if (useEventEngine) {
        const channel = pubnub.channel(targetChannel);
        subscription = channel.subscription({
          receivePresenceEvents: false,
        });
        subscription.subscribe();
      } else {
        pubnub.subscribe({ channels: [targetChannel] });
      }

      setSimulatedUsers((prev) => [
        ...prev,
        {
          internalId,
          userId,
          pubnub,
          subscription,
          mode: useEventEngine ? 'event-engine' : 'legacy',
          legacyListener,
          isConnected: true,
          channel: targetChannel,
          stateDraft: '{}',
          isUpdatingState: false,
          lastStateError: null,
          isStateExpanded: false,
        },
      ]);
      setNextSimulatedUserIndex((prev) => prev + 1);
      toast({
        title: 'Simulated user connected',
        description: `${userId} joined #${targetChannel}.`,
      });
    } catch (error) {
      console.error('Failed to create simulated user', error);
      toast({
        title: 'Unable to create user',
        description: error instanceof Error ? error.message : 'Check your configuration and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingSimulatedUser(false);
    }
  }, [isCreatingSimulatedUser, nextSimulatedUserIndex, toast, simulatedChannelTarget]);

  const startSimulatedUserRename = useCallback((internalId: string, currentUserId: string) => {
    setEditingUserId(internalId);
    setEditingLabel(currentUserId);
  }, []);

  const cancelSimulatedUserRename = useCallback(() => {
    setEditingUserId(null);
    setEditingLabel('');
  }, []);

  const updateSimulatedUserStateDraft = useCallback((internalId: string, nextDraft: string) => {
    setSimulatedUsers((previous) =>
      previous.map((entry) =>
        entry.internalId === internalId
          ? {
              ...entry,
              stateDraft: nextDraft,
              lastStateError: null,
            }
          : entry,
      ),
    );
  }, []);

  const applySimulatedUserState = useCallback(
    async (internalId: string) => {
      const target = simulatedUsersRef.current.find((entry) => entry.internalId === internalId);
      if (!target) {
        toast({ title: 'User not found', description: 'Unable to locate the simulated user.', variant: 'destructive' });
        return;
      }

      if (!target.isConnected || !target.channel || !target.pubnub) {
        toast({
          title: 'User disconnected',
          description: 'Connect the simulated user before setting state.',
          variant: 'destructive',
        });
        return;
      }

      const draft = target.stateDraft.trim();
      let parsedState: Record<string, unknown> | null = {};
      if (draft.length === 0 || draft === '{}') {
        parsedState = {};
      } else {
        try {
          const candidate = JSON.parse(draft);
          if (candidate === null) {
            parsedState = {};
          } else if (typeof candidate === 'object' && !Array.isArray(candidate)) {
            parsedState = candidate as Record<string, unknown>;
          } else {
            throw new Error('Presence state must be a JSON object.');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Invalid JSON payload.';
          setSimulatedUsers((previous) =>
            previous.map((entry) =>
              entry.internalId === internalId
                ? {
                    ...entry,
                    lastStateError: message,
                  }
                : entry,
            ),
          );
          toast({
            title: 'Invalid state JSON',
            description: message,
            variant: 'destructive',
          });
          return;
        }
      }

        setSimulatedUsers((previous) =>
          previous.map((entry) =>
            entry.internalId === internalId
              ? {
                  ...entry,
                  isUpdatingState: true,
                  lastStateError: null,
                }
              : entry,
          ),
        );

      try {
        await target.pubnub.setState({
          channels: [target.channel],
          state: parsedState ?? {},
        });

        upsertPresenceStates([{ uuid: target.userId, state: parsedState ?? {} }], { notify: false });

      setSimulatedUsers((previous) =>
        previous.map((entry) =>
          entry.internalId === internalId
            ? {
                ...entry,
                isUpdatingState: false,
                lastStateError: null,
                stateDraft: JSON.stringify(parsedState ?? {}, null, 2),
                isStateExpanded: false,
              }
            : entry,
        ),
      );

        toast({
          title: 'Presence state updated',
          description: `${target.userId} state saved successfully.`,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to update presence state.';
        setSimulatedUsers((previous) =>
          previous.map((entry) =>
            entry.internalId === internalId
              ? {
                  ...entry,
                  isUpdatingState: false,
                  lastStateError: message,
                }
              : entry,
          ),
        );
        toast({
          title: 'State update failed',
          description: message,
          variant: 'destructive',
        });
      }
    },
    [toast, upsertPresenceStates],
  );

  const removeSimulatedUser = useCallback(
    (internalId: string) => {
      const target = simulatedUsersRef.current.find((entry) => entry.internalId === internalId);
      if (!target) {
        return;
      }

      try {
        if ((target.mode ?? 'event-engine') === 'event-engine') {
          target.subscription?.unsubscribe?.();
        } else if (target.channel) {
          target.pubnub?.unsubscribe({ channels: [target.channel] });
          if (target.legacyListener) {
            target.pubnub?.removeListener?.(target.legacyListener);
          }
        }
      } catch (error) {
        console.warn('Failed to unsubscribe simulated user during removal', error);
      }

      try {
        target.pubnub?.removeAllListeners?.();
        target.pubnub?.destroy?.();
      } catch (error) {
        console.warn('Failed to destroy simulated user client during removal', error);
      }

      removePresenceStates([target.userId]);

      setSimulatedUsers((prev) => prev.filter((entry) => entry.internalId !== internalId));

      if (editingUserId === internalId) {
        setEditingUserId(null);
        setEditingLabel('');
      }

      toast({
        title: 'Simulated user removed',
        description: `${target.userId} has been disconnected and deleted.`,
      });
    },
    [editingUserId, removePresenceStates, toast],
  );

  const removeAllSimulatedUsers = useCallback(async () => {
    const users = simulatedUsersRef.current;
    if (users.length === 0) {
      return;
    }

    users.forEach((user) => {
      try {
        if ((user.mode ?? 'event-engine') === 'event-engine') {
          user.subscription?.unsubscribe?.();
        } else if (user.channel) {
          user.pubnub?.unsubscribe({ channels: [user.channel] });
          if (user.legacyListener) {
            user.pubnub?.removeListener?.(user.legacyListener);
          }
        }
      } catch (error) {
        console.warn('Failed to unsubscribe simulated user during bulk removal', error);
      }

      try {
        user.pubnub?.removeAllListeners?.();
        user.pubnub?.destroy?.();
      } catch (error) {
        console.warn('Failed to destroy simulated user client during bulk removal', error);
      }
    });

    removePresenceStates(users.map((user) => user.userId), false);

    setSimulatedUsers([]);
    setEditingUserId(null);
    setEditingLabel('');

    toast({
      title: 'Simulated users cleared',
      description: 'All simulated users have been disconnected and removed.',
    });

    const channelToHydrate = activeChannel || inputChannel.trim();
    if (channelToHydrate) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await primeLivePresence(channelToHydrate);
    }
  }, [activeChannel, inputChannel, primeLivePresence, removePresenceStates, toast]);

  const commitSimulatedUserRename = useCallback(
    async (internalId: string) => {
      const trimmed = editingLabel.trim();
      if (!trimmed) {
        toast({
          title: 'Name required',
          description: 'Enter a valid user name before saving.',
          variant: 'destructive',
        });
        return;
      }

      if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) {
        toast({
          title: 'Invalid characters',
          description: 'Names may only include letters, numbers, hyphens, or underscores.',
          variant: 'destructive',
        });
        return;
      }

      const nextUserId = trimmed;

      const existing = simulatedUsers.find((entry) => entry.internalId === internalId);
      if (!existing) {
        cancelSimulatedUserRename();
        return;
      }

      if (existing.userId === nextUserId) {
        cancelSimulatedUserRename();
        return;
      }

      if (simulatedUsers.some((entry) => entry.internalId !== internalId && entry.userId === nextUserId)) {
        toast({
          title: 'Duplicate name',
          description: 'Choose a unique user name before saving.',
          variant: 'destructive',
        });
        return;
      }

      if (simulatedUsers.some((entry) => entry.internalId !== internalId && entry.userId === nextUserId)) {
        toast({
          title: 'Duplicate name',
          description: 'Choose a unique user name before saving.',
          variant: 'destructive',
        });
        return;
      }

      const settings = storage.getSettings();
      if (!settings.credentials.subscribeKey) {
        toast({
          title: 'Configuration required',
          description: 'Add your PubNub keys in Settings before renaming users.',
          variant: 'destructive',
        });
        return;
      }

      try {
        await ensurePubNubSdk(settings.sdkVersion);

        existing.subscription?.unsubscribe?.();
        if ((existing.mode ?? 'event-engine') === 'legacy' && existing.channel && existing.pubnub) {
          try {
            existing.pubnub.unsubscribe({ channels: [existing.channel] });
          } catch (unsubscribeError) {
            console.warn('Failed to unsubscribe legacy simulated user during rename', unsubscribeError);
          }
          if (existing.legacyListener) {
            existing.pubnub.removeListener?.(existing.legacyListener);
          }
        }
        existing.pubnub?.removeAllListeners?.();
        existing.pubnub?.destroy?.();

        removePresenceStates([existing.userId]);

        if (!(window as any).PubNub) {
          throw new Error('PubNub SDK not available');
        }

        const useEventEngine = Boolean(settings.environment.enableEventEngine);
        const config: Record<string, unknown> = {
          publishKey: settings.credentials.publishKey,
          subscribeKey: settings.credentials.subscribeKey,
          userId: nextUserId,
          enableEventEngine: useEventEngine,
        };

        if (settings.credentials.pamToken) {
          config.authKey = settings.credentials.pamToken;
        }

        const newPubnub = new (window as any).PubNub(config);

        let newSubscription: any | null = null;
        let newLegacyListener: any | null = null;
        if (existing.isConnected && existing.channel) {
          if (useEventEngine) {
            const channel = newPubnub.channel(existing.channel);
            newSubscription = channel.subscription({ receivePresenceEvents: false });
            newSubscription.subscribe();
          } else {
            newLegacyListener = null;
            newPubnub.subscribe({ channels: [existing.channel] });
          }
        }

        setSimulatedUsers((prev) =>
          prev.map((entry) =>
            entry.internalId === internalId
              ? {
                  ...entry,
                  userId: nextUserId,
                  pubnub: newPubnub,
                  subscription: newSubscription,
                  legacyListener: newLegacyListener,
                  mode: useEventEngine ? 'event-engine' : 'legacy',
                  isConnected: useEventEngine ? Boolean(newSubscription) : Boolean(existing.channel && existing.isConnected),
                  channel: existing.isConnected ? existing.channel : null,
                }
              : entry,
          ),
        );

        const channelCopy = existing.channel ? `#${existing.channel}` : 'the channel';
        toast({
          title: 'User renamed',
          description: newSubscription
            ? `${nextUserId} rejoined ${channelCopy}.`
            : `${nextUserId} is ready to connect.`,
        });

        cancelSimulatedUserRename();
      } catch (error) {
        console.error('Failed to rename simulated user', error);
        toast({
          title: 'Rename failed',
          description: error instanceof Error ? error.message : 'Unable to rename simulated user.',
          variant: 'destructive',
        });
      }
    }, [editingLabel, simulatedUsers, toast, cancelSimulatedUserRename, removePresenceStates]);

  const toggleSimulatedUserConnection = useCallback(
    async (internalId: string) => {
      const user = simulatedUsers.find((entry) => entry.internalId === internalId);
      if (!user) {
        return;
      }

      if (!user.pubnub) {
        toast({
          title: 'Client missing',
          description: 'This simulated user is missing a PubNub client.',
          variant: 'destructive',
        });
        return;
      }

      if (user.isConnected) {
        try {
          if ((user.mode ?? 'event-engine') === 'event-engine') {
            user.subscription?.unsubscribe?.();
          } else if (user.channel) {
            user.pubnub.unsubscribe({ channels: [user.channel] });
            if (user.legacyListener) {
              user.pubnub.removeListener?.(user.legacyListener);
            }
          }
        } catch (error) {
          console.warn('Failed to unsubscribe simulated user', error);
        }

        setSimulatedUsers((prev) =>
          prev.map((entry) =>
            entry.internalId === internalId
              ? {
                  ...entry,
                  isConnected: false,
                  subscription: null,
                  legacyListener: (entry.mode ?? 'event-engine') === 'legacy' ? null : entry.legacyListener,
                  channel: null,
                }
              : entry,
          ),
        );
        toast({
          title: 'User disconnected',
          description: `${user.userId} left the channel.`,
        });
        return;
      }

      const targetChannel = simulatedChannelTarget;

      if (!targetChannel) {
        toast({
          title: 'Channel required',
          description: 'Set a channel in the monitor before connecting simulated users.',
          variant: 'destructive',
        });
        return;
      }

      try {
        if ((user.mode ?? 'event-engine') === 'event-engine') {
          const channel = user.pubnub.channel(targetChannel);
          const subscription = channel.subscription({
            receivePresenceEvents: false,
          });
          subscription.subscribe();

          setSimulatedUsers((prev) =>
            prev.map((entry) =>
              entry.internalId === internalId
                ? {
                    ...entry,
                    isConnected: true,
                    subscription,
                    channel: targetChannel,
                  }
                : entry,
            ),
          );
        } else {
          user.pubnub.subscribe({ channels: [targetChannel] });

          setSimulatedUsers((prev) =>
            prev.map((entry) =>
              entry.internalId === internalId
                ? {
                    ...entry,
                    isConnected: true,
                    channel: targetChannel,
                  }
                : entry,
            ),
          );
        }

        toast({
          title: 'User connected',
          description: `${user.userId} joined #${targetChannel}.`,
        });
      } catch (error) {
        console.error('Failed to connect simulated user', error);
        toast({
          title: 'Connection failed',
          description: error instanceof Error ? error.message : 'Unable to connect simulated user.',
          variant: 'destructive',
        });
      }
    },
    [simulatedUsers, simulatedChannelTarget, toast],
  );

  return (
    <div className="space-y-8 p-6">
      <section>
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="grid min-w-0 gap-6 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.05fr)_minmax(240px,0.9fr)_minmax(0,1.05fr)]">
              <div className="flex min-w-0 flex-col gap-3">
                <div
                  className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${statusLabelTone}`}
                >
                  <Radio className="h-4 w-4" />
                  Channel Monitor
                </div>
                <label className="sr-only" htmlFor="presence-channel">
                  Channel to Monitor
                </label>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Input
                    id="presence-channel"
                    value={inputChannel}
                    onChange={(event) => setInputChannel(event.target.value)}
                    placeholder="Enter a PubNub channel"
                    className="sm:w-72"
                  />
                  <Button
                    type="button"
                    variant={isMonitoring ? 'destructive' : 'default'}
                    disabled={isMonitoring ? false : (!isReady || !isConnected || isLoading)}
                    onClick={isMonitoring ? handleDisconnect : handleConnect}
                    className="flex items-center gap-2"
                  >
                    {isMonitoring ? (
                      <>
                        <Square className="h-4 w-4" />
                        Disconnect
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        Connect
                      </>
                    )}
                  </Button>
                </div>
                {!isConnected && (
                  <div className="text-xs text-muted-foreground">
                    {connectionError ? (
                      <button
                        type="button"
                        onClick={reconnect}
                        className="underline underline-offset-4"
                      >
                        Unable to connect to PubNub. Tap to retry.
                      </button>
                    ) : (
                      'Connecting to PubNub...'
                    )}
                  </div>
                )}
                {formattedActiveChannel && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Monitoring <span className="font-semibold">#{formattedActiveChannel}</span>
                  </p>
                )}
              </div>

              <div className="flex min-w-0 flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3
                    className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${statusLabelTone}`}
                  >
                    <Activity className="h-4 w-4" />
                    Live Occupancy
                  </h3>
                </div>
                <div className="w-full rounded-xl border border-gray-200 bg-gray-50 px-6 py-5 text-center">
                  <div className="mt-2 text-4xl font-semibold text-pubnub-text">
                    {isMonitoring ? occupancy : '--'}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {isMonitoring ? 'Users currently joined' : 'Connect to begin streaming occupancy'}
                  </p>
                </div>
              </div>

              <div className="flex min-w-0 flex-col gap-3 lg:col-span-2 xl:col-span-1">
                <div
                  className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${statusLabelTone}`}
                >
                  <Users className="h-4 w-4" />
                  Connected Users
                </div>
                <div className="h-48 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3">
                  {sortedUUIDs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {isMonitoring
                        ? 'No active users at this moment.'
                        : 'Connect to start streaming presence updates.'}
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {sortedUUIDs.map((uuid) => {
                        const state = presenceStateByUuid[uuid];
                        return (
                          <li
                            key={uuid}
                            className="space-y-1 rounded-md border border-white/40 bg-white px-3 py-2 text-sm text-pubnub-text shadow-sm"
                          >
                            <div className="font-semibold">{uuid}</div>
                            {state ? (
                              <pre className="whitespace-pre-wrap break-words text-[11px] text-muted-foreground">
                                {JSON.stringify(state, null, 2)}
                              </pre>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
      <section>
        <Card className="shadow-sm">
          <CardContent className="flex flex-col gap-6 pt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Simulated Users
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Spin up lightweight clients to generate presence events on demand.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  onClick={createSimulatedUser}
                  disabled={isCreatingSimulatedUser || simulatedUsers.length >= MAX_SIMULATED_USERS}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  {isCreatingSimulatedUser
                    ? 'Adding…'
                    : simulatedUsers.length >= MAX_SIMULATED_USERS
                    ? 'Limit Reached'
                    : 'Add User'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={simulatedUsers.length === 0}
                  onClick={removeAllSimulatedUsers}
                  className="text-xs"
                >
                  Delete All
                </Button>
              </div>
            </div>
            {simulatedUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 text-gray-500">
                  <User className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-pubnub-text">No simulated users yet</p>
                  <p className="text-xs text-muted-foreground">
                    Tap &ldquo;Add User&rdquo; to create a new simulated client.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {simulatedUsers.map((user) => {
                  const isEditing = editingUserId === user.internalId;
                  const appliedState = presenceStateByUuid[user.userId] ?? null;
                  const hasAppliedState = appliedState && Object.keys(appliedState).length > 0;
                  const appliedStateText = appliedState ? JSON.stringify(appliedState, null, 2) : 'No state set';
                  const stateApplyDisabled = !user.isConnected || user.isUpdatingState;

                  return (
                    <div
                      key={user.internalId}
                      className="relative flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3 pr-7 text-left shadow-sm"
                    >
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="absolute right-1 top-1 h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => removeSimulatedUser(user.internalId)}
                        aria-label={`Remove ${user.userId}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full ${
                            user.isConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          <User className="h-5 w-5" />
                        </div>
                        {isEditing ? (
                          <div className="flex w-full flex-wrap items-center gap-2">
                            <Input
                              value={editingLabel}
                              onChange={(event) => setEditingLabel(event.target.value)}
                              className="h-8 min-w-[120px] flex-1 text-xs"
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                  event.preventDefault();
                                  commitSimulatedUserRename(user.internalId);
                                }
                              }}
                              autoFocus
                            />
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                className="text-xs"
                                onClick={() => commitSimulatedUserRename(user.internalId)}
                              >
                                Save
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="text-xs"
                                onClick={cancelSimulatedUserRename}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs font-semibold text-pubnub-text">
                            {user.userId}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-pubnub-text"
                              onClick={() => startSimulatedUserRename(user.internalId, user.userId)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {user.channel ? `#${user.channel}` : 'Not connected'}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={user.isConnected ? 'secondary' : 'default'}
                        className="flex w-full items-center justify-center gap-1 text-xs"
                        onClick={() => toggleSimulatedUserConnection(user.internalId)}
                        disabled={isEditing}
                      >
                        {user.isConnected ? (
                          <>
                            <Square className="h-3 w-3" />
                            Disconnect
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3" />
                            Connect
                          </>
                        )}
                      </Button>
                      <Accordion
                        type="single"
                        collapsible
                        className="w-full"
                        value={user.isStateExpanded ? 'presence-state' : ''}
                        onValueChange={(next) =>
                          setSimulatedUsers((previous) =>
                            previous.map((entry) =>
                              entry.internalId === user.internalId
                                ? { ...entry, isStateExpanded: next === 'presence-state' }
                                : entry,
                            ),
                          )
                        }
                      >
                        <AccordionItem value="presence-state">
                          <AccordionTrigger
                            className={`text-xs font-semibold uppercase tracking-wide ${
                              hasAppliedState ? 'text-emerald-600' : 'text-muted-foreground'
                            }`}
                          >
                            Presence State
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-2 text-xs pt-2">
                              <Textarea
                                value={user.stateDraft}
                                onChange={(event) => updateSimulatedUserStateDraft(user.internalId, event.target.value)}
                                className="h-24 text-xs"
                                disabled={user.isUpdatingState}
                              />
                              <div className="flex flex-wrap items-center gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => applySimulatedUserState(user.internalId)}
                                  disabled={stateApplyDisabled}
                                >
                                  {user.isUpdatingState ? 'Saving…' : 'Apply'}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateSimulatedUserStateDraft(user.internalId, '{}')}
                                  disabled={user.isUpdatingState}
                                >
                                  Reset
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    updateSimulatedUserStateDraft(
                                      user.internalId,
                                      JSON.stringify({ status: 'typing', battery: 33 }, null, 2),
                                    )
                                  }
                                  disabled={user.isUpdatingState}
                                >
                                  Example
                                </Button>
                              </div>
                              {user.lastStateError ? (
                                <p className="text-[11px] text-destructive">{user.lastStateError}</p>
                              ) : null}
                              {!user.isConnected && (
                                <p className="text-[10px] text-muted-foreground">
                                  Connect this user to apply state changes.
                                </p>
                              )}
                              <div className="space-y-1 rounded bg-slate-50 p-2">
                                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                  Applied State
                                </span>
                                <pre className="max-h-24 overflow-y-auto whitespace-pre-wrap break-words text-[11px] text-pubnub-text">
                                  {appliedStateText}
                                </pre>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
      <section>
        <Card className="shadow-sm">
          <CardContent className="flex flex-col gap-6 pt-6">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Presence REST calls
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Trigger on-demand presence APIs without affecting the live monitor.
              </p>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-lg border border-gray-200 bg-white px-3 py-3 text-xs space-y-2">
                <div className="flex items-center text-[10px] uppercase tracking-wide text-muted-foreground">
                  <span className="font-semibold text-pubnub-text/70">Here Now Snapshot</span>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Channel
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={hereNowChannel}
                        onChange={(event) => {
                          setHereNowChannel(event.target.value);
                          setIsHereNowChannelCustom(true);
                        }}
                        placeholder="Enter a channel"
                        className="h-8 text-xs"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={!snapshotChannel || !pubnub || isLoading}
                        onClick={async () => {
                          const channel = snapshotChannel.trim();
                          if (!channel) {
                            toast({
                              title: 'Channel name is required',
                              description: 'Enter a channel name before requesting Here Now.',
                              variant: 'destructive',
                            });
                            return;
                          }
                          await hydratePresenceFromHereNow(channel);
                        }}
                        className="whitespace-nowrap"
                      >
                        {isLoading ? 'Fetching…' : 'Here Now'}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2 text-[11px]">
                    {snapshotData ? (
                      <>
                        <p className="font-semibold text-pubnub-text">
                          [{snapshotData.timestamp ? new Date(snapshotData.timestamp).toLocaleTimeString() : '--'}] #
                          {snapshotData.channel} Occupancy: {snapshotData.occupancy}
                        </p>
                        {snapshotData.uuids.length > 0 ? (
                          <div className="space-y-1">
                            <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              Users
                            </span>
                            <div className="max-h-32 overflow-y-auto space-y-2">
                              {snapshotData.uuids.map((uuid) => {
                                const state = snapshotData.states[uuid] ?? null;
                                return (
                                  <div
                                    key={`snapshot-${uuid}`}
                                    className="space-y-1 rounded border border-gray-200 bg-white px-2 py-1 text-[11px]"
                                  >
                                    <div className="font-semibold text-pubnub-text">{uuid}</div>
                                    {state ? (
                                      <pre className="whitespace-pre-wrap break-words text-muted-foreground">
                                        {JSON.stringify(state, null, 2)}
                                      </pre>
                                    ) : (
                                      <p className="text-muted-foreground">No state</p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <p className="text-muted-foreground">No UUIDs returned.</p>
                        )}
                      </>
                    ) : (
                      <p className="text-muted-foreground">No snapshot captured.</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    disabled={hereNowHistory.length === 0}
                    onClick={() => setIsHistoryOpen(true)}
                  >
                    View JSON
                  </Button>
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white px-3 py-3 text-xs space-y-2">
                <div className="flex items-center text-[10px] uppercase tracking-wide text-muted-foreground">
                  <span className="font-semibold text-pubnub-text/70">Where Now Lookup</span>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      UUID
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={whereNowUuid}
                        onChange={(event) => {
                          setWhereNowUuid(event.target.value);
                          setIsWhereNowUuidCustom(true);
                        }}
                        placeholder="Enter a UUID"
                        className="h-8 text-xs"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={!whereNowTargetUuid || !pubnub || isWhereNowLoading}
                        onClick={async () => {
                          const uuid = whereNowTargetUuid.trim();
                          if (!uuid) {
                            toast({
                              title: 'UUID is required',
                              description: 'Enter a UUID before requesting Where Now.',
                              variant: 'destructive',
                            });
                            return;
                          }
                          await hydratePresenceFromWhereNow(uuid);
                        }}
                        className="whitespace-nowrap"
                      >
                        {isWhereNowLoading ? 'Fetching…' : 'Where Now'}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2 text-[11px]">
                    {whereNowSnapshot ? (
                      <>
                        <p className="font-semibold text-pubnub-text">
                          [{whereNowSnapshot.timestamp ? new Date(whereNowSnapshot.timestamp).toLocaleTimeString() : '--'}
                          ] UUID: {whereNowSnapshot.uuid} Channels: {whereNowSnapshot.channels.length}
                        </p>
                        {whereNowSnapshot.channels.length > 0 ? (
                          <div className="space-y-1">
                            <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              Channels
                            </span>
                            <div className="max-h-32 overflow-y-auto space-y-2">
                              {whereNowSnapshot.channels.map((channel) => {
                                const channelState = whereNowSnapshot.states[channel] ?? null;
                                return (
                                  <div
                                    key={`where-now-${channel}`}
                                    className="space-y-1 rounded border border-gray-200 bg-white px-2 py-1 text-[11px]"
                                  >
                                    <div className="font-semibold text-pubnub-text">#{channel}</div>
                                    {channelState ? (
                                      <pre className="whitespace-pre-wrap break-words text-muted-foreground">
                                        {JSON.stringify(channelState, null, 2)}
                                      </pre>
                                    ) : (
                                      <p className="text-muted-foreground">No state</p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <p className="text-muted-foreground">No channels returned.</p>
                        )}
                      </>
                    ) : (
                      <p className="text-muted-foreground">No lookup performed yet.</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    disabled={whereNowHistory.length === 0}
                    onClick={() => setIsWhereNowHistoryOpen(true)}
                  >
                    View JSON
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-h-[70vh] overflow-hidden sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Here Now history</DialogTitle>
            <DialogDescription>History of Here Now responses for this session.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[45vh] overflow-y-auto space-y-4 pr-1 text-sm">
            {hereNowHistory.length === 0 ? (
              <p className="text-muted-foreground">No Here Now calls recorded yet.</p>
            ) : (
              hereNowHistory.map((entry) => (
                <div key={entry.id} className="space-y-2 rounded border border-muted bg-muted/20 p-3">
                  <div className="text-xs font-semibold text-muted-foreground">
                    [{new Date(entry.timestamp).toLocaleTimeString()}] #{entry.channel} · Occupancy: {entry.occupancy}
                  </div>
                  <pre className="whitespace-pre-wrap break-words rounded bg-gray-950/90 p-3 text-[11px] text-gray-100">
                    {JSON.stringify(entry.raw, null, 2)}
                  </pre>
                </div>
              ))
            )}
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:justify-between">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={hereNowHistory.length === 0}
                  onClick={handleCopyHereNowHistory}
                >
                  Copy raw data
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={hereNowHistory.length === 0}
                  onClick={handleClearHereNowHistory}
                >
                  Clear
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsHistoryOpen(false)}
              >
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isWhereNowHistoryOpen} onOpenChange={setIsWhereNowHistoryOpen}>
        <DialogContent className="max-h-[70vh] overflow-hidden sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Where Now history</DialogTitle>
            <DialogDescription>History of Where Now responses for this session.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[45vh] overflow-y-auto space-y-4 pr-1 text-sm">
            {whereNowHistory.length === 0 ? (
              <p className="text-muted-foreground">No Where Now calls recorded yet.</p>
            ) : (
              whereNowHistory.map((entry) => (
                <div key={entry.id} className="space-y-2 rounded border border-muted bg-muted/20 p-3">
                  <div className="text-xs font-semibold text-muted-foreground">
                    [{new Date(entry.timestamp).toLocaleTimeString()}] UUID: {entry.uuid} · Channels:{' '}
                    {entry.channels.length}
                  </div>
                  <pre className="whitespace-pre-wrap break-words rounded bg-gray-950/90 p-3 text-[11px] text-gray-100">
                    {JSON.stringify(entry.raw, null, 2)}
                  </pre>
                </div>
              ))
            )}
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:justify-between">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={whereNowHistory.length === 0}
                  onClick={handleCopyWhereNowHistory}
                >
                  Copy raw data
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={whereNowHistory.length === 0}
                  onClick={handleClearWhereNowHistory}
                >
                  Clear
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsWhereNowHistoryOpen(false)}
              >
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
