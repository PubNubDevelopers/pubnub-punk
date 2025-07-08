import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Archive, 
  Clock, 
  Database, 
  Search, 
  Download, 
  Trash2, 
  RefreshCw, 
  Calendar, 
  MessageSquare, 
  Filter,
  ChevronDown,
  ChevronUp,
  Copy,
  AlertCircle,
  MoreVertical,
  Info,
  Zap,
  BarChart3,
  PlayCircle,
  Pause,
  History,
  Hash
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useConfig } from '@/contexts/config-context';
import { storage } from '@/lib/storage';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface HistoryMessage {
  message: any;
  timetoken: string;
  uuid?: string;
  meta?: any;
  messageType?: string;
  channel?: string;
}

interface ChannelHistory {
  channel: string;
  messages: HistoryMessage[];
  totalMessages: number;
  startTimetoken?: string;
  endTimetoken?: string;
}

// Field definitions for config management
const FIELD_DEFINITIONS = {
  'persistence.selectedChannels': { section: 'persistence', field: 'selectedChannels', type: 'string', default: 'hello_world' },
  'persistence.count': { section: 'persistence', field: 'count', type: 'number', default: 100 },
  'persistence.includeTimetoken': { section: 'persistence', field: 'includeTimetoken', type: 'boolean', default: true },
  'persistence.includeMeta': { section: 'persistence', field: 'includeMeta', type: 'boolean', default: false },
  'persistence.includeMessageActions': { section: 'persistence', field: 'includeMessageActions', type: 'boolean', default: false },
  'persistence.includeUUID': { section: 'persistence', field: 'includeUUID', type: 'boolean', default: true },
  'persistence.reverse': { section: 'persistence', field: 'reverse', type: 'boolean', default: false },
  'persistence.startTimetoken': { section: 'persistence', field: 'startTimetoken', type: 'string', default: '' },
  'persistence.endTimetoken': { section: 'persistence', field: 'endTimetoken', type: 'string', default: '' },
  'persistence.searchTerm': { section: 'persistence', field: 'searchTerm', type: 'string', default: '' },
  'persistence.showRawData': { section: 'persistence', field: 'showRawData', type: 'boolean', default: false },
} as const;

// Declare PubNub as a global variable from the CDN
declare global {
  interface Window {
    PubNub: any;
  }
}

