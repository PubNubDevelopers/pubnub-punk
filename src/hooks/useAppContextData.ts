import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { UserMetadata, ChannelMetadata, MembershipData, ChannelMemberData, LoadingProgress } from '@/types/app-context';
import { filterData, sortData, paginateData } from '@/utils/app-context';
import { APP_CONTEXT_CONFIG } from '@/config/app-context';

interface UseAppContextDataProps {
  pubnub: any;
  isReady: boolean;
}

export function useAppContextData({ pubnub, isReady }: UseAppContextDataProps) {
  const { toast } = useToast();
  const pubnubRef = useRef<any>(null);
  
  // Update ref when pubnub changes
  pubnubRef.current = pubnub;

  // State management
  const [users, setUsers] = useState<UserMetadata[]>([]);
  const [channels, setChannels] = useState<ChannelMetadata[]>([]);
  const [memberships, setMemberships] = useState<MembershipData[]>([]);
  const [channelMembers, setChannelMembers] = useState<ChannelMemberData[]>([]);
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<LoadingProgress | null>(null);
  
  // Cache tracking
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [channelsLoaded, setChannelsLoaded] = useState(false);
  const [usersLastLoaded, setUsersLastLoaded] = useState<Date | null>(null);
  const [channelsLastLoaded, setChannelsLastLoaded] = useState<Date | null>(null);
  
  // Total count tracking (for large datasets)
  const [totalUserCount, setTotalUserCount] = useState<number | null>(null);
  const [totalChannelCount, setTotalChannelCount] = useState<number | null>(null);
  const [countChecked, setCountChecked] = useState(false);

  // Check total counts without loading all data
  const checkTotalCounts = useCallback(async () => {
    if (!pubnubRef.current || !isReady || countChecked) return;

    try {
      // Get user count
      const userResult = await pubnubRef.current.objects.getAllUUIDMetadata({
        include: { totalCount: true },
        limit: 1 // Only get one record to check total count
      });
      
      // Get channel count
      const channelResult = await pubnubRef.current.objects.getAllChannelMetadata({
        include: { totalCount: true },
        limit: 1 // Only get one record to check total count
      });

      setTotalUserCount(userResult.totalCount || 0);
      setTotalChannelCount(channelResult.totalCount || 0);
      setCountChecked(true);
    } catch (error) {
      console.error('Error checking total counts:', error);
      setCountChecked(true); // Still mark as checked to avoid infinite loops
    }
  }, [pubnubRef, isReady, countChecked]);

  const loadUsers = useCallback(async (forceReload = false) => {
    if (!pubnubRef.current || !isReady) return;

    // Check if data is already cached and we're not forcing a reload
    if (!forceReload && usersLoaded && users.length > 0) {
      console.log('Using cached users data');
      return;
    }

    setLoading(true);
    setLoadingProgress({ current: 0, message: 'Starting to load users...' });
    
    try {
      const allUsers: UserMetadata[] = [];
      let nextToken: string | undefined = undefined;
      let pageCount = 0;
      const seenIds = new Set<string>();
      let totalCount: number | undefined = undefined;
      const MAX_RECORDS = APP_CONTEXT_CONFIG.MAX_LOCAL_RECORDS;
      
      // Fetch users using pagination with limit
      do {
        const result = await pubnubRef.current.objects.getAllUUIDMetadata({
          include: {
            customFields: true,
            totalCount: true
          },
          limit: 100,
          ...(nextToken && { page: { next: nextToken } })
        });

        // Get total count from first response
        if (totalCount === undefined && result.totalCount !== undefined) {
          totalCount = result.totalCount;
          
          // Warn if total count exceeds our limit
          if (totalCount > MAX_RECORDS) {
            console.warn(`Total user count (${totalCount}) exceeds recommended limit (${MAX_RECORDS}). Only first ${MAX_RECORDS} will be loaded.`);
            toast({
              title: "Large Dataset Warning",
              description: `Found ${totalCount} users. Loading first ${MAX_RECORDS} for performance. Consider using search/filtering for specific users.`,
              variant: "default",
            });
          }
        }

        if (result.data && result.data.length > 0) {
          // Check if we're getting duplicate data
          const newUsers = result.data.filter((user: UserMetadata) => !seenIds.has(user.id));
          if (newUsers.length === 0) {
            console.log('No new users in this page, stopping pagination');
            break;
          }
          
          newUsers.forEach((user: UserMetadata) => {
            seenIds.add(user.id);
            allUsers.push(user);
          });

          // Update progress
          const displayTotal = totalCount && totalCount > MAX_RECORDS ? MAX_RECORDS : totalCount;
          if (displayTotal) {
            setLoadingProgress({
              current: allUsers.length,
              total: displayTotal,
              message: `Loading users... ${allUsers.length} of ${displayTotal}${totalCount && totalCount > MAX_RECORDS ? ` (${totalCount} total)` : ''}`
            });
          } else {
            setLoadingProgress({
              current: allUsers.length,
              message: `Loading users... ${allUsers.length} loaded`
            });
          }

          // Stop if we've reached our limit
          if (allUsers.length >= MAX_RECORDS) {
            console.log(`Reached maximum record limit (${MAX_RECORDS}), stopping pagination`);
            break;
          }
        } else if (result.data && result.data.length === 0) {
          // Empty data response, stop pagination
          console.log('Empty data response, stopping pagination');
          break;
        }

        nextToken = result.next;
        pageCount++;
        
        // Safety break for infinite loop
        if (pageCount > 1000) {
          console.warn('Reached maximum page count, stopping pagination');
          break;
        }
      } while (nextToken);

      console.log(`Loaded ${allUsers.length} users in ${pageCount} pages`);
      setUsers(allUsers);
      setUsersLoaded(true);
      setUsersLastLoaded(new Date());
      
      const loadedCount = allUsers.length;
      const isLimited = totalCount && totalCount > MAX_RECORDS;
      
      toast({
        title: "Users Loaded",
        description: `Successfully loaded ${loadedCount} users${isLimited ? ` (limited from ${totalCount} total)` : ''}`,
      });
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Error Loading Users",
        description: "Failed to load users. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setLoadingProgress(null);
    }
  }, [pubnubRef, isReady, usersLoaded, users.length, toast]);

  const loadChannels = useCallback(async (forceReload = false) => {
    if (!pubnubRef.current || !isReady) return;

    // Check if data is already cached and we're not forcing a reload
    if (!forceReload && channelsLoaded && channels.length > 0) {
      console.log('Using cached channels data');
      return;
    }

    setLoading(true);
    setLoadingProgress({ current: 0, message: 'Starting to load channels...' });
    
    try {
      const allChannels: ChannelMetadata[] = [];
      let nextToken: string | undefined = undefined;
      let pageCount = 0;
      const seenIds = new Set<string>();
      let totalCount: number | undefined = undefined;
      const MAX_RECORDS = APP_CONTEXT_CONFIG.MAX_LOCAL_RECORDS;
      
      // Fetch channels using pagination with limit
      do {
        const result = await pubnubRef.current.objects.getAllChannelMetadata({
          include: {
            customFields: true,
            totalCount: true
          },
          limit: 100,
          ...(nextToken && { page: { next: nextToken } })
        });

        // Get total count from first response
        if (totalCount === undefined && result.totalCount !== undefined) {
          totalCount = result.totalCount;
          
          // Warn if total count exceeds our limit
          if (totalCount > MAX_RECORDS) {
            console.warn(`Total channel count (${totalCount}) exceeds recommended limit (${MAX_RECORDS}). Only first ${MAX_RECORDS} will be loaded.`);
            toast({
              title: "Large Dataset Warning",
              description: `Found ${totalCount} channels. Loading first ${MAX_RECORDS} for performance. Consider using search/filtering for specific channels.`,
              variant: "default",
            });
          }
        }

        if (result.data && result.data.length > 0) {
          // Check if we're getting duplicate data
          const newChannels = result.data.filter((channel: ChannelMetadata) => !seenIds.has(channel.id));
          if (newChannels.length === 0) {
            console.log('No new channels in this page, stopping pagination');
            break;
          }
          
          newChannels.forEach((channel: ChannelMetadata) => {
            seenIds.add(channel.id);
            allChannels.push(channel);
          });

          // Update progress
          const displayTotal = totalCount && totalCount > MAX_RECORDS ? MAX_RECORDS : totalCount;
          if (displayTotal) {
            setLoadingProgress({
              current: allChannels.length,
              total: displayTotal,
              message: `Loading channels... ${allChannels.length} of ${displayTotal}${totalCount && totalCount > MAX_RECORDS ? ` (${totalCount} total)` : ''}`
            });
          } else {
            setLoadingProgress({
              current: allChannels.length,
              message: `Loading channels... ${allChannels.length} loaded`
            });
          }

          // Stop if we've reached our limit
          if (allChannels.length >= MAX_RECORDS) {
            console.log(`Reached maximum record limit (${MAX_RECORDS}), stopping pagination`);
            break;
          }
        } else if (result.data && result.data.length === 0) {
          // Empty data response, stop pagination
          console.log('Empty data response, stopping pagination');
          break;
        }

        nextToken = result.next;
        pageCount++;
        
        // Safety break for infinite loop
        if (pageCount > 1000) {
          console.warn('Reached maximum page count, stopping pagination');
          break;
        }
      } while (nextToken);

      console.log(`Loaded ${allChannels.length} channels in ${pageCount} pages`);
      setChannels(allChannels);
      setChannelsLoaded(true);
      setChannelsLastLoaded(new Date());
      
      const loadedCount = allChannels.length;
      const isLimited = totalCount && totalCount > MAX_RECORDS;
      
      toast({
        title: "Channels Loaded",
        description: `Successfully loaded ${loadedCount} channels${isLimited ? ` (limited from ${totalCount} total)` : ''}`,
      });
    } catch (error) {
      console.error('Error loading channels:', error);
      toast({
        title: "Error Loading Channels",
        description: "Failed to load channels. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setLoadingProgress(null);
    }
  }, [pubnubRef, isReady, channelsLoaded, channels.length, toast]);

  const loadMemberships = useCallback(async (userId?: string) => {
    if (!pubnubRef.current || !isReady || !userId) return;

    setLoading(true);
    
    try {
      const result = await pubnubRef.current.objects.getMemberships({
        uuid: userId,
        include: {
          customFields: true,
          channelFields: true,
          customChannelFields: true,
          totalCount: true
        },
        limit: 100
      });

      setMemberships(result.data || []);
      
      toast({
        title: "Memberships Loaded",
        description: `Successfully loaded ${result.data?.length || 0} memberships`,
      });
    } catch (error) {
      console.error('Error loading memberships:', error);
      toast({
        title: "Error Loading Memberships",
        description: "Failed to load memberships. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [pubnubRef, isReady, toast]);

  const loadChannelMembers = useCallback(async (channelId?: string) => {
    if (!pubnubRef.current || !isReady || !channelId) return;

    setLoading(true);
    
    try {
      const result = await pubnubRef.current.objects.getChannelMembers({
        channel: channelId,
        include: {
          customFields: true,
          uuidFields: true,
          customUuidFields: true,
          totalCount: true
        },
        limit: 100
      });

      setChannelMembers(result.data || []);
      
      toast({
        title: "Channel Members Loaded",
        description: `Successfully loaded ${result.data?.length || 0} members`,
      });
    } catch (error) {
      console.error('Error loading channel members:', error);
      toast({
        title: "Error Loading Channel Members",
        description: "Failed to load channel members. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [pubnubRef, isReady, toast]);

  // Search users with filtering and pagination
  const searchUsers = useCallback(async (searchParams: {
    filter?: string;
    sort?: { field: string; order: 'asc' | 'desc' };
    limit?: number;
  }) => {
    if (!pubnubRef.current || !isReady) return { data: [], totalCount: 0, hasMore: false };

    setLoading(true);
    setLoadingProgress({ current: 0, message: 'Searching users...' });

    try {
      const { filter, sort, limit = APP_CONTEXT_CONFIG.DEFAULT_SEARCH_LIMIT } = searchParams;
      
      // First, get initial results to check total count
      const initialConfig: any = {
        include: {
          customFields: true,
          totalCount: true
        },
        limit: Math.min(limit, APP_CONTEXT_CONFIG.SEARCH_PAGE_SIZE)
      };

      if (filter) {
        initialConfig.filter = filter;
      }

      if (sort) {
        initialConfig.sort = { [sort.field]: sort.order };
      }

      const initialResult = await pubnubRef.current.objects.getAllUUIDMetadata(initialConfig);
      const totalCount = initialResult.totalCount || 0;
      
      // If total count is small or under threshold, return initial results
      if (totalCount <= APP_CONTEXT_CONFIG.SEARCH_PAGINATION_THRESHOLD) {
        toast({
          title: "Search Complete",
          description: `Found ${initialResult.data?.length || 0} users`,
        });

        return {
          data: initialResult.data || [],
          totalCount,
          hasMore: false
        };
      }

      // For large result sets, paginate up to MAX_SEARCH_RESULTS_LOCAL
      const allResults: UserMetadata[] = [...(initialResult.data || [])];
      let nextToken = initialResult.next;
      const maxResults = APP_CONTEXT_CONFIG.MAX_SEARCH_RESULTS_LOCAL;
      const pageSize = APP_CONTEXT_CONFIG.SEARCH_PAGE_SIZE;
      let pageCount = 1;

      setLoadingProgress({ 
        current: allResults.length, 
        total: Math.min(totalCount, maxResults),
        message: `Loading search results... ${allResults.length}/${Math.min(totalCount, maxResults)}` 
      });

      // Continue fetching until we have enough results or no more pages
      while (nextToken && allResults.length < maxResults) {
        const pageConfig: any = {
          include: {
            customFields: true,
            totalCount: true
          },
          limit: Math.min(pageSize, maxResults - allResults.length),
          page: { next: nextToken }
        };

        if (filter) {
          pageConfig.filter = filter;
        }

        if (sort) {
          pageConfig.sort = { [sort.field]: sort.order };
        }

        const pageResult = await pubnubRef.current.objects.getAllUUIDMetadata(pageConfig);
        
        if (pageResult.data && pageResult.data.length > 0) {
          allResults.push(...pageResult.data);
          pageCount++;
          
          setLoadingProgress({ 
            current: allResults.length, 
            total: Math.min(totalCount, maxResults),
            message: `Loading search results... ${allResults.length}/${Math.min(totalCount, maxResults)}` 
          });
        }

        nextToken = pageResult.next;
      }

      const hasMore = totalCount > allResults.length;
      
      toast({
        title: "Search Complete",
        description: hasMore 
          ? `Loaded ${allResults.length} users locally (${totalCount.toLocaleString()} total found)`
          : `Found ${allResults.length} users`,
      });

      return {
        data: allResults,
        totalCount,
        hasMore
      };
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        title: "Search Error",
        description: "Failed to search users. Please try again.",
        variant: "destructive",
      });
      return { data: [], totalCount: 0, hasMore: false };
    } finally {
      setLoading(false);
      setLoadingProgress(null);
    }
  }, [pubnubRef, isReady, toast]);

  // Search channels with filtering and pagination
  const searchChannels = useCallback(async (searchParams: {
    filter?: string;
    sort?: { field: string; order: 'asc' | 'desc' };
    limit?: number;
  }) => {
    if (!pubnubRef.current || !isReady) return { data: [], totalCount: 0, hasMore: false };

    setLoading(true);
    setLoadingProgress({ current: 0, message: 'Searching channels...' });

    try {
      const { filter, sort, limit = APP_CONTEXT_CONFIG.DEFAULT_SEARCH_LIMIT } = searchParams;
      
      // First, get initial results to check total count
      const initialConfig: any = {
        include: {
          customFields: true,
          totalCount: true
        },
        limit: Math.min(limit, APP_CONTEXT_CONFIG.SEARCH_PAGE_SIZE)
      };

      if (filter) {
        initialConfig.filter = filter;
      }

      if (sort) {
        initialConfig.sort = { [sort.field]: sort.order };
      }

      const initialResult = await pubnubRef.current.objects.getAllChannelMetadata(initialConfig);
      const totalCount = initialResult.totalCount || 0;
      
      // If total count is small or under threshold, return initial results
      if (totalCount <= APP_CONTEXT_CONFIG.SEARCH_PAGINATION_THRESHOLD) {
        toast({
          title: "Search Complete",
          description: `Found ${initialResult.data?.length || 0} channels`,
        });

        return {
          data: initialResult.data || [],
          totalCount,
          hasMore: false
        };
      }

      // For large result sets, paginate up to MAX_SEARCH_RESULTS_LOCAL
      const allResults: ChannelMetadata[] = [...(initialResult.data || [])];
      let nextToken = initialResult.next;
      const maxResults = APP_CONTEXT_CONFIG.MAX_SEARCH_RESULTS_LOCAL;
      const pageSize = APP_CONTEXT_CONFIG.SEARCH_PAGE_SIZE;
      let pageCount = 1;

      setLoadingProgress({ 
        current: allResults.length, 
        total: Math.min(totalCount, maxResults),
        message: `Loading search results... ${allResults.length}/${Math.min(totalCount, maxResults)}` 
      });

      // Continue fetching until we have enough results or no more pages
      while (nextToken && allResults.length < maxResults) {
        const pageConfig: any = {
          include: {
            customFields: true,
            totalCount: true
          },
          limit: Math.min(pageSize, maxResults - allResults.length),
          page: { next: nextToken }
        };

        if (filter) {
          pageConfig.filter = filter;
        }

        if (sort) {
          pageConfig.sort = { [sort.field]: sort.order };
        }

        const pageResult = await pubnubRef.current.objects.getAllChannelMetadata(pageConfig);
        
        if (pageResult.data && pageResult.data.length > 0) {
          allResults.push(...pageResult.data);
          pageCount++;
          
          setLoadingProgress({ 
            current: allResults.length, 
            total: Math.min(totalCount, maxResults),
            message: `Loading search results... ${allResults.length}/${Math.min(totalCount, maxResults)}` 
          });
        }

        nextToken = pageResult.next;
      }

      const hasMore = totalCount > allResults.length;
      
      toast({
        title: "Search Complete",
        description: hasMore 
          ? `Loaded ${allResults.length} channels locally (${totalCount.toLocaleString()} total found)`
          : `Found ${allResults.length} channels`,
      });

      return {
        data: allResults,
        totalCount,
        hasMore
      };
    } catch (error) {
      console.error('Error searching channels:', error);
      toast({
        title: "Search Error",
        description: "Failed to search channels. Please try again.",
        variant: "destructive",
      });
      return { data: [], totalCount: 0, hasMore: false };
    } finally {
      setLoading(false);
      setLoadingProgress(null);
    }
  }, [pubnubRef, isReady, toast]);

  const getFilteredAndSortedData = useCallback((
    data: (UserMetadata | ChannelMetadata)[],
    searchTerm: string,
    sortBy: string,
    sortOrder: 'asc' | 'desc',
    selectedTab: 'users' | 'channels'
  ) => {
    const filtered = filterData(data, searchTerm, selectedTab);
    const sorted = sortData(filtered, sortBy, sortOrder, selectedTab);
    return sorted;
  }, []);

  const getPaginatedData = useCallback((
    data: any[],
    currentPage: number,
    pageSize: number
  ) => {
    return paginateData(data, currentPage, pageSize);
  }, []);

  return {
    // Data
    users,
    channels,
    memberships,
    channelMembers,
    
    // Loading states
    loading,
    loadingProgress,
    
    // Cache states
    usersLoaded,
    channelsLoaded,
    usersLastLoaded,
    channelsLastLoaded,
    
    // Total count tracking
    totalUserCount,
    totalChannelCount,
    countChecked,
    
    // Actions
    loadUsers,
    loadChannels,
    loadMemberships,
    loadChannelMembers,
    checkTotalCounts,
    searchUsers,
    searchChannels,
    
    // Utilities
    getFilteredAndSortedData,
    getPaginatedData,
    
    // State setters (for external manipulation)
    setUsers,
    setChannels,
    setMemberships,
    setChannelMembers
  };
}