import { useState, useEffect, useMemo, useCallback } from 'react';
import { RefreshCw, Users, Hash, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useConfig } from '@/contexts/config-context';
import { usePubNub } from '@/hooks/usePubNub';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';

// Import types
import { UserMetadata, ChannelMetadata, MembershipData, ChannelMemberData, FIELD_DEFINITIONS } from '@/types/app-context';

// Import components
import { UsersTab } from '@/components/app-context/users/UsersTab';
import { ChannelsTab } from '@/components/app-context/channels/ChannelsTab';
import { UserEditForm } from '@/components/app-context/users/UserEditForm';
import { ChannelEditForm } from '@/components/app-context/channels/ChannelEditForm';
import { MembershipsView } from '@/components/app-context/memberships/MembershipsView';
import { ChannelMembersView } from '@/components/app-context/channel-members/ChannelMembersView';
import { AppContextSearchPanel } from '@/components/app-context/search/AppContextSearchPanel';
import { SearchResults } from '@/components/app-context/search/SearchResults';

// Import hooks
import { useAppContextData } from '@/hooks/useAppContextData';

// Import utils
import { filterData, sortData, paginateData } from '@/utils/app-context';
import { APP_CONTEXT_CONFIG } from '@/config/app-context';

export default function AppContextPage() {
  const { toast } = useToast();
  const { pageSettings, setPageSettings, setConfigType } = useConfig();
  
  // State for component mounting
  const [mounted, setMounted] = useState(false);
  
  // Use centralized PubNub connection
  const { pubnub, isReady: pubnubReady, connectionError, isConnected } = usePubNub({
    instanceId: 'app-context',
    userId: 'app-context-manager-user',
    onConnectionError: (error) => {
      toast({
        title: "PubNub Connection Failed",
        description: error,
        variant: "destructive",
      });
    },
    onConnectionSuccess: () => {
      console.log('App Context PubNub connection established');
    }
  });

  // Use data management hook
  const {
    users,
    channels,
    memberships,
    channelMembers,
    loading,
    loadingProgress,
    usersLoaded,
    channelsLoaded,
    totalUserCount,
    totalChannelCount,
    countChecked,
    loadUsers,
    loadChannels,
    loadMemberships,
    loadChannelMembers,
    checkTotalCounts,
    searchUsers,
    searchChannels,
    getFilteredAndSortedData,
    getPaginatedData,
    setUsers,
    setChannels
  } = useAppContextData({ pubnub, isReady: pubnubReady });

  // Selection states
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectedMemberships, setSelectedMemberships] = useState<Set<string>>(new Set());
  const [selectedChannelMembers, setSelectedChannelMembers] = useState<Set<string>>(new Set());

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<UserMetadata | ChannelMetadata | null>(null);
  const [deletingItem, setDeletingItem] = useState<UserMetadata | ChannelMetadata | null>(null);

  // Contextual view states
  const [showMemberships, setShowMemberships] = useState(false);
  const [showChannelMembers, setShowChannelMembers] = useState(false);
  const [currentMembershipsUserId, setCurrentMembershipsUserId] = useState<string>('');
  const [currentChannelMembersChannelId, setCurrentChannelMembersChannelId] = useState<string>('');

  // Search states
  const [searchMode, setSearchMode] = useState(false);
  const [searchResults, setSearchResults] = useState<(UserMetadata | ChannelMetadata)[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResultCount, setSearchResultCount] = useState<number>(0);
  const [searchHasMore, setSearchHasMore] = useState<boolean>(false);
  const [showLargeResultDialog, setShowLargeResultDialog] = useState<boolean>(false);
  
  // Search cache for preserving search conditions when navigating back
  const [searchCache, setSearchCache] = useState<{
    [key: string]: {
      conditions: any[];
      logic: 'AND' | 'OR';
      sort: { field: string; order: 'asc' | 'desc' };
      limit: number;
      rawFilter: string;
      useRawFilter: boolean;
    }
  }>({});

  // Mount check
  useEffect(() => {
    setMounted(true);
  }, []);

  // Set config type for the config service
  useEffect(() => {
    setConfigType('APP_CONTEXT');
    
    // Initialize page settings with the expected appContext structure
    setPageSettings({
      appContext: {
        selectedTab: FIELD_DEFINITIONS['appContext.selectedTab'].default,
        searchTerm: FIELD_DEFINITIONS['appContext.searchTerm'].default,
        sortBy: FIELD_DEFINITIONS['appContext.sortBy'].default,
        sortOrder: FIELD_DEFINITIONS['appContext.sortOrder'].default,
        pageSize: FIELD_DEFINITIONS['appContext.pageSize'].default,
        currentPage: FIELD_DEFINITIONS['appContext.currentPage'].default,
        selectedUserId: FIELD_DEFINITIONS['appContext.selectedUserId'].default,
        selectedChannelId: FIELD_DEFINITIONS['appContext.selectedChannelId'].default,
      },
      configForSaving: {
        selectedTab: FIELD_DEFINITIONS['appContext.selectedTab'].default,
        timestamp: new Date().toISOString(),
      }
    });
  }, [setConfigType, setPageSettings]);

  // Computed values from pageSettings (with null safety)
  const selectedTab = pageSettings?.appContext?.selectedTab || 'users';
  const searchTerm = pageSettings?.appContext?.searchTerm || '';
  const sortBy = pageSettings?.appContext?.sortBy || 'updated';
  const sortOrder = pageSettings?.appContext?.sortOrder || 'desc';
  const pageSize = pageSettings?.appContext?.pageSize || 50;
  const currentPage = pageSettings?.appContext?.currentPage || 1;

  // Update page settings helper
  const updateField = (path: string, value: any) => {
    const pathParts = path.split('.');
    if (pathParts.length === 2 && pathParts[0] === 'appContext') {
      setPageSettings(prev => ({
        ...prev,
        appContext: {
          ...prev.appContext,
          [pathParts[1]]: value
        }
      }));
    }
  };

  // Handle column header click for sorting
  const handleSort = (column: string) => {
    if (sortBy === column) {
      // Toggle sort order if same column
      updateField('appContext.sortOrder', sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to descending
      updateField('appContext.sortBy', column);
      updateField('appContext.sortOrder', 'desc');
    }
  };

  // Handle tab change
  const handleTabChange = (value: string) => {
    updateField('appContext.selectedTab', value);
    updateField('appContext.currentPage', 1);
    setSelectedItems(new Set());
  };

  // Get current data based on selected tab
  const getCurrentData = () => {
    switch (selectedTab) {
      case 'users':
        return users;
      case 'channels':
        return channels;
      default:
        return [];
    }
  };

  // Get filtered and sorted data
  const filteredAndSortedData = useMemo(() => {
    const currentData = getCurrentData();
    return getFilteredAndSortedData(currentData, searchTerm, sortBy, sortOrder, selectedTab);
  }, [getCurrentData, searchTerm, sortBy, sortOrder, selectedTab, getFilteredAndSortedData]);

  // Get paginated data
  const { paginatedData, totalPages } = useMemo(() => {
    return getPaginatedData(filteredAndSortedData, currentPage, pageSize);
  }, [filteredAndSortedData, currentPage, pageSize, getPaginatedData]);

  // Selection handlers
  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const selectAllVisible = () => {
    const visibleIds = paginatedData.map(item => item.id);
    setSelectedItems(new Set(visibleIds));
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  // CRUD operations
  const handleCreateNew = () => {
    setEditingItem(null);
    setShowCreateDialog(true);
  };

  const handleEdit = (item: UserMetadata | ChannelMetadata) => {
    setEditingItem(item);
    setShowEditDialog(true);
  };

  const handleDelete = (item: UserMetadata | ChannelMetadata) => {
    setDeletingItem(item);
    setShowDeleteDialog(true);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: `Copied "${text}" to clipboard`,
    });
  };

  const handleSaveUser = async (userData: Partial<UserMetadata>) => {
    try {
      if (editingItem) {
        // Update existing user
        await pubnub.objects.setUUIDMetadata({
          uuid: userData.id,
          data: userData
        });
        
        // Update local state
        setUsers(prev => prev.map(user => 
          user.id === userData.id ? { ...user, ...userData } : user
        ));
        
        toast({
          title: "User Updated",
          description: "User has been updated successfully",
        });
      } else {
        // Create new user
        await pubnub.objects.setUUIDMetadata({
          uuid: userData.id,
          data: userData
        });
        
        // Reload users to get the new user
        await loadUsers(true);
        
        toast({
          title: "User Created",
          description: "User has been created successfully",
        });
      }
      
      setShowCreateDialog(false);
      setShowEditDialog(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Error saving user:', error);
      toast({
        title: "Error",
        description: "Failed to save user. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSaveChannel = async (channelData: Partial<ChannelMetadata>) => {
    try {
      if (editingItem) {
        // Update existing channel
        await pubnub.objects.setChannelMetadata({
          channel: channelData.id,
          data: channelData
        });
        
        // Update local state
        setChannels(prev => prev.map(channel => 
          channel.id === channelData.id ? { ...channel, ...channelData } : channel
        ));
        
        toast({
          title: "Channel Updated",
          description: "Channel has been updated successfully",
        });
      } else {
        // Create new channel
        await pubnub.objects.setChannelMetadata({
          channel: channelData.id,
          data: channelData
        });
        
        // Reload channels to get the new channel
        await loadChannels(true);
        
        toast({
          title: "Channel Created",
          description: "Channel has been created successfully",
        });
      }
      
      setShowCreateDialog(false);
      setShowEditDialog(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Error saving channel:', error);
      toast({
        title: "Error",
        description: "Failed to save channel. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = async () => {
    // Implementation for bulk delete
    console.log('Bulk delete:', selectedItems);
    // This would need to be implemented based on the original logic
  };

  // Membership handlers
  const handleViewMemberships = (user: UserMetadata) => {
    setCurrentMembershipsUserId(user.id);
    setShowMemberships(true);
    loadMemberships(user.id);
  };

  const handleViewChannelMembers = (channel: ChannelMetadata) => {
    setCurrentChannelMembersChannelId(channel.id);
    setShowChannelMembers(true);
    loadChannelMembers(channel.id);
  };

  // Search handlers
  const handleSearch = async (params: any) => {
    try {
      const { conditions, logic, sort, limit, rawFilter, useRawFilter } = params;
      
      // Cache search conditions for current tab
      const cacheKey = selectedTab;
      setSearchCache(prev => ({
        ...prev,
        [cacheKey]: {
          conditions: conditions || [],
          logic: logic || 'AND',
          sort: sort || { field: 'updated', order: 'desc' },
          limit: limit || 100,
          rawFilter: rawFilter || '',
          useRawFilter: useRawFilter || false,
        }
      }));
      
      // Build filter string
      let filter = '';
      if (rawFilter) {
        // Use raw filter directly
        filter = rawFilter.trim();
      } else if (conditions && conditions.length > 0) {
        // Build filter from conditions
        const conditionStrings = conditions
          .filter((c: any) => c.field && c.operator && c.value)
          .map((c: any) => {
            let value = c.value;
            
            // Handle string values (needs quotes)
            if (c.operator === 'LIKE' || ['id', 'name', 'email', 'externalId', 'profileUrl', 'status', 'type', 'description'].includes(c.field)) {
              value = `"${value}"`;
            }
            
            return `${c.field} ${c.operator} ${value}`;
          });

        if (conditionStrings.length > 0) {
          filter = conditionStrings.join(` ${logic} `);
        }
      }

      setSearchQuery(filter);
      
      const searchParams = {
        filter: filter || undefined,
        sort: sort ? { field: sort.field, order: sort.order } : undefined,
        limit
      };

      let result;
      if (selectedTab === 'users') {
        result = await searchUsers(searchParams);
      } else {
        result = await searchChannels(searchParams);
      }

      setSearchResults(result.data);
      setSearchResultCount(result.totalCount);
      setSearchHasMore(result.hasMore);
      setSearchMode(true);

      // Show large result dialog if there are more results than loaded locally
      if (result.hasMore && result.totalCount > result.data.length) {
        setShowLargeResultDialog(true);
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search Error",
        description: "Failed to perform search. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSearchClear = (clearCache = true) => {
    setSearchMode(false);
    setSearchResults([]);
    setSearchQuery('');
    setSearchResultCount(0);
    setSearchHasMore(false);
    setShowLargeResultDialog(false);
    
    // Only clear cache when explicitly requested (not when returning from search results)
    if (clearCache) {
      const cacheKey = selectedTab;
      setSearchCache(prev => ({
        ...prev,
        [cacheKey]: {
          conditions: [],
          logic: 'AND',
          sort: { field: 'updated', order: 'desc' },
          limit: 100,
          rawFilter: '',
          useRawFilter: false,
        }
      }));
    }
  };

  // Check total counts on mount
  useEffect(() => {
    if (mounted && pubnubReady && !countChecked) {
      checkTotalCounts();
    }
  }, [mounted, pubnubReady, countChecked, checkTotalCounts]);

  // Auto-load data based on count limits
  useEffect(() => {
    if (mounted && pubnubReady && countChecked) {
      const currentCount = selectedTab === 'users' ? totalUserCount : totalChannelCount;
      const isLoaded = selectedTab === 'users' ? usersLoaded : channelsLoaded;
      
      // Only auto-load if count is within limits
      if (currentCount !== null && currentCount <= APP_CONTEXT_CONFIG.MAX_LOCAL_RECORDS && !isLoaded) {
        if (selectedTab === 'users') {
          loadUsers();
        } else {
          loadChannels();
        }
      }
    }
  }, [mounted, pubnubReady, countChecked, selectedTab, totalUserCount, totalChannelCount, usersLoaded, channelsLoaded, loadUsers, loadChannels]);

  if (!mounted) {
    return null;
  }

  if (connectionError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-2">Connection Error</h2>
          <p className="text-gray-600">{connectionError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 h-full">
      <div className="max-w-7xl mx-auto h-full flex flex-col">
        {/* Main Layout */}
        <div className="flex-1 flex flex-col min-h-0">
          {showMemberships ? (
            <MembershipsView
              memberships={memberships}
              selectedMemberships={selectedMemberships}
              userId={currentMembershipsUserId}
              userName={users.find(u => u.id === currentMembershipsUserId)?.name}
              loading={loading}
              onToggleSelection={(channelId) => {
                setSelectedMemberships(prev => {
                  const newSet = new Set(prev);
                  if (newSet.has(channelId)) {
                    newSet.delete(channelId);
                  } else {
                    newSet.add(channelId);
                  }
                  return newSet;
                });
              }}
              onSelectAll={() => {
                const allChannelIds = memberships.map(m => m.channel.id);
                setSelectedMemberships(new Set(allChannelIds));
              }}
              onClearSelection={() => setSelectedMemberships(new Set())}
              onBulkDelete={() => {
                // Implement bulk delete memberships
                console.log('Bulk delete memberships:', selectedMemberships);
              }}
              onEdit={(membership) => {
                // Implement edit membership
                console.log('Edit membership:', membership);
              }}
              onDeleteSingle={(channelId) => {
                // Implement delete single membership
                console.log('Delete single membership:', channelId);
              }}
              onClose={() => {
                setShowMemberships(false);
                setSelectedMemberships(new Set());
              }}
            />
          ) : showChannelMembers ? (
            <ChannelMembersView
              channelMembers={channelMembers}
              selectedMembers={selectedChannelMembers}
              channelId={currentChannelMembersChannelId}
              channelName={channels.find(c => c.id === currentChannelMembersChannelId)?.name}
              loading={loading}
              onToggleSelection={(userId) => {
                setSelectedChannelMembers(prev => {
                  const newSet = new Set(prev);
                  if (newSet.has(userId)) {
                    newSet.delete(userId);
                  } else {
                    newSet.add(userId);
                  }
                  return newSet;
                });
              }}
              onSelectAll={() => {
                const allUserIds = channelMembers.map(m => m.uuid.id);
                setSelectedChannelMembers(new Set(allUserIds));
              }}
              onClearSelection={() => setSelectedChannelMembers(new Set())}
              onBulkDelete={() => {
                // Implement bulk delete channel members
                console.log('Bulk delete channel members:', selectedChannelMembers);
              }}
              onEdit={(member) => {
                // Implement edit channel member
                console.log('Edit channel member:', member);
              }}
              onDeleteSingle={(userId) => {
                // Implement delete single channel member
                console.log('Delete single channel member:', userId);
              }}
              onClose={() => {
                setShowChannelMembers(false);
                setSelectedChannelMembers(new Set());
              }}
            />
          ) : (() => {
            const currentCount = selectedTab === 'users' ? totalUserCount : totalChannelCount;
            const isLargeDataset = currentCount !== null && currentCount > APP_CONTEXT_CONFIG.MAX_LOCAL_RECORDS;
            
            // Show search panel for large datasets
            if (isLargeDataset && !searchMode) {
              return (
                <div className="flex-1 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold">App Context Objects</h2>
                      <Tabs value={selectedTab} onValueChange={handleTabChange}>
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="users" className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Users ({totalUserCount?.toLocaleString() || 0})
                          </TabsTrigger>
                          <TabsTrigger value="channels" className="flex items-center gap-2">
                            <Hash className="w-4 h-4" />
                            Channels ({totalChannelCount?.toLocaleString() || 0})
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                  </div>
                  
                  <AppContextSearchPanel
                    type={selectedTab}
                    onSearch={handleSearch}
                    onClear={handleSearchClear}
                    loading={loading}
                    totalCount={currentCount}
                    cachedParams={searchCache[selectedTab]}
                  />
                </div>
              );
            }

            // Show search results
            if (searchMode) {
              return (
                <div className="flex-1 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold">App Context Objects</h2>
                      <Tabs value={selectedTab} onValueChange={handleTabChange}>
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="users" className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Users ({totalUserCount?.toLocaleString() || users.length})
                          </TabsTrigger>
                          <TabsTrigger value="channels" className="flex items-center gap-2">
                            <Hash className="w-4 h-4" />
                            Channels ({totalChannelCount?.toLocaleString() || channels.length})
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                    <Button
                      onClick={handleSearchClear}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Back to Search
                    </Button>
                  </div>
                  
                  <SearchResults
                    type={selectedTab}
                    results={searchResults}
                    totalCount={searchResultCount}
                    searchQuery={searchQuery}
                    hasMore={searchHasMore}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onCopy={handleCopy}
                    onViewMemberships={selectedTab === 'users' ? handleViewMemberships : undefined}
                    onViewMembers={selectedTab === 'channels' ? handleViewChannelMembers : undefined}
                  />
                </div>
              );
            }

            // Show normal data tables for small datasets
            return (
              <Card className="flex-1 flex flex-col">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">App Context Objects</CardTitle>
                    <Button
                      onClick={() => {
                        if (selectedTab === 'users') loadUsers(true);
                        else if (selectedTab === 'channels') loadChannels(true);
                      }}
                      disabled={loading}
                      variant="outline"
                      size="sm"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 flex flex-col">
                  <Tabs value={selectedTab} onValueChange={handleTabChange} className="flex-1 flex flex-col">
                    <div className="px-6 border-b">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="users" className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Users ({users.length}){usersLoaded && <span className="text-xs opacity-60">•</span>}
                        </TabsTrigger>
                        <TabsTrigger value="channels" className="flex items-center gap-2">
                          <Hash className="w-4 h-4" />
                          Channels ({channels.length}){channelsLoaded && <span className="text-xs opacity-60">•</span>}
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    <TabsContent value="users" className="flex-1 flex flex-col m-0">
                      <UsersTab
                        users={filteredAndSortedData as UserMetadata[]}
                        selectedItems={selectedItems}
                        pageSettings={pageSettings}
                        loading={loading}
                        loadingProgress={loadingProgress}
                        onUpdateField={updateField}
                        onItemSelection={toggleItemSelection}
                        onSelectAll={selectAllVisible}
                        onClearSelection={clearSelection}
                        onSort={handleSort}
                        onCreateNew={handleCreateNew}
                        onBulkDelete={handleBulkDelete}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onCopy={handleCopy}
                        onViewMemberships={handleViewMemberships}
                      />
                    </TabsContent>

                    <TabsContent value="channels" className="flex-1 flex flex-col m-0">
                      <ChannelsTab
                        channels={filteredAndSortedData as ChannelMetadata[]}
                        selectedItems={selectedItems}
                        pageSettings={pageSettings}
                        loading={loading}
                        loadingProgress={loadingProgress}
                        onUpdateField={updateField}
                        onItemSelection={toggleItemSelection}
                        onSelectAll={selectAllVisible}
                        onClearSelection={clearSelection}
                        onSort={handleSort}
                        onCreateNew={handleCreateNew}
                        onBulkDelete={handleBulkDelete}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onCopy={handleCopy}
                        onViewMembers={handleViewChannelMembers}
                      />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            );
          })()}
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={showCreateDialog || showEditDialog} onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setShowEditDialog(false);
            setEditingItem(null);
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? `Edit ${selectedTab.slice(0, -1)}` : `Create New ${selectedTab.slice(0, -1)}`}
              </DialogTitle>
            </DialogHeader>
            
            {selectedTab === 'users' ? (
              <UserEditForm
                user={editingItem as UserMetadata}
                onSave={handleSaveUser}
                onCancel={() => {
                  setShowCreateDialog(false);
                  setShowEditDialog(false);
                  setEditingItem(null);
                }}
              />
            ) : (
              <ChannelEditForm
                channel={editingItem as ChannelMetadata}
                onSave={handleSaveChannel}
                onCancel={() => {
                  setShowCreateDialog(false);
                  setShowEditDialog(false);
                  setEditingItem(null);
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Delete</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this {selectedTab.slice(0, -1)}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => {
                // Implement delete logic
                console.log('Delete item:', deletingItem);
                setShowDeleteDialog(false);
                setDeletingItem(null);
              }}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Large Result Set Dialog */}
        <Dialog open={showLargeResultDialog} onOpenChange={setShowLargeResultDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Large Result Set</DialogTitle>
              <DialogDescription>
                Search returned a large number of results.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>{searchResults.length.toLocaleString()}</strong> objects loaded locally
                </p>
                <p className="text-sm">
                  Search returned <strong>{searchResultCount.toLocaleString()}</strong> total objects
                </p>
                <p className="text-sm text-gray-600">
                  To load the complete set of results, narrow down your search with more specific parameters.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setShowLargeResultDialog(false)}>
                OK
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}