export default function PubNubPersistencePage() {
  const { toast } = useToast();
  const { setPageSettings, setConfigType } = useConfig();
  
  // State for PubNub availability and instance
  const [mounted, setMounted] = useState(false);
  const [pubnubReady, setPubnubReady] = useState(false);
  const [pubnub, setPubnub] = useState<any>(null);
  
  // Common timezones list
  const commonTimezones = [
    'UTC',
    'America/New_York',
    'America/Chicago', 
    'America/Denver',
    'America/Los_Angeles',
    'America/Toronto',
    'America/Vancouver',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Madrid',
    'Europe/Rome',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Kolkata',
    'Asia/Dubai',
    'Australia/Sydney',
    'Australia/Melbourne',
    'Pacific/Auckland'
  ];

  // Mount check and timezone initialization
  useEffect(() => {
    setMounted(true);
    // Get browser timezone
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setSelectedTimezone(browserTimezone);
  }, []);

  // Set config type for the config service
  useEffect(() => {
    setConfigType('PERSISTENCE');
    
    // Initialize page settings
    setPageSettings({
      persistence: {
        selectedChannels: FIELD_DEFINITIONS['persistence.selectedChannels'].default,
        count: FIELD_DEFINITIONS['persistence.count'].default,
        includeTimetoken: FIELD_DEFINITIONS['persistence.includeTimetoken'].default,
        includeMeta: FIELD_DEFINITIONS['persistence.includeMeta'].default,
        includeMessageActions: FIELD_DEFINITIONS['persistence.includeMessageActions'].default,
        includeUUID: FIELD_DEFINITIONS['persistence.includeUUID'].default,
        reverse: FIELD_DEFINITIONS['persistence.reverse'].default,
        startTimetoken: FIELD_DEFINITIONS['persistence.startTimetoken'].default,
        endTimetoken: FIELD_DEFINITIONS['persistence.endTimetoken'].default,
        searchTerm: FIELD_DEFINITIONS['persistence.searchTerm'].default,
        showRawData: FIELD_DEFINITIONS['persistence.showRawData'].default,
      },
      configForSaving: {
        channels: [FIELD_DEFINITIONS['persistence.selectedChannels'].default],
        timestamp: new Date().toISOString(),
      }
    });
  }, [setConfigType, setPageSettings]);
  
  // Check for PubNub availability on mount and create instance
  useEffect(() => {
    if (!mounted) return;
    
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max
    
    const checkPubNub = () => {
      if (typeof window !== 'undefined' && window.PubNub) {
        setPubnubReady(true);
        
        // Create PubNub instance now that SDK is loaded
        try {
          const settings = storage.getSettings();
          if (settings?.credentials?.publishKey && settings?.credentials?.subscribeKey) {
            const pubnubConfig: any = {
              publishKey: settings.credentials.publishKey,
              subscribeKey: settings.credentials.subscribeKey,
              userId: settings.credentials.userId || 'persistence-manager-user'
            };
            
            // Add PAM token if available
            if (settings.credentials.pamToken) {
              pubnubConfig.authKey = settings.credentials.pamToken;
            }
            
            const instance = new window.PubNub(pubnubConfig);
            setPubnub(instance);
          }
        } catch (error) {
          console.error('Failed to create PubNub instance:', error);
          // Continue anyway - user will see configuration required message
        }
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(checkPubNub, 100);
      } else {
        // Timeout - show as ready but PubNub will be null
        console.warn('PubNub SDK failed to load after 5 seconds');
        setPubnubReady(true);
      }
    };
    
    checkPubNub();
  }, [mounted]);
  
  // Form state
  const [selectedChannels, setSelectedChannels] = useState('hello_world');
  const [count, setCount] = useState(100);
  const [includeTimetoken, setIncludeTimetoken] = useState(true);
  const [includeMeta, setIncludeMeta] = useState(false);
  const [includeMessageActions, setIncludeMessageActions] = useState(false);
  const [includeUUID, setIncludeUUID] = useState(true);
  const [reverse, setReverse] = useState(false);
  const [startTimetoken, setStartTimetoken] = useState('');
  const [endTimetoken, setEndTimetoken] = useState('');
  const [startTimestamp, setStartTimestamp] = useState('');
  const [endTimestamp, setEndTimestamp] = useState('');
  const [selectedTimezone, setSelectedTimezone] = useState('');
  
  // UI state
  const [channelHistories, setChannelHistories] = useState<ChannelHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showRawData, setShowRawData] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [selectedMessageForDelete, setSelectedMessageForDelete] = useState<{channel: string, timetoken: string} | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showMessageCountDialog, setShowMessageCountDialog] = useState(false);
  const [messageCounts, setMessageCounts] = useState<Record<string, number>>({});
  const [countLoading, setCountLoading] = useState(false);
  const [showFetchProgress, setShowFetchProgress] = useState(false);
  const [fetchProgress, setFetchProgress] = useState<{
    current: number;
    total: number;
    currentChannel: string;
    currentBatch: number;
    totalBatches: number;
  }>({ current: 0, total: 0, currentChannel: '', currentBatch: 0, totalBatches: 0 });
  
  // Update page settings when form changes
  const updatePageSettings = () => {
    setPageSettings(prev => ({
      ...prev,
      persistence: {
        selectedChannels,
        count,
        includeTimetoken,
        includeMeta,
        includeMessageActions,
        includeUUID,
        reverse,
        startTimetoken,
        endTimetoken,
        searchTerm,
        showRawData,
      },
      configForSaving: {
        channels: selectedChannels.split(',').map(c => c.trim()).filter(c => c),
        timestamp: new Date().toISOString(),
      }
    }));
  };

  useEffect(() => {
    updatePageSettings();
  }, [selectedChannels, count, includeTimetoken, includeMeta, includeMessageActions, includeUUID, reverse, startTimetoken, endTimetoken, startTimestamp, endTimestamp, selectedTimezone, searchTerm, showRawData]);

  // Format timetoken for display
  const formatTimetoken = (timetoken: string) => {
    try {
      const timestamp = Math.floor(parseInt(timetoken) / 10000); // Convert to milliseconds
      return new Date(timestamp).toLocaleString();
    } catch {
      return timetoken;
    }
  };

  // Convert timetoken to datetime-local format for input (in selected timezone)
  const timetokenToDatetimeLocal = (timetoken: string) => {
    if (!timetoken || !selectedTimezone) return '';
    try {
      console.log('Converting timetoken to timestamp:', { timetoken, timezone: selectedTimezone });
      
      const timestamp = Math.floor(parseInt(timetoken) / 10000); // Convert to milliseconds
      if (isNaN(timestamp)) {
        console.error('Invalid timetoken:', timetoken);
        return '';
      }
      
      const utcDate = new Date(timestamp);
      console.log('UTC date:', utcDate);
      
      // Convert UTC date to selected timezone
      const formatter = new Intl.DateTimeFormat('sv-SE', {
        timeZone: selectedTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      const parts = formatter.formatToParts(utcDate);
      const formatted = `${parts.find(p => p.type === 'year')?.value}-${parts.find(p => p.type === 'month')?.value}-${parts.find(p => p.type === 'day')?.value}T${parts.find(p => p.type === 'hour')?.value}:${parts.find(p => p.type === 'minute')?.value}:${parts.find(p => p.type === 'second')?.value}`;
      
      console.log('Formatted result:', formatted);
      return formatted;
    } catch (error) {
      console.error('Timetoken conversion error:', error);
      return '';
    }
  };

  // Convert datetime-local format to timetoken (treating input as selected timezone, converting to UTC)
  const datetimeLocalToTimetoken = (datetimeLocal: string) => {
    if (!datetimeLocal || !selectedTimezone) {
      console.log('Missing required params:', { datetimeLocal, selectedTimezone });
      return '';
    }
    
    try {
      console.log('Converting timestamp to timetoken:', { input: datetimeLocal, timezone: selectedTimezone });
      
      // BULLETPROOF APPROACH: Use the browser's built-in timezone conversion
      // Step 1: Parse the components
      const [datePart, timePart] = datetimeLocal.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hour, minute, second = 0] = timePart.split(':').map(Number);
      
      console.log('Parsed components:', { year, month, day, hour, minute, second });
      
      // Step 2: Create the date string in a format that includes timezone
      // Use the browser's Intl API to construct a proper date
      
      // Create a temporary date to work with
      const tempLocalDate = new Date(year, month - 1, day, hour, minute, second);
      console.log('Temp local date:', tempLocalDate.toISOString());
      
      // The key insight: we need to find what UTC time would display as our input time in the target timezone
      // We'll use binary search or direct calculation
      
      // Method: Use Intl.DateTimeFormat to format a known UTC time in the target timezone
      // Then find the UTC time that produces our desired target timezone display
      
      // Start with the local interpretation and adjust
      let utcCandidate = tempLocalDate.getTime();
      
      // Test what this UTC time looks like in the target timezone
      const formatter = new Intl.DateTimeFormat('sv-SE', {
        timeZone: selectedTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      const targetDisplay = formatter.format(new Date(utcCandidate));
      const expectedDisplay = `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`;
      
      console.log('Target display:', targetDisplay);
      console.log('Expected display:', expectedDisplay);
      
      // If they don't match, we need to adjust
      if (targetDisplay !== expectedDisplay) {
        // Calculate the difference and adjust
        const displayedDate = new Date(targetDisplay.replace(' ', 'T'));
        const expectedDate = new Date(expectedDisplay.replace(' ', 'T'));
        const diff = expectedDate.getTime() - displayedDate.getTime();
        
        utcCandidate += diff;
        
        console.log('Applied correction of', diff / 1000 / 3600, 'hours');
      }
      
      console.log('Final UTC candidate:', new Date(utcCandidate).toISOString());
      
      // Verify our result
      const verification = formatter.format(new Date(utcCandidate));
      console.log('Verification - this UTC time displays as:', verification, 'in', selectedTimezone);
      
      // Convert to PubNub timetoken (microseconds * 10)
      const timetoken = (utcCandidate * 10000).toString();
      console.log('Generated timetoken:', timetoken);
      
      return timetoken;
    } catch (error) {
      console.error('Timezone conversion error:', error);
      return '';
    }
  };

  // Handle timestamp input changes
  const handleStartTimestampChange = (timestamp: string) => {
    console.log('handleStartTimestampChange called with:', timestamp);
    setStartTimestamp(timestamp);
    const timetoken = datetimeLocalToTimetoken(timestamp);
    console.log('Generated start timetoken:', timetoken);
    console.log('Original start timetoken was:', startTimetoken);
    console.log('Timetoken difference:', timetoken ? (parseInt(timetoken) - parseInt(startTimetoken || '0')) / 10000 / 1000 / 3600 : 'N/A', 'hours');
    setStartTimetoken(timetoken);
  };

  const handleEndTimestampChange = (timestamp: string) => {
    console.log('handleEndTimestampChange called with:', timestamp);
    setEndTimestamp(timestamp);
    const timetoken = datetimeLocalToTimetoken(timestamp);
    console.log('Generated end timetoken:', timetoken);
    setEndTimetoken(timetoken);
  };

  // Handle timetoken input changes
  const handleStartTimetokenChange = (timetoken: string) => {
    console.log('handleStartTimetokenChange called with:', timetoken);
    setStartTimetoken(timetoken);
    const timestamp = timetokenToDatetimeLocal(timetoken);
    console.log('Generated start timestamp:', timestamp);
    setStartTimestamp(timestamp);
  };

  const handleEndTimetokenChange = (timetoken: string) => {
    console.log('handleEndTimetokenChange called with:', timetoken);
    setEndTimetoken(timetoken);
    const timestamp = timetokenToDatetimeLocal(timetoken);
    console.log('Generated end timestamp:', timestamp);
    setEndTimestamp(timestamp);
  };

  // Handle timezone changes - update timestamp displays
  const handleTimezoneChange = (timezone: string) => {
    setSelectedTimezone(timezone);
    // Re-convert existing timetokens to new timezone
    if (startTimetoken) {
      const newStartTimestamp = timetokenToDatetimeLocal(startTimetoken);
      setStartTimestamp(newStartTimestamp);
    }
    if (endTimetoken) {
      const newEndTimestamp = timetokenToDatetimeLocal(endTimetoken);
      setEndTimestamp(newEndTimestamp);
    }
  };

  // Update timestamps when timezone changes
  useEffect(() => {
    if (selectedTimezone && startTimetoken) {
      const newStartTimestamp = timetokenToDatetimeLocal(startTimetoken);
      setStartTimestamp(newStartTimestamp);
    }
    if (selectedTimezone && endTimetoken) {
      const newEndTimestamp = timetokenToDatetimeLocal(endTimetoken);
      setEndTimestamp(newEndTimestamp);
    }
  }, [selectedTimezone]);

  // Copy to clipboard function
  const copyToClipboard = async (text: string, description: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${description} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  // Fetch message history with iterative requests for large counts
  const fetchHistory = async () => {
    if (!pubnub) {
      toast({
        title: "Configuration Required",
        description: "Please configure your PubNub keys in Settings first.",
        variant: "destructive",
      });
      return;
    }

    const channels = selectedChannels.split(',').map(c => c.trim()).filter(c => c);
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
    if (count > 100) {
      setShowFetchProgress(true);
      setFetchProgress({
        current: 0,
        total: count * channels.length,
        currentChannel: '',
        currentBatch: 0,
        totalBatches: Math.ceil(count / 100) * channels.length
      });
    }
    
    const newChannelHistories: ChannelHistory[] = [];

    try {
      for (let channelIndex = 0; channelIndex < channels.length; channelIndex++) {
        const channel = channels[channelIndex];
        try {
          const allMessages: HistoryMessage[] = [];
          let currentStart = startTimetoken || undefined;
          let currentEnd = endTimetoken || undefined;
          let remainingCount = count;
          let iterationCount = 0;
          const maxIterations = Math.ceil(count / 100); // Safety limit

          console.log(`Fetching ${count} messages for channel ${channel}`);

          // Update progress for current channel
          if (count > 100) {
            setFetchProgress(prev => ({
              ...prev,
              currentChannel: channel,
              currentBatch: 0,
              totalBatches: Math.ceil(count / 100)
            }));
          }

          // Iterate through multiple API calls if count > 100
          const seen = new Set<string>(); // Deduplication set
          
          while (remainingCount > 0 && iterationCount < maxIterations) {
            const batchSize = Math.min(remainingCount, 100); // API limit is 100
            
            const params: any = {
              channels: [channel],
              count: batchSize,
              includeTimetoken,
              includeMeta,
              includeUUID,
              includeMessageActions: includeMessageActions && channels.length === 1, // Only single channel
              reverse,
            };

            // Add time range if specified
            if (currentStart) {
              params.start = currentStart;
            }
            if (currentEnd) {
              params.end = currentEnd;
            }
            
            console.log(`Iteration ${iterationCount + 1}: Fetching ${batchSize} messages with params:`, params);

            const result = await pubnub.fetchMessages(params);
            console.log(`Iteration ${iterationCount + 1} result:`, result);

            const channelData = result.channels && result.channels[channel] ? result.channels[channel] : [];
            
            console.log(`Iteration ${iterationCount + 1}: Received ${channelData.length} messages`);
            
            // If no messages returned, stop immediately
            if (channelData.length === 0) {
              console.log('No messages returned from API, stopping iteration');
              break;
            }

            let batchMessages: HistoryMessage[] = channelData.map((item: any) => ({
              message: item.message,
              timetoken: item.timetoken,
              uuid: item.uuid,
              meta: item.meta,
              messageType: item.messageType,
              channel: channel,
            }));

            console.log(`Iteration ${iterationCount + 1}: Mapped ${batchMessages.length} messages to internal format`);

            // Add messages to collection with deduplication
            for (const msg of batchMessages) {
              if (!seen.has(msg.timetoken)) {
                allMessages.push(msg);
                seen.add(msg.timetoken);
              }
            }
            
            remainingCount = count - allMessages.length;
            iterationCount++;
            
            console.log(`After iteration ${iterationCount}: allMessages.length = ${allMessages.length}, remainingCount = ${remainingCount}`);
            
            // Update progress
            if (count > 100) {
              setFetchProgress(prev => ({
                ...prev,
                current: allMessages.length + (channelIndex * count),
                currentBatch: iterationCount,
                totalBatches: Math.ceil(count / 100)
              }));
            }
            
            // Apply the fix: strict, parameter-aware pagination
            if (batchMessages.length > 0) {
              const oldest = BigInt(batchMessages[0].timetoken);
              const newest = BigInt(batchMessages[batchMessages.length - 1].timetoken);
              
              if (!startTimetoken && !endTimetoken) {
                // No boundaries: walk back in time
                currentEnd = (oldest - 1n).toString();
                console.log(`No boundaries mode: Setting end to ${currentEnd} for next batch`);
              } else if (startTimetoken && !endTimetoken) {
                // Start only: walk forward
                currentStart = (newest + 1n).toString();
                console.log(`Start-only mode: Setting start to ${currentStart} for next batch`);
              } else if (!startTimetoken && endTimetoken) {
                // End only: walk back
                currentEnd = (oldest - 1n).toString();
                console.log(`End-only mode: Setting end to ${currentEnd} for next batch`);
              } else {
                // Bounded window: walk forward until we hit or pass the user's end
                const nextStart = newest + 1n;
                if (nextStart >= BigInt(endTimetoken)) {
                  console.log(`Range complete: nextStart ${nextStart} >= endTimetoken ${endTimetoken}`);
                  break;
                }
                currentStart = nextStart.toString();
                console.log(`Bounded mode: Setting start to ${currentStart} for next batch`);
              }
            } else {
              console.log('No messages in batch, stopping iteration');
              break;
            }

            // If we got fewer messages than requested, we've reached the end
            if (batchMessages.length < batchSize) {
              console.log(`Received ${batchMessages.length} messages, requested ${batchSize}. End of available messages.`);
              break;
            }
            
            // Small delay between requests to be respectful to the API
            if (remainingCount > 0) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }

          console.log(`Completed fetching for ${channel}. Total messages: ${allMessages.length}`);

          newChannelHistories.push({
            channel,
            messages: allMessages,
            totalMessages: allMessages.length,
            startTimetoken: allMessages.length > 0 ? allMessages[allMessages.length - 1].timetoken : undefined,
            endTimetoken: allMessages.length > 0 ? allMessages[0].timetoken : undefined,
          });

        } catch (error) {
          console.error(`Error fetching history for channel ${channel}:`, error);
          toast({
            title: `Error for channel ${channel}`,
            description: error instanceof Error ? error.message : "Failed to fetch history",
            variant: "destructive",
          });
          
          // Still add empty entry to show the channel was attempted
          newChannelHistories.push({
            channel,
            messages: [],
            totalMessages: 0,
          });
        }
      }

      setChannelHistories(newChannelHistories);
      
      const totalMessages = newChannelHistories.reduce((sum, ch) => sum + ch.totalMessages, 0);
      toast({
        title: "History Fetched",
        description: `Retrieved ${totalMessages} messages from ${channels.length} channel${channels.length !== 1 ? 's' : ''}${count > 100 ? ` (using ${Math.ceil(count / 100)} API calls per channel)` : ''}`,
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
    if (!pubnub) {
      toast({
        title: "Configuration Required",
        description: "Please configure your PubNub keys in Settings first.",
        variant: "destructive",
      });
      return;
    }

    const channels = selectedChannels.split(',').map(c => c.trim()).filter(c => c);
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
      // Use a recent timetoken as baseline (last 30 days)
      const thirtyDaysAgo = (Date.now() - 30 * 24 * 60 * 60 * 1000) * 10000; // Convert to PubNub timetoken
      
      const result = await pubnub.messageCounts({
        channels: channels,
        channelTimetokens: [thirtyDaysAgo.toString()]
      });

      setMessageCounts(result.channels || {});
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
  const deleteMessages = async () => {
    if (!pubnub || !selectedMessageForDelete) return;

    try {
      const { channel, timetoken } = selectedMessageForDelete;
      
      // For deleting a specific message, we use the timetoken as both start and end
      // with start being timetoken-1 (exclusive) and end being timetoken (inclusive)
      const startTT = (BigInt(timetoken) - BigInt(1)).toString();
      
      await pubnub.deleteMessages({
        channel: channel,
        start: startTT,
        end: timetoken
      });

      toast({
        title: "Message Deleted",
        description: `Successfully deleted message from ${channel}`,
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
                <p className="text-xs">Note: This also requires Storage & Playback to be enabled.</p>
              </div>
            ),
            variant: "destructive",
            duration: 8000, // Show longer since this is important information
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

  // Filter messages based on search term
  const filteredHistories = useMemo(() => {
    if (!searchTerm) return channelHistories;
    
    return channelHistories.map(history => ({
      ...history,
      messages: history.messages.filter(msg => {
        const messageStr = JSON.stringify(msg.message).toLowerCase();
        const uuidStr = (msg.uuid || '').toLowerCase();
        const metaStr = msg.meta ? JSON.stringify(msg.meta).toLowerCase() : '';
        const search = searchTerm.toLowerCase();
        
        return messageStr.includes(search) || 
               uuidStr.includes(search) || 
               metaStr.includes(search) ||
               msg.timetoken.includes(search);
      })
    }));
  }, [channelHistories, searchTerm]);

  // Show loading while mounting or PubNub is initializing
  if (!mounted || !pubnubReady) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <RefreshCw className="w-16 h-16 text-pubnub-blue mx-auto mb-4 animate-spin" />
            <h3 className="text-xl font-semibold mb-2">Loading PubNub Persistence Manager</h3>
            <p className="text-gray-600">
              {!mounted ? 'Starting up...' : 'Initializing PubNub SDK...'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // PubNub connection check
  if (!pubnub) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">PubNub Configuration Required</h3>
            <p className="text-gray-600">Please configure your PubNub keys in Settings to use Message Persistence</p>
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
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Message History Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="channels">Channels *</Label>
                <Input
                  id="channels"
                  placeholder="channel1, channel2"
                  value={selectedChannels}
                  onChange={(e) => setSelectedChannels(e.target.value)}
                />
                <p className="text-xs text-gray-500">Comma-separated channel names</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="count">Message Count</Label>
                <Select value={count.toString()} onValueChange={(value) => setCount(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="100">100 messages</SelectItem>
                    <SelectItem value="1000">1,000 messages</SelectItem>
                    <SelectItem value="10000">10,000 messages</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Message Order</Label>
                <div className="flex items-center space-x-2 pt-1">
                  <Switch
                    checked={reverse}
                    onCheckedChange={setReverse}
                  />
                  <span className="text-sm">{reverse ? 'Oldest First' : 'Newest First'}</span>
                </div>
              </div>

              <div className="flex items-end space-x-2">
                <Button
                  onClick={fetchHistory}
                  disabled={loading}
                  className="bg-pubnub-blue hover:bg-pubnub-blue/90 flex-1"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Fetching...
                    </>
                  ) : (
                    <>
                      <Archive className="w-4 h-4 mr-2" />
                      Fetch History
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Advanced Options */}
            <div>
              <Button 
                variant="outline" 
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className="w-full justify-between"
              >
                Advanced Options
                {showAdvancedOptions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              
              {showAdvancedOptions && (
                <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-lg">
                  {/* Timezone Selector */}
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Display Timezone</Label>
                    <Select value={selectedTimezone} onValueChange={handleTimezoneChange}>
                      <SelectTrigger className="w-full md:w-64">
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        {commonTimezones.map((tz) => (
                          <SelectItem key={tz} value={tz}>
                            {tz} {tz === selectedTimezone && '(Current)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      Times shown in {selectedTimezone || 'browser timezone'}. Timetokens are always UTC.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="start-timestamp">Start Time (Exclusive)</Label>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {selectedTimezone || 'Local'}
                        </span>
                      </div>
                      <Input
                        id="start-timestamp"
                        type="datetime-local"
                        value={startTimestamp}
                        onChange={(e) => handleStartTimestampChange(e.target.value)}
                        step="1"
                      />
                      <Label htmlFor="start-timetoken">Start Timetoken</Label>
                      <Input
                        id="start-timetoken"
                        placeholder="15123456789012345"
                        value={startTimetoken}
                        onChange={(e) => handleStartTimetokenChange(e.target.value)}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-gray-500">
                        Messages after this time/timetoken
                        <br />
                        <span className="text-blue-600">Timetoken is stored as UTC</span>
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="end-timestamp">End Time (Inclusive)</Label>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {selectedTimezone || 'Local'}
                        </span>
                      </div>
                      <Input
                        id="end-timestamp"
                        type="datetime-local"
                        value={endTimestamp}
                        onChange={(e) => handleEndTimestampChange(e.target.value)}
                        step="1"
                      />
                      <Label htmlFor="end-timetoken">End Timetoken</Label>
                      <Input
                        id="end-timetoken"
                        placeholder="15123456789012345"
                        value={endTimetoken}
                        onChange={(e) => handleEndTimetokenChange(e.target.value)}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-gray-500">
                        Messages up to this time/timetoken
                        <br />
                        <span className="text-blue-600">Timetoken is stored as UTC</span>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={includeTimetoken}
                        onCheckedChange={setIncludeTimetoken}
                      />
                      <Label className="text-sm">Include Timetoken</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={includeUUID}
                        onCheckedChange={setIncludeUUID}
                      />
                      <Label className="text-sm">Include UUID</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={includeMeta}
                        onCheckedChange={setIncludeMeta}
                      />
                      <Label className="text-sm">Include Metadata</Label>
                    </div>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={includeMessageActions}
                              onCheckedChange={setIncludeMessageActions}
                              disabled={selectedChannels.split(',').length > 1}
                            />
                            <Label className="text-sm">Message Actions</Label>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Only available for single channel queries</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      onClick={getMessageCounts}
                      disabled={countLoading}
                    >
                      {countLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Counting...
                        </>
                      ) : (
                        <>
                          <BarChart3 className="w-4 h-4 mr-2" />
                          Get Message Counts
                        </>
                      )}
                    </Button>

                    <div className="text-sm text-gray-500">
                      Use timetokens to fetch specific time ranges
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results Panel */}
        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Message History Results
                {filteredHistories.length > 0 && (
                  <span className="text-sm font-normal text-gray-500">
                    ({filteredHistories.reduce((sum, h) => sum + h.messages.length, 0)} messages)
                  </span>
                )}
              </CardTitle>
              
              <div className="flex items-center gap-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={showRawData}
                    onCheckedChange={setShowRawData}
                  />
                  <Label className="text-sm">Raw Data View</Label>
                </div>
                
                {filteredHistories.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const allMessages = filteredHistories.flatMap(h => h.messages);
                      copyToClipboard(JSON.stringify(allMessages, null, 2), 'All messages');
                    }}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy All
                  </Button>
                )}
              </div>
            </div>
            
            {filteredHistories.length > 0 && (
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search messages..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {searchTerm && (
                  <span className="text-sm text-gray-500">
                    {filteredHistories.reduce((sum, h) => sum + h.messages.length, 0)} of {channelHistories.reduce((sum, h) => sum + h.messages.length, 0)} messages shown
                  </span>
                )}
              </div>
            )}
          </CardHeader>
          
          <CardContent className="flex-1 overflow-y-auto">
            {filteredHistories.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Archive className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Message History</h3>
                  <p className="text-gray-500">
                    Enter channel names and click "Fetch History" to retrieve stored messages
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Information banner about message deletion requirements */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="space-y-2">
                      <h4 className="font-medium text-blue-900">Message Deletion Requirements</h4>
                      <p className="text-sm text-blue-700">
                        To delete messages from history, your PubNub account must have the <strong>Delete-From-History</strong> feature enabled. 
                        This can be configured in your PubNub Dashboard under your keyset settings.
                      </p>
                      <p className="text-xs text-blue-600">
                        Without this feature enabled, you'll receive a 403 error when attempting to delete messages.
                      </p>
                    </div>
                  </div>
                </div>
                
                {filteredHistories.map((history) => (
                  <div key={history.channel} className="space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Hash className="w-4 h-4" />
                        {history.channel}
                        <span className="text-sm font-normal text-gray-500">
                          ({history.messages.length} messages)
                        </span>
                      </h3>
                      
                      {history.messages.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Clock className="w-4 h-4" />
                          {formatTimetoken(history.messages[0].timetoken)} - {formatTimetoken(history.messages[history.messages.length - 1].timetoken)}
                        </div>
                      )}
                    </div>
                    
                    {history.messages.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No messages found for this channel
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {history.messages.map((msg, index) => (
                          <div key={`${msg.timetoken}-${index}`} className="bg-gray-50 rounded-lg p-4 border">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="mb-2 space-y-1">
                                  <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <Hash className="w-3 h-3" />
                                    <span className="font-mono">Timetoken: {msg.timetoken}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Clock className="w-3 h-3" />
                                    <span className="font-mono">{formatTimetoken(msg.timetoken)}</span>
                                    {msg.uuid && (
                                      <>
                                        <span>•</span>
                                        <span>UUID: {msg.uuid}</span>
                                      </>
                                    )}
                                    {msg.messageType && (
                                      <>
                                        <span>•</span>
                                        <span>Type: {msg.messageType}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                
                                {showRawData ? (
                                  <pre className="font-mono text-sm bg-white p-3 rounded border overflow-x-auto whitespace-pre-wrap">
                                    {JSON.stringify({
                                      message: msg.message,
                                      timetoken: msg.timetoken,
                                      uuid: msg.uuid,
                                      meta: msg.meta,
                                      messageType: msg.messageType,
                                    }, null, 2)}
                                  </pre>
                                ) : (
                                  <div className="space-y-2">
                                    <div className="bg-white p-3 rounded border">
                                      <div className="text-sm font-medium text-gray-700 mb-1">Message:</div>
                                      <pre className="font-mono text-sm overflow-x-auto whitespace-pre-wrap">
                                        {JSON.stringify(msg.message, null, 2)}
                                      </pre>
                                    </div>
                                    
                                    {msg.meta && (
                                      <div className="bg-blue-50 p-3 rounded border border-blue-200">
                                        <div className="text-sm font-medium text-blue-700 mb-1">Metadata:</div>
                                        <pre className="font-mono text-sm text-blue-600 overflow-x-auto whitespace-pre-wrap">
                                          {JSON.stringify(msg.meta, null, 2)}
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => copyToClipboard(JSON.stringify(msg, null, 2), 'Message')}
                                  >
                                    <Copy className="w-4 h-4 mr-2" />
                                    Copy Message
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => copyToClipboard(msg.timetoken, 'Timetoken')}
                                  >
                                    <Clock className="w-4 h-4 mr-2" />
                                    Copy Timetoken
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedMessageForDelete({
                                        channel: history.channel,
                                        timetoken: msg.timetoken
                                      });
                                      setShowDeleteDialog(true);
                                    }}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Message
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Message from History</DialogTitle>
            <DialogDescription>
              This will permanently delete the selected message from PubNub Message Persistence. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <div><strong>Channel:</strong> {selectedMessageForDelete?.channel}</div>
              <div><strong>Timetoken:</strong> {selectedMessageForDelete?.timetoken}</div>
              <div><strong>Timestamp:</strong> {selectedMessageForDelete?.timetoken && formatTimetoken(selectedMessageForDelete.timetoken)}</div>
            </div>
            
            <div className="bg-orange-50 border border-orange-200 rounded p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-orange-800">Requirements:</p>
                  <p className="text-orange-700">This operation requires <strong>Delete-From-History</strong> to be enabled in your PubNub Dashboard.</p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={deleteMessages} className="bg-red-600 hover:bg-red-700">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Message Counts Dialog */}
      <Dialog open={showMessageCountDialog} onOpenChange={setShowMessageCountDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Message Counts (Last 30 Days)</DialogTitle>
            <DialogDescription>
              Number of messages stored in each channel since 30 days ago
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {Object.entries(messageCounts).map(([channel, count]) => (
              <div key={channel} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="font-mono">#{channel}</span>
                <span className="font-semibold">{count.toLocaleString()} messages</span>
              </div>
            ))}
            {Object.keys(messageCounts).length === 0 && (
              <div className="text-center text-gray-500 py-4">
                No message count data available
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowMessageCountDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fetch Progress Dialog */}
      <Dialog open={showFetchProgress} onOpenChange={() => {}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fetching Message History</DialogTitle>
            <DialogDescription>
              Retrieving {count} messages from {selectedChannels.split(',').length} channel{selectedChannels.split(',').length !== 1 ? 's' : ''}...
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Progress</span>
                <span>{fetchProgress.current} of {fetchProgress.total} messages</span>
              </div>
              <Progress 
                value={(fetchProgress.current / fetchProgress.total) * 100} 
                className="w-full"
              />
            </div>
            
            {fetchProgress.currentChannel && (
              <div className="space-y-2">
                <div className="space-y-1">
                  <div className="text-sm font-medium">Current Channel:</div>
                  <div className="text-sm text-gray-600 font-mono">#{fetchProgress.currentChannel}</div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Batch Progress</span>
                    <span>{fetchProgress.currentBatch} of {fetchProgress.totalBatches} batches</span>
                  </div>
                  <Progress 
                    value={(fetchProgress.currentBatch / fetchProgress.totalBatches) * 100} 
                    className="w-full h-2"
                  />
                </div>
              </div>
            )}
            
            <div className="text-xs text-gray-500">
              Each batch fetches up to 100 messages due to API limitations.
            </div>
          </div>
          
          <DialogFooter>
            <div className="text-sm text-gray-500">
              Please do not close this window during the fetch operation.
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}