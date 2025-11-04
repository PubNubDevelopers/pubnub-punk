import { useState, useEffect, useMemo, useCallback } from 'react';
import { RefreshCw, AlertCircle, Hash, Plus, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useConfig } from '@/contexts/config-context';
import { usePubNub } from '@/hooks/usePubNub';
import { 
  ControlsPanel, 
  ResultsPanel, 
  DeleteMessageDialog, 
  MessageCountsDialog, 
  FetchProgressDialog 
} from '@/components/persistence';
import { PersistenceAPI } from '@/lib/persistence/api';
import { 
  timetokenToDatetimeLocal, 
  datetimeLocalToTimetoken, 
  copyToClipboard 
} from '@/lib/persistence/utils';
import { 
  ChannelHistory, 
  PersistenceSettings, 
  MessageDeleteRequest, 
  FetchProgress,
  FIELD_DEFINITIONS 
} from '@/types/persistence';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { storage } from '@/lib/storage';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const CHANNELS_STORAGE_KEY = 'persistence-managed-channels';

const ADVANCED_DEFAULTS = {
  includeTimetoken: FIELD_DEFINITIONS['persistence.includeTimetoken'].default as boolean,
  includeMeta: FIELD_DEFINITIONS['persistence.includeMeta'].default as boolean,
  includeMessageActions: FIELD_DEFINITIONS['persistence.includeMessageActions'].default as boolean,
  includeUUID: FIELD_DEFINITIONS['persistence.includeUUID'].default as boolean,
  reverse: FIELD_DEFINITIONS['persistence.reverse'].default as boolean,
  startTimetoken: FIELD_DEFINITIONS['persistence.startTimetoken'].default as string,
  endTimetoken: FIELD_DEFINITIONS['persistence.endTimetoken'].default as string,
} as const;


