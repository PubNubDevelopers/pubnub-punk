import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Copy,
  Users,
  Hash,
  Settings,
  Edit3,
  X
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

interface ChannelGroup {
  name: string;
  channels: string[];
  description?: string;
  lastModified: string;
}

// Field definitions for config management
const FIELD_DEFINITIONS = {
  'channelGroups.groups': { section: 'channelGroups', field: 'groups', type: 'array', default: [] },
  'channelGroups.selectedGroup': { section: 'channelGroups', field: 'selectedGroup', type: 'string', default: '' },
  'channelGroups.searchTerm': { section: 'channelGroups', field: 'searchTerm', type: 'string', default: '' },
} as const;


export default function ChannelGroupsPage() {
  const { toast } = useToast();
  const { setPageSettings, setConfigType } = useConfig();
  
  // State for component mounting
  const [mounted, setMounted] = useState(false);
  
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
    
    // Initialize page settings
    setPageSettings({
      channelGroups: {
        groups: FIELD_DEFINITIONS['channelGroups.groups'].default,
        selectedGroup: FIELD_DEFINITIONS['channelGroups.selectedGroup'].default,
        searchTerm: FIELD_DEFINITIONS['channelGroups.searchTerm'].default,
      },
      configForSaving: {
        groups: FIELD_DEFINITIONS['channelGroups.groups'].default,
        timestamp: new Date().toISOString(),
      }
    });
  }, [setConfigType, setPageSettings]);
  
  // No longer need manual PubNub initialization - handled by usePubNub hook
  
  // State management
  const [channelGroups, setChannelGroups] = useState<ChannelGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddChannelDialog, setShowAddChannelDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ChannelGroup | null>(null);
  
  // Form state
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [channelsToAdd, setChannelsToAdd] = useState('');
  const [channelToAdd, setChannelToAdd] = useState('');

  // Update page settings helper
  const updateField = (path: string, value: any) => {
    const def = FIELD_DEFINITIONS[path as keyof typeof FIELD_DEFINITIONS];
    if (def) {
      setPageSettings(prev => ({
        ...prev,
        [def.section]: {
          ...prev?.[def.section],
          [def.field]: value
        }
      }));
    }
  };

  // Load all channel groups
  const loadChannelGroups = useCallback(async () => {
    if (!pubnub) return;

    setLoading(true);
    try {
      // Note: PubNub doesn't have a direct "list all channel groups" API
      // In practice, you'd need to maintain a list of your channel groups
      // For this demo, we'll use a local storage approach combined with verification
      
      const storedGroups = localStorage.getItem('pubnub_channel_groups');
      const groups: ChannelGroup[] = storedGroups ? JSON.parse(storedGroups) : [];
      
      // Verify each group still exists by listing its channels
      const verifiedGroups: ChannelGroup[] = [];
      
      for (const group of groups) {
        try {
          const result = await pubnub.channelGroups.listChannels({
            channelGroup: group.name
          });
          
          // Update the group with current channel list
          verifiedGroups.push({
            ...group,
            channels: result.channels || [],
            lastModified: new Date().toISOString()
          });
        } catch (error) {
          // Group doesn't exist anymore, skip it
          console.warn(`Channel group ${group.name} no longer exists:`, error);
        }
      }
      
      setChannelGroups(verifiedGroups);
      
      // Update local storage with verified groups
      localStorage.setItem('pubnub_channel_groups', JSON.stringify(verifiedGroups));
      
    } catch (error) {
      console.error('Error loading channel groups:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load channel groups";
      
      // Show error toast for loading issues
      toast({
        title: "Error loading channel groups",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [pubnub, toast]);

  // Create a new channel group
  const createChannelGroup = async () => {
    if (!pubnub || !newGroupName.trim()) return;

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
        channelGroup: newGroupName.trim()
      });

      const newGroup: ChannelGroup = {
        name: newGroupName.trim(),
        channels: channels,
        description: newGroupDescription.trim() || undefined,
        lastModified: new Date().toISOString()
      };

      const updatedGroups = [...channelGroups, newGroup];
      setChannelGroups(updatedGroups);
      localStorage.setItem('pubnub_channel_groups', JSON.stringify(updatedGroups));

      toast({
        title: "Channel Group Created",
        description: `Successfully created channel group "${newGroupName}" with ${channels.length} channels.`,
      });

      // Reset form
      setNewGroupName('');
      setNewGroupDescription('');
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
            channels: updatedChannels,
            lastModified: new Date().toISOString()
          };
        }
        return group;
      });
      
      setChannelGroups(updatedGroups);
      localStorage.setItem('pubnub_channel_groups', JSON.stringify(updatedGroups));

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
            channels: updatedChannels,
            lastModified: new Date().toISOString()
          };
        }
        return group;
      });
      
      setChannelGroups(updatedGroups);
      localStorage.setItem('pubnub_channel_groups', JSON.stringify(updatedGroups));

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
      localStorage.setItem('pubnub_channel_groups', JSON.stringify(updatedGroups));

      if (selectedGroup === groupName) {
        setSelectedGroup('');
      }

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

  // Update group description
  const updateGroupDescription = async () => {
    if (!editingGroup) return;

    const updatedGroups = channelGroups.map(group => {
      if (group.name === editingGroup.name) {
        return {
          ...group,
          description: editingGroup.description,
          lastModified: new Date().toISOString()
        };
      }
      return group;
    });
    
    setChannelGroups(updatedGroups);
    localStorage.setItem('pubnub_channel_groups', JSON.stringify(updatedGroups));

    toast({
      title: "Group Updated",
      description: `Successfully updated description for "${editingGroup.name}".`,
    });

    setEditingGroup(null);
    setShowEditDialog(false);
  };

  // Copy group configuration
  const copyGroupConfig = async (group: ChannelGroup) => {
    const config = {
      name: group.name,
      channels: group.channels,
      description: group.description,
      lastModified: group.lastModified
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

  // Filter channel groups based on search
  const filteredGroups = useMemo(() => {
    return channelGroups.filter(group => 
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.channels.some(channel => channel.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [channelGroups, searchTerm]);

  // Get selected group details
  const selectedGroupDetails = useMemo(() => {
    return channelGroups.find(group => group.name === selectedGroup);
  }, [channelGroups, selectedGroup]);

  // Load channel groups when component mounts
  useEffect(() => {
    if (pubnub) {
      loadChannelGroups();
    }
  }, [pubnub, loadChannelGroups]);

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
        {/* Header */}
        <div className="mb-6">
          <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Requirements:</strong> Stream Controller add-on must be enabled in your PubNub Admin Portal. 
              Channel groups allow you to bundle up to 2,000 channels for subscription management.
            </p>
          </div>
        </div>

        {/* Main Layout */}
        <div className="flex-1 flex gap-6 min-h-0">
          {/* Left Sidebar - Channel Groups List */}
          <div className="w-80 flex-shrink-0">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    Channel Groups
                  </CardTitle>
                  <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-pubnub-red hover:bg-pubnub-red/90">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Create Channel Group</DialogTitle>
                        <DialogDescription>
                          Create a new channel group with initial channels.
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
                          <Label>Description (Optional)</Label>
                          <Input
                            value={newGroupDescription}
                            onChange={(e) => setNewGroupDescription(e.target.value)}
                            placeholder="Group description"
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
                          Create Group
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                
                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search groups..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {/* Refresh button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadChannelGroups}
                  disabled={loading}
                  className="w-full"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh Groups
                </Button>
              </CardHeader>
              
              <CardContent className="flex-1 overflow-y-auto space-y-1">
                {loading ? (
                  <div className="flex items-center justify-center p-8">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  </div>
                ) : filteredGroups.length === 0 ? (
                  <div className="text-center p-8 text-gray-500">
                    {searchTerm ? 'No groups match your search' : 'No channel groups found'}
                  </div>
                ) : (
                  <TooltipProvider>
                    {filteredGroups.map((group) => (
                      <Tooltip key={group.name}>
                        <TooltipTrigger asChild>
                          <div
                            className={`p-3 rounded cursor-pointer border transition-colors ${
                              selectedGroup === group.name 
                                ? 'bg-pubnub-blue text-white border-pubnub-blue' 
                                : 'hover:bg-gray-50 border-gray-200'
                            }`}
                            onClick={() => setSelectedGroup(group.name)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-sm truncate">{group.name}</div>
                                <div className={`text-xs ${selectedGroup === group.name ? 'text-blue-200' : 'text-gray-500'}`}>
                                  {group.channels.length} channels
                                </div>
                              </div>
                              <div className={`text-xs ${selectedGroup === group.name ? 'text-blue-200' : 'text-gray-400'}`}>
                                {new Date(group.lastModified).toLocaleDateString()}
                              </div>
                            </div>
                            {group.description && (
                              <div className={`text-xs mt-1 truncate ${selectedGroup === group.name ? 'text-blue-100' : 'text-gray-600'}`}>
                                {group.description}
                              </div>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <div className="max-w-xs">
                            <div className="font-semibold">{group.name}</div>
                            {group.description && (
                              <div className="text-sm">{group.description}</div>
                            )}
                            <div className="text-xs text-gray-300 mt-1">
                              {group.channels.length} channels • Modified {new Date(group.lastModified).toLocaleDateString()}
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
          <div className="flex-1 flex flex-col min-w-0">
            {!selectedGroupDetails ? (
              <Card className="flex-1 flex items-center justify-center">
                <CardContent className="text-center">
                  <Layers className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Channel Group</h3>
                  <p className="text-gray-500">
                    Choose a channel group from the sidebar to view and manage its channels
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="flex-1 flex flex-col">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Layers className="w-5 h-5" />
                        {selectedGroupDetails.name}
                      </CardTitle>
                      {selectedGroupDetails.description && (
                        <p className="text-sm text-gray-600 mt-1">{selectedGroupDetails.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyGroupConfig(selectedGroupDetails)}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Config
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingGroup({ ...selectedGroupDetails });
                          setShowEditDialog(true);
                        }}
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteChannelGroup(selectedGroupDetails.name)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Group
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Hash className="w-4 h-4" />
                        <span>{selectedGroupDetails.channels.length} channels</span>
                      </div>
                      <div>
                        Last modified: {new Date(selectedGroupDetails.lastModified).toLocaleString()}
                      </div>
                    </div>
                    
                    <Dialog open={showAddChannelDialog} onOpenChange={setShowAddChannelDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="bg-pubnub-blue hover:bg-pubnub-blue/90">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Channel
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Channel to Group</DialogTitle>
                          <DialogDescription>
                            Add a new channel to the "{selectedGroupDetails.name}" group.
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
                
                <CardContent className="flex-1 overflow-y-auto">
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
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
      
      {/* Edit Group Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Channel Group</DialogTitle>
            <DialogDescription>
              Update the description for "{editingGroup?.name}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Group Name</Label>
              <Input value={editingGroup?.name || ''} disabled className="bg-gray-50" />
              <p className="text-xs text-gray-500 mt-1">Group name cannot be changed</p>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={editingGroup?.description || ''}
                onChange={(e) => setEditingGroup(prev => prev ? { ...prev, description: e.target.value } : null)}
                placeholder="Optional group description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={updateGroupDescription}>
              Update Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}