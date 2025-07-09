import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { UserMetadata, ChannelMetadata, MembershipData, ChannelMemberData, LoadingProgress } from '@/types/app-context';
import { filterData, sortData, paginateData } from '@/utils/app-context';

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
      
      // Fetch all users using pagination
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
          if (totalCount) {
            setLoadingProgress({
              current: allUsers.length,
              total: totalCount,
              message: `Loading users... ${allUsers.length} of ${totalCount}`
            });
          } else {
            setLoadingProgress({
              current: allUsers.length,
              message: `Loading users... ${allUsers.length} loaded`
            });
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
      
      toast({
        title: "Users Loaded",
        description: `Successfully loaded ${allUsers.length} users`,
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
      
      // Fetch all channels using pagination
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
          if (totalCount) {
            setLoadingProgress({
              current: allChannels.length,
              total: totalCount,
              message: `Loading channels... ${allChannels.length} of ${totalCount}`
            });
          } else {
            setLoadingProgress({
              current: allChannels.length,
              message: `Loading channels... ${allChannels.length} loaded`
            });
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
      
      toast({
        title: "Channels Loaded",
        description: `Successfully loaded ${allChannels.length} channels`,
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
    
    // Actions
    loadUsers,
    loadChannels,
    loadMemberships,
    loadChannelMembers,
    
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