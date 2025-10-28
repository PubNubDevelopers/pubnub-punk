import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Copy,
  MinusCircle,
  Users,
  Hash,
  Settings,
  X,
  ShieldAlert
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useConfig } from '@/contexts/config-context';
import { usePubNub } from '@/hooks/usePubNub';
import { storage } from '@/lib/storage';
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
import { Badge } from '@/components/ui/badge';

interface ChannelGroup {
  name: string;
  channels: string[];
}

const CHANNEL_GROUPS_STORAGE_KEY = 'channel-groups-list';

// Field definitions for config management
const FIELD_DEFINITIONS = {
  'channelGroups.groups': { section: 'channelGroups', field: 'groups', type: 'array', default: [] as ChannelGroup[] },
  'channelGroups.groupNames': { section: 'channelGroups', field: 'groupNames', type: 'array', default: [] as string[] },
  'channelGroups.selectedGroup': { section: 'channelGroups', field: 'selectedGroup', type: 'string', default: '' },
} as const;


export default function ChannelGroupsPage() {
  const { toast } = useToast();
  const { pageSettings, setPageSettings, setConfigType } = useConfig();
  
  // State for component mounting
  const [mounted, setMounted] = useState(false);
  
  const initialGroups = (pageSettings?.channelGroups?.groups as ChannelGroup[]) ?? [];
  const [channelGroups, setChannelGroups] = useState<ChannelGroup[]>(initialGroups);
  
  // Use centralized PubNub connection
  const { pubnub, isReady: pubnubReady, connectionError, isConnected } = usePubNub({
    instanceId: 'channel-groups',
    userId: 'channel-groups-manager-user',
    onConnectionError: (error) => {
      toast({
        title: "PubNub Connection Failed",
        description: error,
        variant: "destructive",
      });
    },
    onConnectionSuccess: () => {
      console.log('Channel Groups PubNub connection established');
    }
  });
  
  // Mount check
  useEffect(() => {
    setMounted(true);
  }, []);

  // Set config type for the config service
  useEffect(() => {
    setConfigType('CHANNEL_GROUPS');
    
    setPageSettings((prev: any) => {
      const storedGroupNames = storage.getItem<string[]>(CHANNEL_GROUPS_STORAGE_KEY) ?? [];
      const previousGroupsRaw = (prev?.channelGroups?.groups as any[]) ?? FIELD_DEFINITIONS['channelGroups.groups'].default;
      const sanitizedPreviousGroups: ChannelGroup[] = previousGroupsRaw
        .map((group) => ({
          name: typeof group?.name === 'string' ? group.name : '',
          channels: Array.isArray(group?.channels) ? group.channels.filter((c: unknown): c is string => typeof c === 'string') : []
        }))
        .filter((group) => group.name);
      const resolvedGroupNames = storedGroupNames.length > 0
        ? storedGroupNames
        : (prev?.channelGroups?.groupNames as string[]) ?? FIELD_DEFINITIONS['channelGroups.groupNames'].default;
      const resolvedSelected = prev?.channelGroups?.selectedGroup
        || resolvedGroupNames[0]
        || FIELD_DEFINITIONS['channelGroups.selectedGroup'].default;

      return {
        ...prev,
        channelGroups: {
          groups: sanitizedPreviousGroups,
          groupNames: resolvedGroupNames,
          selectedGroup: resolvedSelected,
        },
        configForSaving: {
          groups: sanitizedPreviousGroups,
          timestamp: new Date().toISOString(),
        }
      };
    });
  }, [setConfigType, setPageSettings]);
  
  // No longer need manual PubNub initialization - handled by usePubNub hook
  
  // State management
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAddChannelDialog, setShowAddChannelDialog] = useState(false);
  
  // Form state
  const [newGroupName, setNewGroupName] = useState('');
  const [channelsToAdd, setChannelsToAdd] = useState('');
  const [channelToAdd, setChannelToAdd] = useState('');
  const [showCreatePrompt, setShowCreatePrompt] = useState(false);
  const [pendingGroupName, setPendingGroupName] = useState<string | null>(null);

  const beginCreateFromPrompt = useCallback(() => {
    if (!pendingGroupName) {
      setShowCreatePrompt(false);
      return;
    }

    setNewGroupName(pendingGroupName);
    setChannelsToAdd('');
    setShowCreatePrompt(false);
    setShowCreateDialog(true);
    setPendingGroupName(null);
    setNewGroupToQuery('');
  }, [pendingGroupName]);

  // Update page settings helper
  const updateField = (path: string, value: any) => {
    const def = FIELD_DEFINITIONS[path as keyof typeof FIELD_DEFINITIONS];
    if (def) {
      setPageSettings((prev: any) => ({
        ...prev,
        [def.section]: {
          ...prev?.[def.section],
          [def.field]: value
        }
      }));
    }
  };

  // Load channel groups by name - PubNub doesn't provide a "list all" API
  // Users must specify which groups they want to query
  const [newGroupToQuery, setNewGroupToQuery] = useState('');
  const [showAddQueryDialog, setShowAddQueryDialog] = useState(false);

  const selectedGroup = (pageSettings?.channelGroups?.selectedGroup as string) || FIELD_DEFINITIONS['channelGroups.selectedGroup'].default;
  const groupNamesToQuery = Array.isArray(pageSettings?.channelGroups?.groupNames)
    ? (pageSettings?.channelGroups?.groupNames as string[])
    : FIELD_DEFINITIONS['channelGroups.groupNames'].default;

  useEffect(() => {
    const groupsFromSettings = (pageSettings?.channelGroups?.groups as any[]) ?? [];
    const sanitizedGroups: ChannelGroup[] = groupsFromSettings
      .map((group) => ({
        name: typeof group?.name === 'string' ? group.name : '',
        channels: Array.isArray(group?.channels) ? group.channels.filter((c: unknown): c is string => typeof c === 'string') : []
      }))
      .filter((group) => group.name);
    setChannelGroups(sanitizedGroups);
  }, [pageSettings?.channelGroups?.groups]);

  const persistGroupNames = useCallback(
    (nextGroupNames: string[], nextSelected?: string) => {
      const sanitized = nextGroupNames
        .map((name) => name.trim())
        .filter((name) => name.length > 0);
      const uniqueNames = Array.from(new Set(sanitized));

      const resolvedSelected = nextSelected !== undefined
        ? nextSelected
        : (uniqueNames.includes(selectedGroup) ? selectedGroup : uniqueNames[0] ?? '');

      if (uniqueNames.length > 0) {
        storage.setItem(CHANNEL_GROUPS_STORAGE_KEY, uniqueNames);
      } else {
        storage.removeItem(CHANNEL_GROUPS_STORAGE_KEY);
      }

      updateField('channelGroups.groupNames', uniqueNames);
      updateField('channelGroups.selectedGroup', resolvedSelected);
    },
    [selectedGroup, updateField]
  );

  const loadChannelGroups = useCallback(async () => {
    if (!pubnub) {
      return;
    }

    if (groupNamesToQuery.length === 0) {
      setChannelGroups([]);
      setPageSettings((prev: any) => ({
        ...prev,
        channelGroups: {
          ...(prev?.channelGroups ?? {}),
          groups: []
        },
        configForSaving: {
          groups: [],
          timestamp: new Date().toISOString(),
        }
      }));
      return;
    }

    setLoading(true);
    const verifiedGroups: ChannelGroup[] = [];
    
    try {
      // Query each group name to see if it exists and get its channels
      for (const groupName of groupNamesToQuery) {
        try {
          const result = await pubnub.channelGroups.listChannels({
            channelGroup: groupName
          });
          
          // Group exists, add it to our list
          verifiedGroups.push({
            name: groupName,
            channels: result.channels || []
          });
        } catch (error) {
          // Group doesn't exist or error occurred
          console.warn(`Channel group ${groupName} could not be loaded:`, error);
        }
      }
      
      setChannelGroups(verifiedGroups);
      // Update page settings without causing re-render loop
      setPageSettings((prev: any) => ({
        ...prev,
        channelGroups: {
          ...(prev?.channelGroups ?? {}),
          groups: verifiedGroups
        },
        configForSaving: {
          groups: verifiedGroups,
          timestamp: new Date().toISOString(),
        }
      }));
      
    } catch (error) {
      console.error('Error loading channel groups:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load channel groups";
      
      toast({
        title: "Error loading channel groups",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [pubnub, groupNamesToQuery, toast, setPageSettings]);

  // Create a new channel group
  const createChannelGroup = async () => {
    if (!pubnub || !newGroupName.trim()) return;

    const trimmedGroupName = newGroupName.trim();
    const channels = channelsToAdd.split(',').map(c => c.trim()).filter(c => c);
    
    if (channels.length === 0) {
      toast({
        title: "Channels Required",
        description: "Please enter at least one channel to add to the group.",
        variant: "destructive",
      });
      return;
    }

    if (channels.length > 200) {
      toast({
        title: "Too Many Channels",
        description: "Maximum 200 channels can be added per operation.",
        variant: "destructive",
      });
      return;
    }

    try {
      await pubnub.channelGroups.addChannels({
        channels: channels,
        channelGroup: trimmedGroupName
      });

      const newGroup: ChannelGroup = {
        name: trimmedGroupName,
        channels: channels
      };

      const updatedGroups = [...channelGroups, newGroup];
      setChannelGroups(updatedGroups);
      setPageSettings((prev: any) => ({
        ...prev,
        channelGroups: {
          ...(prev?.channelGroups ?? {}),
          groups: updatedGroups
        },
        configForSaving: {
          groups: updatedGroups,
          timestamp: new Date().toISOString(),
        }
      }));
      
      // Add this group to our query list if not already there
      if (!groupNamesToQuery.includes(trimmedGroupName)) {
        const newQueryList = [...groupNamesToQuery, trimmedGroupName];
        persistGroupNames(newQueryList, trimmedGroupName);
      } else {
        updateField('channelGroups.selectedGroup', trimmedGroupName);
      }

      toast({
        title: "Channel Group Created",
        description: `Successfully created channel group "${trimmedGroupName}" with ${channels.length} channels.`,
      });

      // Reset form
      setNewGroupName('');
      setChannelsToAdd('');
      setShowCreateDialog(false);

    } catch (error) {
      console.error('Error creating channel group:', error);
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create channel group",
        variant: "destructive",
      });
    }
  };

  // Add channel to existing group
  const addChannelToGroup = async (groupName: string) => {
    if (!pubnub || !channelToAdd.trim()) return;

    try {
      await pubnub.channelGroups.addChannels({
        channels: [channelToAdd.trim()],
        channelGroup: groupName
      });

      // Update local state
      const updatedGroups = channelGroups.map(group => {
        if (group.name === groupName) {
          const updatedChannels = [...group.channels, channelToAdd.trim()];
          return {
            ...group,
            channels: updatedChannels
          };
        }
        return group;
      });
      
      setChannelGroups(updatedGroups);
      setPageSettings((prev: any) => ({
        ...prev,
        channelGroups: {
          ...(prev?.channelGroups ?? {}),
          groups: updatedGroups
        },
        configForSaving: {
          groups: updatedGroups,
          timestamp: new Date().toISOString(),
        }
      }));

      toast({
        title: "Channel Added",
        description: `Successfully added "${channelToAdd}" to group "${groupName}".`,
      });

      setChannelToAdd('');
      setShowAddChannelDialog(false);

    } catch (error) {
      console.error('Error adding channel to group:', error);
      toast({
        title: "Failed to Add Channel",
        description: error instanceof Error ? error.message : "Failed to add channel to group",
        variant: "destructive",
      });
    }
  };

  // Remove channel from group
  const removeChannelFromGroup = async (groupName: string, channelName: string) => {
    if (!pubnub) return;

    try {
      await pubnub.channelGroups.removeChannels({
        channels: [channelName],
        channelGroup: groupName
      });

      // Update local state
      const updatedGroups = channelGroups.map(group => {
        if (group.name === groupName) {
          const updatedChannels = group.channels.filter(c => c !== channelName);
          return {
            ...group,
            channels: updatedChannels
          };
        }
        return group;
      });
      
      setChannelGroups(updatedGroups);
      setPageSettings((prev: any) => ({
        ...prev,
        channelGroups: {
          ...(prev?.channelGroups ?? {}),
          groups: updatedGroups
        },
        configForSaving: {
          groups: updatedGroups,
          timestamp: new Date().toISOString(),
        }
      }));

      toast({
        title: "Channel Removed",
        description: `Successfully removed "${channelName}" from group "${groupName}".`,
      });

    } catch (error) {
      console.error('Error removing channel from group:', error);
      toast({
        title: "Failed to Remove Channel",
        description: error instanceof Error ? error.message : "Failed to remove channel from group",
        variant: "destructive",
      });
    }
  };

  // Delete channel group
  const deleteChannelGroup = async (groupName: string) => {
    if (!pubnub) return;

    try {
      await pubnub.channelGroups.deleteGroup({
        channelGroup: groupName
      });

      // Update local state
      const updatedGroups = channelGroups.filter(group => group.name !== groupName);
      setChannelGroups(updatedGroups);
      setPageSettings((prev: any) => ({
        ...prev,
        channelGroups: {
          ...(prev?.channelGroups ?? {}),
          groups: updatedGroups
        },
        configForSaving: {
          groups: updatedGroups,
          timestamp: new Date().toISOString(),
        }
      }));
      
      // Remove from query list
      const updatedQueryList = groupNamesToQuery.filter(name => name !== groupName);
      const nextSelected = selectedGroup === groupName ? (updatedQueryList[0] ?? '') : selectedGroup;
      persistGroupNames(updatedQueryList, nextSelected);

      toast({
        title: "Channel Group Deleted",
        description: `Successfully deleted channel group "${groupName}".`,
      });

    } catch (error) {
      console.error('Error deleting channel group:', error);
      toast({
        title: "Failed to Delete Group",
        description: error instanceof Error ? error.message : "Failed to delete channel group",
        variant: "destructive",
      });
    }
  };

  const removeGroupFromList = (groupName: string) => {
    const filteredNames = groupNamesToQuery.filter(name => name !== groupName);
    const updatedGroups = channelGroups.filter(group => group.name !== groupName);
    const nextSelected = selectedGroup === groupName ? (filteredNames[0] ?? '') : selectedGroup;

    setChannelGroups(updatedGroups);
    setPageSettings((prev: any) => ({
      ...prev,
      channelGroups: {
        ...(prev?.channelGroups ?? {}),
        groups: updatedGroups
      },
      configForSaving: {
        groups: updatedGroups,
        timestamp: new Date().toISOString(),
      }
    }));

    persistGroupNames(filteredNames, nextSelected);

    toast({
      title: "Group removed",
      description: `Removed "${groupName}" from your local list. The channel group remains available in PubNub.`,
    });
  };

  const handleAddGroupToQuery = useCallback(
    async (groupName: string) => {
      const trimmed = groupName.trim();
      if (!trimmed) {
        return false;
      }

      if (!pubnub) {
        toast({
          title: 'PubNub not ready',
          description: 'Connect to PubNub before loading channel groups.',
          variant: 'destructive',
        });
        return false;
      }

      if (groupNamesToQuery.includes(trimmed)) {
        toast({
          title: "Group exists",
          description: `"${trimmed}" is already saved in your list.`,
        });
        return false;
      }

      try {
        const result = await pubnub.channelGroups.listChannels({
          channelGroup: trimmed
        });

        if (!Array.isArray(result.channels) || result.channels.length === 0) {
          setPendingGroupName(trimmed);
          setShowAddQueryDialog(false);
          setShowCreatePrompt(true);
          setNewGroupToQuery('');
          return false;
        }
      } catch (error) {
        setPendingGroupName(trimmed);
        setShowAddQueryDialog(false);
        setShowCreatePrompt(true);
        setNewGroupToQuery('');
        return false;
      }

      const nextGroups = [...groupNamesToQuery, trimmed];
      persistGroupNames(nextGroups, trimmed);

      toast({
        title: "Group added",
        description: `Added "${trimmed}" to your local list.`,
      });

      return true;
    },
    [groupNamesToQuery, persistGroupNames, toast, pubnub]
  );

  // Copy group configuration
  const copyGroupConfig = async (group: ChannelGroup) => {
    const config = {
      name: group.name,
      channels: group.channels
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
      toast({
        title: "Configuration Copied",
        description: "Channel group configuration copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy configuration to clipboard",
        variant: "destructive",
      });
    }
  };

  // Get selected group details
  const selectedGroupDetails = useMemo(() => {
    return channelGroups.find(group => group.name === selectedGroup);
  }, [channelGroups, selectedGroup]);

  // Load channel groups when component mounts or query list changes
  useEffect(() => {
    if (pubnub) {
      loadChannelGroups();
    }
  }, [pubnub, loadChannelGroups, groupNamesToQuery]);

  // Show loading while mounting or PubNub is initializing
  if (!mounted || !pubnubReady) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <RefreshCw className="w-16 h-16 text-pubnub-blue mx-auto mb-4 animate-spin" />
            <h3 className="text-xl font-semibold mb-2">Loading Channel Groups Manager</h3>
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
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {connectionError ? 'PubNub Connection Failed' : 'PubNub Configuration Required'}
            </h3>
            <p className="text-gray-600">
              {connectionError ? 
                'Unable to connect to PubNub service. Please check your settings and try again.' : 
                'Please configure your PubNub keys in Settings to use Channel Groups'
              }
            </p>
            
            {connectionError && (
              <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm text-red-800">
                  <strong>Error Details:</strong> {connectionError}
                </p>
              </div>
            )}
            
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Channel Groups require the Stream Controller add-on to be enabled in your PubNub Admin Portal.
              </p>
            </div>
            
            {connectionError && (
              <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  <strong>Common Issues:</strong>
                </p>
                <ul className="text-sm text-yellow-800 mt-2 text-left">
                  <li>• Invalid custom origin URL</li>
                  <li>• Network connectivity issues</li>
                  <li>• Incorrect SSL/TLS settings</li>
                  <li>• Invalid API keys</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 h-full">
      <div className="max-w-7xl mx-auto h-full flex flex-col">

        {/* Main Layout */}
        <div className="flex-1 flex gap-6 min-h-0">
          {/* Left Sidebar - Channel Groups List */}
          <div className="w-80 flex-shrink-0">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Channel Groups
                </CardTitle>
              </CardHeader>
              <div className="px-4 pb-3 flex justify-center">
                <Dialog open={showAddQueryDialog} onOpenChange={setShowAddQueryDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" title="Manage an existing channel group">
                      Manage Existing Channel Group
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add Group to Query</DialogTitle>
                      <DialogDescription>
                        Enter the name of an existing channel group to query.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Group Name</Label>
                        <Input
                          value={newGroupToQuery}
                          onChange={(e) => setNewGroupToQuery(e.target.value)}
                          placeholder="existing-group-name"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddGroupToQuery(newGroupToQuery).then((added) => {
                                if (added) {
                                  setNewGroupToQuery('');
                                  setShowAddQueryDialog(false);
                                }
                              });
                            }
                          }}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAddQueryDialog(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={async () => {
                          const added = await handleAddGroupToQuery(newGroupToQuery);
                          if (added) {
                            setNewGroupToQuery('');
                            setShowAddQueryDialog(false);
                          }
                        }}
                        disabled={!newGroupToQuery.trim() || groupNamesToQuery.includes(newGroupToQuery.trim())}
                      >
                        Add to Query
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <CardContent className="flex-1 overflow-y-auto space-y-1">
                {loading ? (
                  <div className="flex items-center justify-center p-8">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  </div>
                ) : groupNamesToQuery.length === 0 ? (
                  <div className="text-center p-8 text-gray-500">
                    <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm">No groups to query</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Use the load button to add channel groups to this list
                    </p>
                  </div>
                ) : channelGroups.length === 0 ? (
                  <div className="text-center p-8 text-gray-500">
                    No channel groups found
                    <p className="text-xs text-gray-400 mt-1">
                      Groups may not exist or may be empty
                    </p>
                  </div>
                ) : (
                  <TooltipProvider>
                    {channelGroups.map((group) => (
                      <Tooltip key={group.name}>
                        <TooltipTrigger asChild>
                          <div
                            className={`p-3 rounded cursor-pointer border transition-colors ${
                              selectedGroup === group.name 
                                ? 'bg-pubnub-blue text-white border-pubnub-blue' 
                                : 'hover:bg-gray-50 border-gray-200'
                            }`}
                            onClick={() => updateField('channelGroups.selectedGroup', group.name)}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-sm truncate">{group.name}</div>
                                <div className={`text-xs ${selectedGroup === group.name ? 'text-blue-200' : 'text-gray-500'}`}>
                                  {group.channels.length} channels
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`h-6 w-6 flex-shrink-0 ${
                                  selectedGroup === group.name
                                    ? 'text-blue-100 hover:text-red-200 hover:bg-blue-700/40'
                                    : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                }`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  removeGroupFromList(group.name);
                                }}
                              >
                                <X className="w-4 h-4" />
                                <span className="sr-only">Remove from local list</span>
                              </Button>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <div className="max-w-xs">
                            <div className="font-semibold">{group.name}</div>
                            <div className="text-xs text-gray-400 mt-1">
                              {group.channels.length} channels
                            </div>
                            <div className="text-xs text-gray-400 mt-2">
                              Removing the group here only clears it from this tool.
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </TooltipProvider>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 space-y-4">
            <div className="mx-auto w-full max-w-3xl">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 flex flex-col gap-3">
                <p className="text-xs text-blue-900 leading-relaxed">
                  <strong>Requirements:</strong> Stream Controller add-on must be enabled in your PubNub Admin Portal. Channel groups allow you to bundle up to 200 channels for subscription management.
                </p>
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                  <DialogTrigger asChild>
                    <Button className="ml-auto bg-pubnub-red hover:bg-pubnub-red/90">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Channel Group
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create Channel Group</DialogTitle>
                      <DialogDescription>
                        This creates a brand new channel group on your PubNub keyset.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Group Name *</Label>
                        <Input
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                          placeholder="my-channel-group"
                        />
                      </div>
                      <div>
                        <Label>Initial Channels *</Label>
                        <Textarea
                          value={channelsToAdd}
                          onChange={(e) => setChannelsToAdd(e.target.value)}
                          placeholder="channel1, channel2, channel3"
                          rows={3}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Comma-separated list. Max 200 channels per operation.
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={createChannelGroup} disabled={!newGroupName.trim() || !channelsToAdd.trim()}>
                        Create Group on PubNub
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {!selectedGroupDetails ? (
              <Card className="flex-1 flex items-center justify-center">
                <CardContent className="text-center">
                  <Layers className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Channel Group</h3>
                  <p className="text-gray-500">
                    Load or select a channel group from the sidebar to manage it.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="flex-1 flex flex-col">
                <CardHeader className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Layers className="w-5 h-5" />
                        {selectedGroupDetails.name}
                      </CardTitle>
                      <p className="text-xs text-gray-500 mt-3">
                        The actions in this panel call PubNub directly. Changes apply immediately to your keyset.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyGroupConfig(selectedGroupDetails)}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy JSON
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Hash className="w-4 h-4" />
                        <span>{selectedGroupDetails.channels.length} channels</span>
                      </div>
                    </div>
                    
                    <Dialog open={showAddChannelDialog} onOpenChange={setShowAddChannelDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="bg-pubnub-blue hover:bg-pubnub-blue/90">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Channel (PubNub)
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Channel to Group</DialogTitle>
                          <DialogDescription>
                            Adds the channel to "{selectedGroupDetails.name}" via the PubNub API.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Channel Name</Label>
                            <Input
                              value={channelToAdd}
                              onChange={(e) => setChannelToAdd(e.target.value)}
                              placeholder="channel-name"
                              onKeyDown={(e) => e.key === 'Enter' && addChannelToGroup(selectedGroupDetails.name)}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setShowAddChannelDialog(false)}>
                            Cancel
                          </Button>
                          <Button 
                            onClick={() => addChannelToGroup(selectedGroupDetails.name)}
                            disabled={!channelToAdd.trim()}
                          >
                            Add Channel
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                
                <CardContent className="flex-1 overflow-y-auto space-y-6">
                  <div>
                    {selectedGroupDetails.channels.length === 0 ? (
                      <div className="flex items-center justify-center h-32">
                        <div className="text-center">
                          <Hash className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500">No channels in this group</p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        {selectedGroupDetails.channels.map((channel, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                          >
                            <div className="flex items-center gap-2">
                              <Hash className="w-4 h-4 text-gray-400" />
                              <span className="font-mono text-sm">{channel}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeChannelFromGroup(selectedGroupDetails.name, channel)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <div className="flex items-center gap-2 text-red-800 font-semibold">
                      <ShieldAlert className="w-4 h-4" />
                      Delete Channel Group from PubNub
                    </div>
                    <p className="text-xs text-red-800 mt-2 leading-relaxed">
                      This permanently removes the channel group and all of its channel associations from your PubNub keyset.
                      Remove the group from the sidebar instead if you only want to stop tracking it locally.
                    </p>
                    <div className="mt-3">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Channel Group Permanently
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Channel Group</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action permanently removes "{selectedGroupDetails.name}" and all associated channels from your PubNub keyset. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteChannelGroup(selectedGroupDetails.name)}>
                              Delete Channel Group
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <AlertDialog
        open={showCreatePrompt}
        onOpenChange={(open) => {
          setShowCreatePrompt(open);
          if (!open) {
            setPendingGroupName(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create Channel Group?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingGroupName ? `"${pendingGroupName}" is not currently available. Would you like to create it now?` : 'Would you like to create this channel group now?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={beginCreateFromPrompt}>
              Create Channel Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
