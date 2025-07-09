import { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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


export default function PubNubPersistencePage() {
  const { toast } = useToast();
  const { setPageSettings, setConfigType } = useConfig();
  
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
  
  const [startTimestamp, setStartTimestamp] = useState('');
  const [endTimestamp, setEndTimestamp] = useState('');
  const [selectedTimezone, setSelectedTimezone] = useState('');
  
  // UI state
  const [channelHistories, setChannelHistories] = useState<ChannelHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMessageForDelete, setSelectedMessageForDelete] = useState<MessageDeleteRequest | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showMessageCountDialog, setShowMessageCountDialog] = useState(false);
  const [messageCounts, setMessageCounts] = useState<Record<string, number>>({});
  const [countLoading, setCountLoading] = useState(false);
  const [showFetchProgress, setShowFetchProgress] = useState(false);
  const [fetchProgress, setFetchProgress] = useState<FetchProgress>({
    current: 0,
    total: 0,
    currentChannel: '',
    currentBatch: 0,
    totalBatches: 0
  });

  // Initialize timezone
  useEffect(() => {
    // Get browser timezone
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setSelectedTimezone(browserTimezone);
  }, []);

  // Set config type for the config service
  useEffect(() => {
    setConfigType('PERSISTENCE');
    
    // Initialize page settings
    setPageSettings({
      persistence: settings,
      configForSaving: {
        channels: settings.selectedChannels.split(',').map(c => c.trim()).filter(c => c),
        timestamp: new Date().toISOString(),
      }
    });
  }, [setConfigType, setPageSettings]);
  
  // Create PersistenceAPI when PubNub instance is ready
  useEffect(() => {
    if (pubnub && isConnected) {
      setPersistenceAPI(new PersistenceAPI(pubnub));
    } else {
      setPersistenceAPI(null);
    }
  }, [pubnub, isConnected]);

  // Update page settings when form changes
  const updatePageSettings = () => {
    setPageSettings(prev => ({
      ...prev,
      persistence: settings,
      configForSaving: {
        channels: settings.selectedChannels.split(',').map(c => c.trim()).filter(c => c),
        timestamp: new Date().toISOString(),
      }
    }));
  };

  useEffect(() => {
    updatePageSettings();
  }, [settings, startTimestamp, endTimestamp, selectedTimezone]);

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

    const channels = settings.selectedChannels.split(',').map(c => c.trim()).filter(c => c);
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

    const channels = settings.selectedChannels.split(',').map(c => c.trim()).filter(c => c);
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
      const counts = await persistenceAPI.getMessageCounts(channels);
      setMessageCounts(counts);
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
        
        // Check if this is a Delete-From-History feature not enabled error
        if (errorMessage.includes('history Delete API') || errorMessage.includes('Storage Delete')) {
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
    <div className="p-6 h-full">
      <div className="max-w-7xl mx-auto h-full flex flex-col">
        {/* Header */}
        <div className="mb-6">
          <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Requirements:</strong> Message Persistence add-on must be enabled in your PubNub Admin Portal. 
              Messages are stored automatically when published with storeInHistory: true.
            </p>
          </div>
        </div>

        {/* Controls Panel */}
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
        />

        {/* Results Panel */}
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
      />

      <FetchProgressDialog
        open={showFetchProgress}
        progress={fetchProgress}
        selectedChannels={settings.selectedChannels}
        count={settings.count}
      />
    </div>
  );
}