export default function PubNubPersistencePage() {
  const { toast } = useToast();
  const { setPageSettings, setConfigType } = useConfig();
  const [channelList, setChannelList] = useState<string[]>([]);
  const [showAddChannelDialog, setShowAddChannelDialog] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  
  // Use centralized PubNub connection manager
  const { pubnub, isReady: pubnubReady, connectionError, isConnected } = usePubNub({
    instanceId: 'pubnub-persistence',
    userId: 'persistence-manager-user',
    onConnectionError: (error) => {
      toast({
        title: "PubNub Connection Failed",
        description: error,
        variant: "destructive",
      });
    }
  });
  
  // State for PersistenceAPI
  const [persistenceAPI, setPersistenceAPI] = useState<PersistenceAPI | null>(null);
  
  // Form state
  const [settings, setSettings] = useState<PersistenceSettings>({
    selectedChannels: FIELD_DEFINITIONS['persistence.selectedChannels'].default as string,
    count: FIELD_DEFINITIONS['persistence.count'].default as number,
    includeTimetoken: FIELD_DEFINITIONS['persistence.includeTimetoken'].default as boolean,
    includeMeta: FIELD_DEFINITIONS['persistence.includeMeta'].default as boolean,
    includeMessageActions: FIELD_DEFINITIONS['persistence.includeMessageActions'].default as boolean,
    includeUUID: FIELD_DEFINITIONS['persistence.includeUUID'].default as boolean,
    reverse: FIELD_DEFINITIONS['persistence.reverse'].default as boolean,
    startTimetoken: FIELD_DEFINITIONS['persistence.startTimetoken'].default as string,
    endTimetoken: FIELD_DEFINITIONS['persistence.endTimetoken'].default as string,
    searchTerm: FIELD_DEFINITIONS['persistence.searchTerm'].default as string,
    showRawData: FIELD_DEFINITIONS['persistence.showRawData'].default as boolean,
  });
  const selectedChannelsArray = useMemo(() => {
    return settings.selectedChannels
      .split(',')
      .map((channel) => channel.trim())
      .filter((channel, index, arr) => channel && arr.indexOf(channel) === index);
  }, [settings.selectedChannels]);

  const updateSelectedChannels = useCallback((channels: string[]) => {
    const unique = Array.from(new Set(channels.map((channel) => channel.trim()).filter(Boolean)));
    setSettings((prev) => ({ ...prev, selectedChannels: unique.join(', ') }));
  }, [setSettings]);
  
  const [startTimestamp, setStartTimestamp] = useState('');
  const [endTimestamp, setEndTimestamp] = useState('');
  const [selectedTimezone, setSelectedTimezone] = useState('');
  const [defaultTimezone, setDefaultTimezone] = useState('');
  const [mounted, setMounted] = useState(false);
  
  // UI state
  const [channelHistories, setChannelHistories] = useState<ChannelHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMessageForDelete, setSelectedMessageForDelete] = useState<MessageDeleteRequest | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showMessageCountDialog, setShowMessageCountDialog] = useState(false);
  const [messageCounts, setMessageCounts] = useState<Record<string, number>>({});
  const [messageCountRange, setMessageCountRange] = useState<{ start?: string; end?: string; startTimetoken?: string; endTimetoken?: string }>({});
  const [countLoading, setCountLoading] = useState(false);
  const [showFetchProgress, setShowFetchProgress] = useState(false);
  const [fetchProgress, setFetchProgress] = useState<FetchProgress>({
    current: 0,
    total: 0,
    currentChannel: '',
    currentBatch: 0,
    totalBatches: 0
  });

  // Mount check
  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize channel list from localStorage or settings
  useEffect(() => {
    const storedChannels = storage.getItem<string[]>(CHANNELS_STORAGE_KEY) ?? [];
    if (storedChannels.length > 0) {
      setChannelList(storedChannels);
      const validSelection = selectedChannelsArray.filter((channel) => storedChannels.includes(channel));
      if (validSelection.length > 0) {
        updateSelectedChannels(validSelection);
      } else {
        updateSelectedChannels([storedChannels[0]]);
      }
    } else if (selectedChannelsArray.length > 0) {
      setChannelList(selectedChannelsArray);
      storage.setItem(CHANNELS_STORAGE_KEY, selectedChannelsArray);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist channel list whenever it changes
  useEffect(() => {
    if (channelList.length > 0) {
      storage.setItem(CHANNELS_STORAGE_KEY, channelList);
    } else {
      storage.removeItem(CHANNELS_STORAGE_KEY);
    }
  }, [channelList]);

  // Initialize timezone
  useEffect(() => {
    // Get browser timezone
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setSelectedTimezone(browserTimezone);
    setDefaultTimezone(browserTimezone);
  }, []);

  // Set config type for the config service
  useEffect(() => {
    setConfigType('PERSISTENCE');
  }, [setConfigType]);
  
  // Create PersistenceAPI when PubNub instance is ready
  useEffect(() => {
    if (pubnub && isConnected) {
      setPersistenceAPI(new PersistenceAPI(pubnub));
    } else {
      setPersistenceAPI(null);
    }
  }, [pubnub, isConnected]);

  // Sync page settings for persistence (matching new-persistence pattern)
  const pageSettings = useMemo(() => ({
    persistence: settings,
    ui: {
      startTimestamp,
      endTimestamp,
      selectedTimezone,
    },
    configForSaving: {
      channels: settings.selectedChannels.split(',').map(c => c.trim()).filter(c => c),
      count: settings.count,
      includeTimetoken: settings.includeTimetoken,
      includeMeta: settings.includeMeta,
      includeMessageActions: settings.includeMessageActions,
      includeUUID: settings.includeUUID,
      reverse: settings.reverse,
      startTimetoken: settings.startTimetoken,
      endTimetoken: settings.endTimetoken,
      searchTerm: settings.searchTerm,
      showRawData: settings.showRawData,
      startTimestamp,
      endTimestamp,
      selectedTimezone,
      timestamp: new Date().toISOString(),
    },
  }), [
    settings, startTimestamp, endTimestamp, selectedTimezone
  ]);

  // Update page settings when state changes
  useEffect(() => {
    if (mounted) {
      setPageSettings(pageSettings);
    }
  }, [pageSettings, setPageSettings, mounted]);

  const handleChannelToggle = (channel: string) => {
    const nextSet = new Set(selectedChannelsArray);
    if (nextSet.has(channel)) {
      nextSet.delete(channel);
    } else {
      nextSet.add(channel);
    }
    updateSelectedChannels(Array.from(nextSet));
  };

  const handleAddChannel = () => {
    const trimmed = newChannelName.trim();
    if (!trimmed) {
      toast({
        title: 'Channel name required',
        description: 'Enter a channel name to track history.',
        variant: 'destructive',
      });
      return;
    }

    if (channelList.includes(trimmed)) {
      toast({
        title: 'Channel already added',
        description: `${trimmed} is already in your channel list.`,
      });
      return;
    }

    const updatedList = [...channelList, trimmed];
    setChannelList(updatedList);
    updateSelectedChannels([...selectedChannelsArray, trimmed]);
    setNewChannelName('');
    setShowAddChannelDialog(false);
    toast({
      title: 'Channel added',
      description: `Added ${trimmed} to your channel list.`,
    });
  };

  const handleRemoveChannel = (channel: string) => {
    const updatedList = channelList.filter((item) => item !== channel);
    setChannelList(updatedList);
    const updatedSelection = selectedChannelsArray.filter((item) => item !== channel);
    if (updatedList.length > 0 && updatedSelection.length === 0) {
      updateSelectedChannels([updatedList[0]]);
    } else {
      updateSelectedChannels(updatedSelection);
    }
    toast({
      title: 'Channel removed',
      description: `${channel} removed from your local list.`,
    });
  };

  // Handle timestamp input changes
  const handleStartTimestampChange = (timestamp: string) => {
    console.log('handleStartTimestampChange called with:', timestamp);
    setStartTimestamp(timestamp);
    const timetoken = datetimeLocalToTimetoken(timestamp, selectedTimezone);
    console.log('Generated start timetoken:', timetoken);
    setSettings(prev => ({ ...prev, startTimetoken: timetoken }));
  };

  const handleEndTimestampChange = (timestamp: string) => {
    console.log('handleEndTimestampChange called with:', timestamp);
    setEndTimestamp(timestamp);
    const timetoken = datetimeLocalToTimetoken(timestamp, selectedTimezone);
    console.log('Generated end timetoken:', timetoken);
    setSettings(prev => ({ ...prev, endTimetoken: timetoken }));
  };

  // Handle timetoken input changes
  const handleStartTimetokenChange = (timetoken: string) => {
    console.log('handleStartTimetokenChange called with:', timetoken);
    setSettings(prev => ({ ...prev, startTimetoken: timetoken }));
    const timestamp = timetokenToDatetimeLocal(timetoken, selectedTimezone);
    console.log('Generated start timestamp:', timestamp);
    setStartTimestamp(timestamp);
  };

  const handleEndTimetokenChange = (timetoken: string) => {
    console.log('handleEndTimetokenChange called with:', timetoken);
    setSettings(prev => ({ ...prev, endTimetoken: timetoken }));
    const timestamp = timetokenToDatetimeLocal(timetoken, selectedTimezone);
    console.log('Generated end timestamp:', timestamp);
    setEndTimestamp(timestamp);
  };

  // Handle timezone changes - update timestamp displays
  const handleTimezoneChange = (timezone: string) => {
    setSelectedTimezone(timezone);
    // Re-convert existing timetokens to new timezone
    if (settings.startTimetoken) {
      const newStartTimestamp = timetokenToDatetimeLocal(settings.startTimetoken, timezone);
      setStartTimestamp(newStartTimestamp);
    }
    if (settings.endTimetoken) {
      const newEndTimestamp = timetokenToDatetimeLocal(settings.endTimetoken, timezone);
      setEndTimestamp(newEndTimestamp);
    }
  };

  const clearAdvancedOptions = useCallback(() => {
    setStartTimestamp('');
    setEndTimestamp('');
    setSettings((prev) => ({
      ...prev,
      includeTimetoken: ADVANCED_DEFAULTS.includeTimetoken,
      includeMeta: ADVANCED_DEFAULTS.includeMeta,
      includeMessageActions: ADVANCED_DEFAULTS.includeMessageActions,
      includeUUID: ADVANCED_DEFAULTS.includeUUID,
      reverse: ADVANCED_DEFAULTS.reverse,
      startTimetoken: ADVANCED_DEFAULTS.startTimetoken,
      endTimetoken: ADVANCED_DEFAULTS.endTimetoken,
    }));
    if (defaultTimezone) {
      setSelectedTimezone(defaultTimezone);
    }
    setMessageCountRange({});
  }, [defaultTimezone, setSelectedTimezone, setSettings, setMessageCountRange]);

  const advancedOptionsActive = useMemo(() => {
    const hasStartToken = settings.startTimetoken.trim().length > 0;
    const hasEndToken = settings.endTimetoken.trim().length > 0;
    const hasStartTimestamp = Boolean(startTimestamp);
    const hasEndTimestamp = Boolean(endTimestamp);
    const timezoneChanged = Boolean(defaultTimezone && selectedTimezone && defaultTimezone !== selectedTimezone);
    const togglesChanged =
      settings.includeTimetoken !== ADVANCED_DEFAULTS.includeTimetoken ||
      settings.includeMeta !== ADVANCED_DEFAULTS.includeMeta ||
      settings.includeMessageActions !== ADVANCED_DEFAULTS.includeMessageActions ||
      settings.includeUUID !== ADVANCED_DEFAULTS.includeUUID ||
      settings.reverse !== ADVANCED_DEFAULTS.reverse;

    return (
      hasStartToken ||
      hasEndToken ||
      hasStartTimestamp ||
      hasEndTimestamp ||
      timezoneChanged ||
      togglesChanged
    );
  }, [
    defaultTimezone,
    selectedTimezone,
    settings.endTimetoken,
    settings.includeMessageActions,
    settings.includeMeta,
    settings.includeTimetoken,
    settings.includeUUID,
    settings.reverse,
    settings.startTimetoken,
    startTimestamp,
    endTimestamp,
  ]);

  // Update timestamps when timezone changes
  useEffect(() => {
    if (selectedTimezone && settings.startTimetoken) {
      const newStartTimestamp = timetokenToDatetimeLocal(settings.startTimetoken, selectedTimezone);
      setStartTimestamp(newStartTimestamp);
    }
    if (selectedTimezone && settings.endTimetoken) {
      const newEndTimestamp = timetokenToDatetimeLocal(settings.endTimetoken, selectedTimezone);
      setEndTimestamp(newEndTimestamp);
    }
  }, [selectedTimezone]);

  // Fetch message history
  const fetchHistory = async () => {
    if (!persistenceAPI) {
      toast({
        title: "Configuration Required",
        description: "Please configure your PubNub keys in Settings first.",
        variant: "destructive",
      });
      return;
    }

    const channels = selectedChannelsArray;
    if (channels.length === 0) {
      toast({
        title: "Channels Required",
        description: "Please enter at least one channel.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    // Show progress dialog for large fetches (more than 100 messages)
    if (settings.count > 100) {
      setShowFetchProgress(true);
      setFetchProgress({
        current: 0,
        total: settings.count * channels.length,
        currentChannel: '',
        currentBatch: 0,
        totalBatches: Math.ceil(settings.count / 100) * channels.length
      });
    }

    try {
      const results = await persistenceAPI.fetchHistory(
        channels,
        settings.count,
        settings.startTimetoken || undefined,
        settings.endTimetoken || undefined,
        {
          includeTimetoken: settings.includeTimetoken,
          includeMeta: settings.includeMeta,
          includeUUID: settings.includeUUID,
          includeMessageActions: settings.includeMessageActions && channels.length === 1,
          reverse: settings.reverse,
        },
        (progress) => {
          if (settings.count > 100) {
            setFetchProgress(progress);
          }
        }
      );

      setChannelHistories(results);
      
      const totalMessages = results.reduce((sum, ch) => sum + ch.totalMessages, 0);
      toast({
        title: "History Fetched",
        description: `Retrieved ${totalMessages} messages from ${channels.length} channel${channels.length !== 1 ? 's' : ''}${settings.count > 100 ? ` (using ${Math.ceil(settings.count / 100)} API calls per channel)` : ''}`,
      });

    } catch (error) {
      console.error('Error fetching message history:', error);
      toast({
        title: "Fetch Failed",
        description: error instanceof Error ? error.message : "Failed to fetch message history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setShowFetchProgress(false);
    }
  };

  // Get message counts
  const getMessageCounts = async () => {
    if (!persistenceAPI) {
      toast({
        title: "Configuration Required",
        description: "Please configure your PubNub keys in Settings first.",
        variant: "destructive",
      });
      return;
    }

    const channels = selectedChannelsArray;
    if (channels.length === 0) {
      toast({
        title: "Channels Required",
        description: "Please enter at least one channel.",
        variant: "destructive",
      });
      return;
    }

    setCountLoading(true);
    try {
      const rangeTokens = {
        startTimetoken: settings.startTimetoken || undefined,
        endTimetoken: settings.endTimetoken || undefined,
      };

      const counts = await persistenceAPI.getMessageCounts(channels, rangeTokens);
      setMessageCounts(counts);
      const derivedRange = {
        start: startTimestamp || undefined,
        end: endTimestamp || undefined,
        startTimetoken: rangeTokens.startTimetoken,
        endTimetoken: rangeTokens.endTimetoken,
      };
      setMessageCountRange(derivedRange);
      setShowMessageCountDialog(true);
    } catch (error) {
      console.error('Error getting message counts:', error);
      toast({
        title: "Count Failed",
        description: error instanceof Error ? error.message : "Failed to get message counts",
        variant: "destructive",
      });
    } finally {
      setCountLoading(false);
    }
  };

  // Delete messages from history
  const deleteMessage = async () => {
    if (!persistenceAPI || !selectedMessageForDelete) return;

    try {
      await persistenceAPI.deleteMessage(
        selectedMessageForDelete.channel,
        selectedMessageForDelete.timetoken
      );

      toast({
        title: "Message Deleted",
        description: `Successfully deleted message from ${selectedMessageForDelete.channel}`,
      });

      // Refresh history
      await fetchHistory();

    } catch (error: any) {
      console.error('Error deleting message:', error);
      
      // Check for specific 403 error types
      if (error?.status === 403 || error?.statusCode === 403) {
        const errorMessage = error?.error_message || error?.message || '';
        const service = error?.service || '';
        const normalizedMessage = (errorMessage || '').toLowerCase();
        const payloadMessage = (error?.payload?.error || error?.payload?.message || '').toLowerCase();
        const errorKey = (error?.error || '').toLowerCase();
        const combinedMessage = `${normalizedMessage} ${payloadMessage} ${errorKey}`;
        
        // Check if this is a Delete-From-History feature not enabled error
        if (
          combinedMessage.includes('delete-from-history') ||
          combinedMessage.includes('delete from history') ||
          combinedMessage.includes('history delete api') ||
          combinedMessage.includes('storage:delete') ||
          combinedMessage.includes('history.delete') ||
          combinedMessage.includes('pnfeaturedisabled')
        ) {
          toast({
            title: "Delete-From-History Not Enabled",
            description: (
              <div className="space-y-2">
                <p>Message deletion requires the <strong>Delete-From-History</strong> feature to be enabled in your PubNub account.</p>
                <p>Please enable <strong>Delete-From-History</strong> in your <strong>PubNub Dashboard</strong> under your keyset settings.</p>
                <p className="text-xs">Note: This also requires Storage & Playbook to be enabled.</p>
              </div>
            ),
            variant: "destructive",
            duration: 8000,
          });
        } 
        // Check if this is an Access Manager permission error
        else if (service === 'Access Manager' || errorMessage.includes('Forbidden')) {
          const channels = error?.payload?.channels || [];
          const channelText = channels.length > 0 ? ` for channel(s): ${channels.join(', ')}` : '';
          
          toast({
            title: "Access Denied",
            description: (
              <div className="space-y-2">
                <p>You don't have permission to delete messages{channelText}.</p>
                <p>Please check your Access Manager token permissions or contact your administrator.</p>
              </div>
            ),
            variant: "destructive",
          });
        }
        // Generic 403 errors
        else {
          toast({
            title: "Permission Denied",
            description: errorMessage || "You don't have permission to perform this operation.",
            variant: "destructive",
          });
        }
      } else if (error?.status === 400 || error?.statusCode === 400) {
        toast({
          title: "Invalid Request", 
          description: error?.error_message || error?.message || "The delete request was invalid. Please check the timetoken and try again.",
          variant: "destructive",
        });
      } else if (error?.status === 404 || error?.statusCode === 404) {
        toast({
          title: "Message Not Found",
          description: "The message you're trying to delete was not found or may have already been deleted.",
          variant: "destructive",
        });
      } else if (error?.status >= 500 || error?.statusCode >= 500) {
        toast({
          title: "Server Error",
          description: "PubNub service is temporarily unavailable. Please try again later.",
          variant: "destructive",
        });
      } else {
        // Generic error handling for other types of errors
        toast({
          title: "Delete Failed",
          description: error?.error_message || error?.message || "Failed to delete message. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setSelectedMessageForDelete(null);
      setShowDeleteDialog(false);
    }
  };

  // Handle delete message request
  const handleDeleteMessage = (request: MessageDeleteRequest) => {
    setSelectedMessageForDelete(request);
    setShowDeleteDialog(true);
  };

  // Handle copy to clipboard
  const handleCopyToClipboard = async (text: string, description: string) => {
    await copyToClipboard(text, description, toast);
  };

  if (!mounted) {
    return null;
  }

  // Show loading while PubNub is initializing
  if (!pubnubReady) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <RefreshCw className="w-16 h-16 text-pubnub-blue mx-auto mb-4 animate-spin" />
            <h3 className="text-xl font-semibold mb-2">Loading PubNub Persistence Manager</h3>
            <p className="text-gray-600">Initializing PubNub SDK...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // PubNub connection check
  if (!pubnub || !isConnected) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {connectionError ? 'PubNub Connection Failed' : 'PubNub Configuration Required'}
            </h3>
            <p className="text-gray-600">
              {connectionError || 'Please configure your PubNub keys in Settings to use Message Persistence'}
            </p>
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Message Persistence must be enabled in your PubNub Admin Portal to store and retrieve messages.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 h-[calc(100vh-5rem)]">
      <div className="h-full flex gap-6 min-h-0">
        {/* Channel List Panel */}
        <div className="basis-1/5 min-w-[240px]">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="w-5 h-5" />
                Channel List
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <div className="flex justify-end mb-3">
                <Dialog open={showAddChannelDialog} onOpenChange={setShowAddChannelDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Channel
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Channel</DialogTitle>
                      <DialogDescription>
                        Add a channel to manage persistence queries locally.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                      <Input
                        value={newChannelName}
                        onChange={(e) => setNewChannelName(e.target.value)}
                        placeholder="channel-name"
                        autoFocus
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAddChannelDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddChannel}>Add Channel</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1">
                {channelList.length === 0 ? (
                  <div className="text-sm text-gray-500 p-4 border border-dashed rounded-lg text-center">
                    No channels saved yet. Click <span className="font-medium">Add Channel</span> to manage your history queries.
                  </div>
                ) : (
                  channelList.map((channel) => {
                    const isSelected = selectedChannelsArray.includes(channel);
                    return (
                      <div
                        key={channel}
                        className={`p-3 rounded border transition-colors cursor-pointer ${
                          isSelected ? 'bg-pubnub-blue text-white border-pubnub-blue' : 'border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => handleChannelToggle(channel)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Hash className={`w-4 h-4 ${isSelected ? 'text-blue-100' : 'text-gray-400'}`} />
                            <span className="font-mono text-sm truncate">{channel}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={isSelected ? 'text-blue-100 hover:text-red-200 hover:bg-blue-700/40' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleRemoveChannel(channel);
                            }}
                          >
                            <X className="w-4 h-4" />
                            <span className="sr-only">Remove channel</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <p className="text-xs text-gray-500 mt-4">
                Channels are stored locally in your browser. Select one or more channels to manage history queries.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Message History Controls Panel */}
        <div className="basis-2/5 min-w-[320px] flex flex-col gap-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900 leading-relaxed">
            <strong>Requirements:</strong> Message Persistence must be enabled in your PubNub Admin Portal.
          </div>
          <ControlsPanel
            settings={settings}
            onSettingsChange={(updates) => setSettings(prev => ({ ...prev, ...updates }))}
            selectedTimezone={selectedTimezone}
            onTimezoneChange={handleTimezoneChange}
            startTimestamp={startTimestamp}
            endTimestamp={endTimestamp}
            onStartTimestampChange={handleStartTimestampChange}
            onEndTimestampChange={handleEndTimestampChange}
            onStartTimetokenChange={handleStartTimetokenChange}
            onEndTimetokenChange={handleEndTimetokenChange}
            loading={loading}
            countLoading={countLoading}
            onFetchHistory={fetchHistory}
            onGetMessageCounts={getMessageCounts}
            channelsManagedExternally
            channelsHelperText="Select channels from the Channel List panel"
            selectedChannelsList={selectedChannelsArray}
            advancedOptionsActive={advancedOptionsActive}
            onClearAdvancedOptions={clearAdvancedOptions}
          />
        </div>

        {/* Message History Results Panel */}
        <div className="basis-2/5 min-w-[320px] flex flex-col min-h-0">
          <ResultsPanel
            channelHistories={channelHistories}
            searchTerm={settings.searchTerm}
            onSearchTermChange={(searchTerm) => setSettings(prev => ({ ...prev, searchTerm }))}
            showRawData={settings.showRawData}
            onShowRawDataChange={(showRawData) => setSettings(prev => ({ ...prev, showRawData }))}
            onCopyToClipboard={handleCopyToClipboard}
            onDeleteMessage={handleDeleteMessage}
          />
        </div>
      </div>

      {/* Dialogs */}
      <DeleteMessageDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        selectedMessage={selectedMessageForDelete}
        onConfirmDelete={deleteMessage}
      />

      <MessageCountsDialog
        open={showMessageCountDialog}
        onOpenChange={setShowMessageCountDialog}
        messageCounts={messageCounts}
        range={messageCountRange}
      />

      <FetchProgressDialog
        open={showFetchProgress}
        progress={fetchProgress}
        selectedChannels={selectedChannelsArray.join(', ')}
        count={settings.count}
      />
    </div>
  );
}
