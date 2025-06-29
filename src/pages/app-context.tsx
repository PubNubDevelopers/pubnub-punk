import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Database,
  Users, 
  Hash,
  UserPlus,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Trash2,
  Edit,
  Copy,
  Download,
  Upload,
  MoreVertical,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  AlertCircle,
  CheckCircle2,
  Settings,
  UserCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useConfig } from '@/contexts/config-context';
import { storage } from '@/lib/storage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

// Data interfaces based on PubNub App Context APIs
interface UserMetadata {
  id: string;
  name?: string;
  email?: string;
  externalId?: string;
  profileUrl?: string;
  custom?: Record<string, any>;
  updated: string;
  eTag: string;
}

interface ChannelMetadata {
  id: string;
  name?: string;
  description?: string;
  custom?: Record<string, any>;
  updated: string;
  eTag: string;
}

interface MembershipData {
  channel: {
    id: string;
    name?: string;
    description?: string;
    custom?: Record<string, any>;
    updated: string;
  };
  custom?: Record<string, any>;
  updated: string;
  status?: string;
  type?: string;
}

interface ChannelMemberData {
  uuid: {
    id: string;
    name?: string;
    email?: string;
    externalId?: string;
    profileUrl?: string;
    custom?: Record<string, any>;
    updated: string;
  };
  custom?: Record<string, any>;
  updated: string;
  status?: string;
  type?: string;
}

// Field definitions for config management
const FIELD_DEFINITIONS = {
  'appContext.selectedTab': { section: 'appContext', field: 'selectedTab', type: 'string', default: 'users' },
  'appContext.searchTerm': { section: 'appContext', field: 'searchTerm', type: 'string', default: '' },
  'appContext.sortBy': { section: 'appContext', field: 'sortBy', type: 'string', default: 'updated' },
  'appContext.sortOrder': { section: 'appContext', field: 'sortOrder', type: 'string', default: 'desc' },
  'appContext.pageSize': { section: 'appContext', field: 'pageSize', type: 'number', default: 50 },
  'appContext.currentPage': { section: 'appContext', field: 'currentPage', type: 'number', default: 1 },
  'appContext.selectedUserId': { section: 'appContext', field: 'selectedUserId', type: 'string', default: '' },
  'appContext.selectedChannelId': { section: 'appContext', field: 'selectedChannelId', type: 'string', default: '' },
} as const;

// Declare PubNub as a global variable from the CDN
declare global {
  interface Window {
    PubNub: any;
  }
}

export default function AppContextPage() {
  const { toast } = useToast();
  const { pageSettings, setPageSettings, setConfigType } = useConfig();
  
  // State for PubNub availability and instance
  const [mounted, setMounted] = useState(false);
  const [pubnubReady, setPubnubReady] = useState(false);
  const [pubnub, setPubnub] = useState<any>(null);
  
  // Mount check
  useEffect(() => {
    setMounted(true);
  }, [pubnub, toast]);

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
      // Add simplified config for saving
      configForSaving: {
        selectedTab: FIELD_DEFINITIONS['appContext.selectedTab'].default,
        timestamp: new Date().toISOString(),
      }
    });
  }, [setConfigType, setPageSettings]);
  
  // Check for PubNub availability on mount and create instance
  useEffect(() => {
    if (!mounted || pubnub) return; // Don't recreate if already exists
    
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
              userId: settings.credentials.userId || 'app-context-admin'
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
  }, [mounted, pubnub]); // Include pubnub to prevent recreation

  
  // State management
  const [users, setUsers] = useState<UserMetadata[]>([]);
  const [channels, setChannels] = useState<ChannelMetadata[]>([]);
  const [memberships, setMemberships] = useState<MembershipData[]>([]);
  const [channelMembers, setChannelMembers] = useState<ChannelMemberData[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<{current: number, total?: number, message: string} | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [newItemData, setNewItemData] = useState<any>({});

  // Cache tracking
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [channelsLoaded, setChannelsLoaded] = useState(false);
  const [usersLastLoaded, setUsersLastLoaded] = useState<Date | null>(null);
  const [channelsLastLoaded, setChannelsLastLoaded] = useState<Date | null>(null);

  // Computed values from pageSettings (with null safety)
  const selectedTab = pageSettings?.appContext?.selectedTab || FIELD_DEFINITIONS['appContext.selectedTab'].default;
  const searchTerm = pageSettings?.appContext?.searchTerm || FIELD_DEFINITIONS['appContext.searchTerm'].default;
  const sortBy = pageSettings?.appContext?.sortBy || FIELD_DEFINITIONS['appContext.sortBy'].default;
  const sortOrder = pageSettings?.appContext?.sortOrder || FIELD_DEFINITIONS['appContext.sortOrder'].default;
  const pageSize = pageSettings?.appContext?.pageSize || FIELD_DEFINITIONS['appContext.pageSize'].default;
  const currentPage = pageSettings?.appContext?.currentPage || FIELD_DEFINITIONS['appContext.currentPage'].default;
  const selectedUserId = pageSettings?.appContext?.selectedUserId || FIELD_DEFINITIONS['appContext.selectedUserId'].default;
  const selectedChannelId = pageSettings?.appContext?.selectedChannelId || FIELD_DEFINITIONS['appContext.selectedChannelId'].default;

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

  // Use refs to maintain stable function references
  const pubnubRef = useRef(pubnub);
  const toastRef = useRef(toast);
  
  // Update refs when values change
  useEffect(() => {
    pubnubRef.current = pubnub;
  }, [pubnub]);
  
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  // Load all users using pagination
  const loadUsers = useCallback(async (forceReload = false) => {
    if (!pubnubRef.current) return;

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
      let previousToken: string | undefined = undefined;
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
          setLoadingProgress({
            current: allUsers.length,
            total: totalCount,
            message: `Loading users... ${allUsers.length}${totalCount ? ` of ${totalCount}` : ''}`
          });
        }
        
        // Check if token is changing
        previousToken = nextToken;
        nextToken = result.next;
        
        if (nextToken && nextToken === previousToken) {
          console.log('Pagination token not changing, stopping to prevent infinite loop');
          break;
        }
        
        pageCount++;
        
        // Remove the arbitrary page limit - let it load all users
        // Safety check for extremely large datasets (10,000+ pages)
        if (pageCount > 10000) {
          console.log('Reached extreme page limit (10,000 pages), stopping pagination as safety measure');
          break;
        }
      } while (nextToken);

      console.log('Loaded', allUsers.length, 'users');
      setUsers(allUsers);
      setUsersLoaded(true);
      setUsersLastLoaded(new Date());

    } catch (error) {
      console.error('Error loading users:', error);
      toastRef.current({
        title: "Error loading users",
        description: error instanceof Error ? error.message : "Failed to load users",
        variant: "destructive",
      });
      setUsers([]);
      setUsersLoaded(false);
    } finally {
      setLoading(false);
      setLoadingProgress(null);
    }
  }, [usersLoaded, users.length]); // Depend on cache state

  // Load all channels using pagination
  const loadChannels = useCallback(async (forceReload = false) => {
    if (!pubnubRef.current) return;

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
      let previousToken: string | undefined = undefined;
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
          setLoadingProgress({
            current: allChannels.length,
            total: totalCount,
            message: `Loading channels... ${allChannels.length}${totalCount ? ` of ${totalCount}` : ''}`
          });
        }
        
        // Check if token is changing
        previousToken = nextToken;
        nextToken = result.next;
        
        if (nextToken && nextToken === previousToken) {
          console.log('Pagination token not changing, stopping to prevent infinite loop');
          break;
        }
        
        pageCount++;
        
        // Safety check for extremely large datasets (10,000+ pages)
        if (pageCount > 10000) {
          console.log('Reached extreme page limit (10,000 pages), stopping pagination as safety measure');
          break;
        }
      } while (nextToken);

      console.log('Loaded', allChannels.length, 'channels');
      setChannels(allChannels);
      setChannelsLoaded(true);
      setChannelsLastLoaded(new Date());

    } catch (error) {
      console.error('Error loading channels:', error);
      toastRef.current({
        title: "Error loading channels",
        description: error instanceof Error ? error.message : "Failed to load channels",
        variant: "destructive",
      });
      setChannels([]);
      setChannelsLoaded(false);
    } finally {
      setLoading(false);
      setLoadingProgress(null);
    }
  }, [channelsLoaded, channels.length]); // Depend on cache state

  // Load memberships for selected user
  const loadMemberships = useCallback(async (userId?: string) => {
    if (!pubnubRef.current) return;
    
    const targetUserId = userId || selectedUserId;
    if (!targetUserId) return;

    setLoading(true);
    try {
      const allMemberships: MembershipData[] = [];
      let nextToken: string | undefined = undefined;
      
      // Fetch all memberships using pagination
      let previousToken: string | undefined = undefined;
      let pageCount = 0;
      const seenChannelIds = new Set<string>();
      
      do {
        const result = await pubnubRef.current.objects.getMemberships({
          uuid: targetUserId,
          include: {
            customFields: true,
            channelFields: true,
            customChannelFields: true,
            totalCount: true
          },
          limit: 100,
          ...(nextToken && { page: { next: nextToken } })
        });

        if (result.data && result.data.length > 0) {
          // Check if we're getting duplicate data
          const newMemberships = result.data.filter((membership: MembershipData) => !seenChannelIds.has(membership.channel.id));
          if (newMemberships.length === 0) {
            console.log('No new memberships in this page, stopping pagination');
            break;
          }
          
          newMemberships.forEach((membership: MembershipData) => {
            seenChannelIds.add(membership.channel.id);
            allMemberships.push(membership);
          });
        }
        
        // Check if token is changing
        previousToken = nextToken;
        nextToken = result.next;
        
        if (nextToken && nextToken === previousToken) {
          console.log('Pagination token not changing, stopping to prevent infinite loop');
          break;
        }
        
        pageCount++;
        
        // Safety check for extremely large datasets (10,000+ pages)
        if (pageCount > 10000) {
          console.log('Reached extreme page limit (10,000 pages), stopping pagination as safety measure');
          break;
        }
      } while (nextToken);

      setMemberships(allMemberships);

    } catch (error) {
      console.error('Error loading memberships:', error);
      toastRef.current({
        title: "Error loading memberships",
        description: error instanceof Error ? error.message : "Failed to load memberships",
        variant: "destructive",
      });
      setMemberships([]);
    } finally {
      setLoading(false);
    }
  }, [selectedUserId]);

  // Load channel members for selected channel
  const loadChannelMembers = useCallback(async (channelId?: string) => {
    if (!pubnubRef.current) return;
    
    const targetChannelId = channelId || selectedChannelId;
    if (!targetChannelId) return;

    setLoading(true);
    try {
      const allMembers: ChannelMemberData[] = [];
      let nextToken: string | undefined = undefined;
      
      // Fetch all channel members using pagination
      let previousToken: string | undefined = undefined;
      let pageCount = 0;
      const seenUserIds = new Set<string>();
      
      do {
        const result = await pubnubRef.current.objects.getChannelMembers({
          channel: targetChannelId,
          include: {
            customFields: true,
            UUIDFields: true,
            customUUIDFields: true,
            totalCount: true
          },
          limit: 100,
          ...(nextToken && { page: { next: nextToken } })
        });

        if (result.data && result.data.length > 0) {
          // Check if we're getting duplicate data
          const newMembers = result.data.filter((member: ChannelMemberData) => !seenUserIds.has(member.uuid.id));
          if (newMembers.length === 0) {
            console.log('No new members in this page, stopping pagination');
            break;
          }
          
          newMembers.forEach((member: ChannelMemberData) => {
            seenUserIds.add(member.uuid.id);
            allMembers.push(member);
          });
        }
        
        // Check if token is changing
        previousToken = nextToken;
        nextToken = result.next;
        
        if (nextToken && nextToken === previousToken) {
          console.log('Pagination token not changing, stopping to prevent infinite loop');
          break;
        }
        
        pageCount++;
        
        // Safety check for extremely large datasets (10,000+ pages)
        if (pageCount > 10000) {
          console.log('Reached extreme page limit (10,000 pages), stopping pagination as safety measure');
          break;
        }
      } while (nextToken);

      setChannelMembers(allMembers);

    } catch (error) {
      console.error('Error loading channel members:', error);
      toastRef.current({
        title: "Error loading channel members",
        description: error instanceof Error ? error.message : "Failed to load channel members",
        variant: "destructive",
      });
      setChannelMembers([]);
    } finally {
      setLoading(false);
    }
  }, [selectedChannelId]);

  // Handle tab change and load appropriate data
  const handleTabChange = (value: string) => {
    updateField('appContext.selectedTab', value);
    updateField('appContext.currentPage', 1);
    setSelectedItems(new Set());
    
    // Load data for the selected tab
    if (value === 'users') {
      loadUsers();
    } else if (value === 'channels') {
      loadChannels();
    } else if (value === 'memberships' && selectedUserId) {
      loadMemberships();
    } else if (value === 'channel-members' && selectedChannelId) {
      loadChannelMembers();
    }
  };

  // Get current data based on selected tab
  const getCurrentData = () => {
    switch (selectedTab) {
      case 'users':
        return users;
      case 'channels':
        return channels;
      case 'memberships':
        return memberships;
      case 'channel-members':
        return channelMembers;
      default:
        return [];
    }
  };

  // Filter and sort current data
  const filteredAndSortedData = useMemo(() => {
    const currentData = getCurrentData();
    if (!currentData || !Array.isArray(currentData)) {
      return [];
    }
    
    // Filter out any undefined/null items
    let filtered = currentData.filter(item => item != null);

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(item => {
        if (!item) return false;
        
        const searchFields = [];
        
        if (selectedTab === 'users') {
          const user = item as UserMetadata;
          if (user && user.id) {
            searchFields.push(user.id, user.name, user.email, user.externalId);
          }
        } else if (selectedTab === 'channels') {
          const channel = item as ChannelMetadata;
          if (channel && channel.id) {
            searchFields.push(channel.id, channel.name, channel.description);
          }
        } else if (selectedTab === 'memberships') {
          const membership = item as MembershipData;
          if (membership && membership.channel && membership.channel.id) {
            searchFields.push(membership.channel.id, membership.channel.name, membership.channel.description);
          }
        } else if (selectedTab === 'channel-members') {
          const member = item as ChannelMemberData;
          if (member && member.uuid && member.uuid.id) {
            searchFields.push(member.uuid.id, member.uuid.name, member.uuid.email);
          }
        }
        
        return searchFields.some(field => 
          field && field.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (!a || !b) return 0; // Safety check for null/undefined items
      
      let aValue, bValue;
      
      switch (sortBy) {
        case 'id':
          if (selectedTab === 'memberships') {
            const membershipA = a as MembershipData;
            const membershipB = b as MembershipData;
            aValue = membershipA?.channel?.id || '';
            bValue = membershipB?.channel?.id || '';
          } else if (selectedTab === 'channel-members') {
            const memberA = a as ChannelMemberData;
            const memberB = b as ChannelMemberData;
            aValue = memberA?.uuid?.id || '';
            bValue = memberB?.uuid?.id || '';
          } else {
            aValue = (a as any)?.id || '';
            bValue = (b as any)?.id || '';
          }
          break;
        case 'name':
          if (selectedTab === 'users') {
            const userA = a as UserMetadata;
            const userB = b as UserMetadata;
            aValue = userA?.name || userA?.id || '';
            bValue = userB?.name || userB?.id || '';
          } else if (selectedTab === 'channels') {
            const channelA = a as ChannelMetadata;
            const channelB = b as ChannelMetadata;
            aValue = channelA?.name || channelA?.id || '';
            bValue = channelB?.name || channelB?.id || '';
          } else if (selectedTab === 'memberships') {
            const membershipA = a as MembershipData;
            const membershipB = b as MembershipData;
            aValue = membershipA?.channel?.name || membershipA?.channel?.id || '';
            bValue = membershipB?.channel?.name || membershipB?.channel?.id || '';
          } else if (selectedTab === 'channel-members') {
            const memberA = a as ChannelMemberData;
            const memberB = b as ChannelMemberData;
            aValue = memberA?.uuid?.name || memberA?.uuid?.id || '';
            bValue = memberB?.uuid?.name || memberB?.uuid?.id || '';
          }
          break;
        case 'updated':
        default:
          aValue = (a as any)?.updated ? new Date((a as any).updated).getTime() : 0;
          bValue = (b as any)?.updated ? new Date((b as any).updated).getTime() : 0;
          break;
      }

      // Ensure we have valid values for comparison
      if (aValue == null) aValue = '';
      if (bValue == null) bValue = '';

      if (sortOrder === 'desc') {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      } else {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [getCurrentData, searchTerm, sortBy, sortOrder, selectedTab]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredAndSortedData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = filteredAndSortedData.slice(startIndex, endIndex);

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleString();
    } catch (error) {
      return dateString; // Return original string if parsing fails
    }
  };

  // Selection handlers
  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(itemId)) {
        newSelection.delete(itemId);
      } else {
        newSelection.add(itemId);
      }
      return newSelection;
    });
  };

  const selectAllVisible = () => {
    const visibleItemIds = new Set(paginatedData.map(item => {
      if (!item) return null;
      
      if (selectedTab === 'memberships') {
        const membership = item as MembershipData;
        return membership?.channel?.id;
      } else if (selectedTab === 'channel-members') {
        const member = item as ChannelMemberData;
        return member?.uuid?.id;
      }
      return (item as any)?.id;
    }).filter(id => id != null)); // Filter out null/undefined IDs
    setSelectedItems(visibleItemIds);
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  // Navigate to memberships tab with pre-populated user ID
  const navigateToMemberships = (userId: string) => {
    updateField('appContext.selectedUserId', userId);
    updateField('appContext.selectedTab', 'memberships');
    updateField('appContext.currentPage', 1);
    setSelectedItems(new Set());
    loadMemberships(userId);
  };

  // Navigate to channel members tab with pre-populated channel ID
  const navigateToChannelMembers = (channelId: string) => {
    updateField('appContext.selectedChannelId', channelId);
    updateField('appContext.selectedTab', 'channel-members');
    updateField('appContext.currentPage', 1);
    setSelectedItems(new Set());
    loadChannelMembers(channelId);
  };

  // Track if we've already loaded initial data
  const initialDataLoaded = useRef(false);
  
  // Load initial data when PubNub becomes ready
  useEffect(() => {
    if (!pubnub || initialDataLoaded.current) return;
    
    // Mark as loaded to prevent re-running
    initialDataLoaded.current = true;
    
    // Load default tab data (users) on initial mount
    setTimeout(() => {
      loadUsers();
    }, 100); // Small delay to ensure everything is ready
  }, [pubnub]); // Only depend on pubnub

  // Show loading while mounting or PubNub is initializing
  if (!mounted || !pubnubReady) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <RefreshCw className="w-16 h-16 text-pubnub-blue mx-auto mb-4 animate-spin" />
            <h3 className="text-xl font-semibold mb-2">Loading App Context Manager</h3>
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
            <p className="text-gray-600">Please configure your PubNub keys in Settings to use App Context Manager</p>
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
          <h1 className="text-2xl font-bold text-pubnub-text mb-2">PubNub App Context Manager</h1>
          <p className="text-gray-600">Administer users, channels, and memberships in your PubNub application</p>
        </div>

        {/* Main Layout */}
        <div className="flex-1 flex flex-col min-h-0">
          <Card className="flex-1 flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">App Context Objects</CardTitle>
                <Button
                  onClick={() => {
                    if (selectedTab === 'users') loadUsers(true);
                    else if (selectedTab === 'channels') loadChannels(true);
                    else if (selectedTab === 'memberships') loadMemberships();
                    else if (selectedTab === 'channel-members') loadChannelMembers();
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
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="users" className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Users ({users.length}){usersLoaded && <span className="text-xs opacity-60">•</span>}
                    </TabsTrigger>
                    <TabsTrigger value="channels" className="flex items-center gap-2">
                      <Hash className="w-4 h-4" />
                      Channels ({channels.length}){channelsLoaded && <span className="text-xs opacity-60">•</span>}
                    </TabsTrigger>
                    <TabsTrigger value="memberships" className="flex items-center gap-2">
                      <UserPlus className="w-4 h-4" />
                      Memberships ({memberships.length})
                    </TabsTrigger>
                    <TabsTrigger value="channel-members" className="flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Channel Members ({channelMembers.length})
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Controls Row */}
                <div className="p-6 border-b space-y-4">
                  <div className="flex items-center gap-4">
                    {/* Search */}
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input
                        placeholder={`Search ${selectedTab}...`}
                        value={searchTerm}
                        onChange={(e) => {
                          updateField('appContext.searchTerm', e.target.value);
                          updateField('appContext.currentPage', 1);
                        }}
                        className="pl-10"
                      />
                    </div>

                    {/* User/Channel selector for memberships */}
                    {selectedTab === 'memberships' && (
                      <div className="flex items-center gap-2">
                        <Label>User ID:</Label>
                        <Input
                          placeholder="Enter user ID"
                          value={selectedUserId}
                          onChange={(e) => updateField('appContext.selectedUserId', e.target.value)}
                          className="w-48"
                        />
                        <Button
                          onClick={() => loadMemberships()}
                          disabled={!selectedUserId || loading}
                          size="sm"
                        >
                          Load
                        </Button>
                      </div>
                    )}

                    {selectedTab === 'channel-members' && (
                      <div className="flex items-center gap-2">
                        <Label>Channel ID:</Label>
                        <Input
                          placeholder="Enter channel ID"
                          value={selectedChannelId}
                          onChange={(e) => updateField('appContext.selectedChannelId', e.target.value)}
                          className="w-48"
                        />
                        <Button
                          onClick={() => loadChannelMembers()}
                          disabled={!selectedChannelId || loading}
                          size="sm"
                        >
                          Load
                        </Button>
                      </div>
                    )}

                    {/* Page Size Selector */}
                    <div className="flex flex-col items-center">
                      <Select
                        value={pageSize.toString()}
                        onValueChange={(value) => {
                          updateField('appContext.pageSize', parseInt(value));
                          updateField('appContext.currentPage', 1);
                        }}
                      >
                        <SelectTrigger className="w-[70px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-xs text-gray-500 mt-1">per page</span>
                    </div>
                  </div>

                  {/* Selection and actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {selectedItems.size > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={clearSelection}
                        >
                          Clear
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={selectAllVisible}
                        disabled={filteredAndSortedData.length === 0}
                      >
                        Select Visible
                      </Button>

                      {selectedItems.size > 0 && (
                        <div className="text-sm text-gray-600">
                          {selectedItems.size} selected
                        </div>
                      )}
                    </div>

                    <div className="text-sm text-gray-600">
                      {searchTerm ? 
                        `${filteredAndSortedData.length} filtered` :
                        `${filteredAndSortedData.length} total`
                      }
                    </div>
                  </div>
                </div>

                {/* Data Tables */}
                <div className="flex-1 flex flex-col">
                  <TabsContent value="users" className="flex-1 flex flex-col m-0">
                    {loading ? (
                      <div className="p-8 text-center">
                        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
                        {loadingProgress ? (
                          <div>
                            <p className="text-lg font-medium mb-2">{loadingProgress.message}</p>
                            {loadingProgress.total && (
                              <div className="w-64 mx-auto bg-gray-200 rounded-full h-2 mb-2">
                                <div 
                                  className="bg-pubnub-blue h-2 rounded-full transition-all duration-300" 
                                  style={{ width: `${(loadingProgress.current / loadingProgress.total) * 100}%` }}
                                ></div>
                              </div>
                            )}
                            <p className="text-sm text-gray-600">
                              {loadingProgress.current} {loadingProgress.total ? `of ${loadingProgress.total}` : ''} loaded
                            </p>
                          </div>
                        ) : (
                          <p>Loading users...</p>
                        )}
                      </div>
                    ) : filteredAndSortedData.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="p-8 text-center">
                          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                          <p className="text-gray-500">
                            {searchTerm ? 'No users match your search criteria' : 'No users have been created yet'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col">
                        {/* Column Headers */}
                        <div className="grid grid-cols-[auto,200px,200px,200px,150px,100px,auto] gap-4 p-4 border-b bg-gray-50 text-sm font-medium text-gray-600">
                          <div className="flex items-center">
                            <Checkbox
                              checked={paginatedData.length > 0 && paginatedData.every(item => selectedItems.has((item as any).id))}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  selectAllVisible();
                                } else {
                                  clearSelection();
                                }
                              }}
                              className="data-[state=checked]:bg-pubnub-blue data-[state=checked]:border-pubnub-blue"
                            />
                          </div>
                          <button
                            className="flex items-center gap-1 hover:text-gray-900 transition-colors text-left"
                            onClick={() => handleSort('id')}
                          >
                            User ID
                            {sortBy === 'id' && (
                              sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                            )}
                            {sortBy !== 'id' && <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                          </button>
                          <button
                            className="flex items-center gap-1 hover:text-gray-900 transition-colors text-left"
                            onClick={() => handleSort('name')}
                          >
                            Name
                            {sortBy === 'name' && (
                              sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                            )}
                            {sortBy !== 'name' && <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                          </button>
                          <div>Email</div>
                          <button
                            className="flex items-center gap-1 hover:text-gray-900 transition-colors text-left"
                            onClick={() => handleSort('updated')}
                          >
                            Updated
                            {sortBy === 'updated' && (
                              sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                            )}
                            {sortBy !== 'updated' && <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                          </button>
                          <div className="text-center">Memberships</div>
                          <div className="w-10"></div>
                        </div>
                        
                        {/* User Rows */}
                        <div className="flex-1 divide-y overflow-y-auto">
                          {paginatedData.map((user, index) => {
                            const userData = user as UserMetadata;
                            return (
                              <div 
                                key={userData?.id || `user-${index}`} 
                                className={`grid grid-cols-[auto,200px,200px,200px,150px,100px,auto] gap-4 p-4 items-center transition-colors cursor-pointer ${
                                  selectedItems.has(userData.id) 
                                    ? 'bg-blue-50 hover:bg-blue-100' 
                                    : 'bg-white hover:bg-gray-50'
                                }`}
                                onClick={() => toggleItemSelection(userData.id)}
                              >
                                <div 
                                  className="flex items-center"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleItemSelection(userData.id);
                                  }}
                                >
                                  <Checkbox
                                    checked={selectedItems.has(userData.id)}
                                    className="data-[state=checked]:bg-pubnub-blue data-[state=checked]:border-pubnub-blue"
                                  />
                                </div>
                                <div className="truncate font-medium text-pubnub-blue">
                                  {userData.id}
                                </div>
                                <div className="truncate">
                                  {userData.name || '-'}
                                </div>
                                <div className="truncate">
                                  {userData.email || '-'}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {formatDate(userData.updated)}
                                </div>
                                <div className="flex justify-center">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigateToMemberships(userData.id);
                                    }}
                                    className="hover:bg-pubnub-blue hover:text-white"
                                    title={`View memberships for ${userData.name || userData.id}`}
                                  >
                                    <UserCheck className="w-4 h-4" />
                                  </Button>
                                </div>
                                <div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <MoreVertical className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                      <DropdownMenuItem onClick={() => {
                                        setEditingItem(userData);
                                        setShowEditDialog(true);
                                      }}>
                                        <Edit className="w-4 h-4 mr-2" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={async () => {
                                        try {
                                          await navigator.clipboard.writeText(userData.id);
                                          toast({
                                            title: "User ID copied",
                                            description: "User ID copied to clipboard",
                                          });
                                        } catch (error) {
                                          toast({
                                            title: "Copy failed",
                                            description: "Failed to copy user ID",
                                            variant: "destructive",
                                          });
                                        }
                                      }}>
                                        <Copy className="w-4 h-4 mr-2" />
                                        Copy ID
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="channels" className="flex-1 flex flex-col m-0">
                    {loading ? (
                      <div className="p-8 text-center">
                        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
                        {loadingProgress ? (
                          <div>
                            <p className="text-lg font-medium mb-2">{loadingProgress.message}</p>
                            {loadingProgress.total && (
                              <div className="w-64 mx-auto bg-gray-200 rounded-full h-2 mb-2">
                                <div 
                                  className="bg-pubnub-blue h-2 rounded-full transition-all duration-300" 
                                  style={{ width: `${(loadingProgress.current / loadingProgress.total) * 100}%` }}
                                ></div>
                              </div>
                            )}
                            <p className="text-sm text-gray-600">
                              {loadingProgress.current} {loadingProgress.total ? `of ${loadingProgress.total}` : ''} loaded
                            </p>
                          </div>
                        ) : (
                          <p>Loading channels...</p>
                        )}
                      </div>
                    ) : filteredAndSortedData.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="p-8 text-center">
                          <Hash className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No channels found</h3>
                          <p className="text-gray-500">
                            {searchTerm ? 'No channels match your search criteria' : 'No channels have been created yet'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col">
                        {/* Column Headers */}
                        <div className="grid grid-cols-[auto,200px,200px,300px,150px,100px,auto] gap-4 p-4 border-b bg-gray-50 text-sm font-medium text-gray-600">
                          <div className="flex items-center">
                            <Checkbox
                              checked={paginatedData.length > 0 && paginatedData.every(item => selectedItems.has((item as any).id))}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  selectAllVisible();
                                } else {
                                  clearSelection();
                                }
                              }}
                              className="data-[state=checked]:bg-pubnub-blue data-[state=checked]:border-pubnub-blue"
                            />
                          </div>
                          <button
                            className="flex items-center gap-1 hover:text-gray-900 transition-colors text-left"
                            onClick={() => handleSort('id')}
                          >
                            Channel ID
                            {sortBy === 'id' && (
                              sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                            )}
                            {sortBy !== 'id' && <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                          </button>
                          <button
                            className="flex items-center gap-1 hover:text-gray-900 transition-colors text-left"
                            onClick={() => handleSort('name')}
                          >
                            Name
                            {sortBy === 'name' && (
                              sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                            )}
                            {sortBy !== 'name' && <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                          </button>
                          <div>Description</div>
                          <button
                            className="flex items-center gap-1 hover:text-gray-900 transition-colors text-left"
                            onClick={() => handleSort('updated')}
                          >
                            Updated
                            {sortBy === 'updated' && (
                              sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                            )}
                            {sortBy !== 'updated' && <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                          </button>
                          <div className="text-center">Members</div>
                          <div className="w-10"></div>
                        </div>
                        
                        {/* Channel Rows */}
                        <div className="flex-1 divide-y overflow-y-auto">
                          {paginatedData.map((channel, index) => {
                            const channelData = channel as ChannelMetadata;
                            return (
                              <div 
                                key={channelData?.id || `channel-${index}`} 
                                className={`grid grid-cols-[auto,200px,200px,300px,150px,100px,auto] gap-4 p-4 items-center transition-colors cursor-pointer ${
                                  selectedItems.has(channelData.id) 
                                    ? 'bg-blue-50 hover:bg-blue-100' 
                                    : 'bg-white hover:bg-gray-50'
                                }`}
                                onClick={() => toggleItemSelection(channelData.id)}
                              >
                                <div 
                                  className="flex items-center"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleItemSelection(channelData.id);
                                  }}
                                >
                                  <Checkbox
                                    checked={selectedItems.has(channelData.id)}
                                    className="data-[state=checked]:bg-pubnub-blue data-[state=checked]:border-pubnub-blue"
                                  />
                                </div>
                                <div className="truncate font-medium text-pubnub-blue">
                                  {channelData.id}
                                </div>
                                <div className="truncate">
                                  {channelData.name || '-'}
                                </div>
                                <div className="truncate">
                                  {channelData.description || '-'}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {formatDate(channelData.updated)}
                                </div>
                                <div className="flex justify-center">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigateToChannelMembers(channelData.id);
                                    }}
                                    className="hover:bg-pubnub-blue hover:text-white"
                                    title={`View members for ${channelData.name || channelData.id}`}
                                  >
                                    <Users className="w-4 h-4" />
                                  </Button>
                                </div>
                                <div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <MoreVertical className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                      <DropdownMenuItem onClick={() => {
                                        setEditingItem(channelData);
                                        setShowEditDialog(true);
                                      }}>
                                        <Edit className="w-4 h-4 mr-2" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={async () => {
                                        try {
                                          await navigator.clipboard.writeText(channelData.id);
                                          toast({
                                            title: "Channel ID copied",
                                            description: "Channel ID copied to clipboard",
                                          });
                                        } catch (error) {
                                          toast({
                                            title: "Copy failed",
                                            description: "Failed to copy channel ID",
                                            variant: "destructive",
                                          });
                                        }
                                      }}>
                                        <Copy className="w-4 h-4 mr-2" />
                                        Copy ID
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="memberships" className="flex-1 flex flex-col m-0">
                    {!selectedUserId ? (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="p-8 text-center">
                          <UserPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a User</h3>
                          <p className="text-gray-500">Enter a User ID above to view their channel memberships</p>
                        </div>
                      </div>
                    ) : loading ? (
                      <div className="p-8 text-center">
                        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
                        <p>Loading memberships...</p>
                      </div>
                    ) : filteredAndSortedData.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="p-8 text-center">
                          <UserPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No memberships found</h3>
                          <p className="text-gray-500">
                            {searchTerm ? 'No memberships match your search criteria' : `User ${selectedUserId} has no channel memberships`}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col">
                        {/* Column Headers */}
                        <div className="grid grid-cols-[auto,200px,200px,300px,150px,auto] gap-4 p-4 border-b bg-gray-50 text-sm font-medium text-gray-600">
                          <div className="flex items-center">
                            <Checkbox
                              checked={paginatedData.length > 0 && paginatedData.every(item => {
                                const membership = item as MembershipData;
                                return membership?.channel?.id && selectedItems.has(membership.channel.id);
                              })}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  selectAllVisible();
                                } else {
                                  clearSelection();
                                }
                              }}
                              className="data-[state=checked]:bg-pubnub-blue data-[state=checked]:border-pubnub-blue"
                            />
                          </div>
                          <button
                            className="flex items-center gap-1 hover:text-gray-900 transition-colors text-left"
                            onClick={() => handleSort('id')}
                          >
                            Channel ID
                            {sortBy === 'id' && (
                              sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                            )}
                            {sortBy !== 'id' && <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                          </button>
                          <button
                            className="flex items-center gap-1 hover:text-gray-900 transition-colors text-left"
                            onClick={() => handleSort('name')}
                          >
                            Channel Name
                            {sortBy === 'name' && (
                              sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                            )}
                            {sortBy !== 'name' && <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                          </button>
                          <div>Description</div>
                          <button
                            className="flex items-center gap-1 hover:text-gray-900 transition-colors text-left"
                            onClick={() => handleSort('updated')}
                          >
                            Updated
                            {sortBy === 'updated' && (
                              sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                            )}
                            {sortBy !== 'updated' && <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                          </button>
                          <div className="w-10"></div>
                        </div>
                        
                        {/* Membership Rows */}
                        <div className="flex-1 divide-y overflow-y-auto">
                          {paginatedData
                            .filter((membership) => {
                              const membershipData = membership as MembershipData;
                              return membershipData?.channel?.id && typeof membershipData.channel.id === 'string';
                            })
                            .map((membership, index) => {
                            const membershipData = membership as MembershipData;
                            const channelId = membershipData.channel.id; // Safe to access since we filtered
                            
                            return (
                              <div 
                                key={`membership-${channelId || 'unknown'}-${index}`} 
                                className={`grid grid-cols-[auto,200px,200px,300px,150px,auto] gap-4 p-4 items-center transition-colors cursor-pointer ${
                                  selectedItems.has(channelId) 
                                    ? 'bg-blue-50 hover:bg-blue-100' 
                                    : 'bg-white hover:bg-gray-50'
                                }`}
                                onClick={() => toggleItemSelection(channelId)}
                              >
                                <div 
                                  className="flex items-center"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleItemSelection(channelId);
                                  }}
                                >
                                  <Checkbox
                                    checked={selectedItems.has(channelId)}
                                    className="data-[state=checked]:bg-pubnub-blue data-[state=checked]:border-pubnub-blue"
                                  />
                                </div>
                                <div className="truncate font-medium text-pubnub-blue">
                                  {channelId}
                                </div>
                                <div className="truncate">
                                  {membershipData.channel?.name || '-'}
                                </div>
                                <div className="truncate">
                                  {membershipData.channel?.description || '-'}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {formatDate(membershipData.updated)}
                                </div>
                                <div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <MoreVertical className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                      <DropdownMenuItem onClick={async () => {
                                        try {
                                          await navigator.clipboard.writeText(channelId);
                                          toast({
                                            title: "Channel ID copied",
                                            description: "Channel ID copied to clipboard",
                                          });
                                        } catch (error) {
                                          toast({
                                            title: "Copy failed",
                                            description: "Failed to copy channel ID",
                                            variant: "destructive",
                                          });
                                        }
                                      }}>
                                        <Copy className="w-4 h-4 mr-2" />
                                        Copy Channel ID
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="channel-members" className="flex-1 flex flex-col m-0">
                    {!selectedChannelId ? (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="p-8 text-center">
                          <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Channel</h3>
                          <p className="text-gray-500">Enter a Channel ID above to view its members</p>
                        </div>
                      </div>
                    ) : loading ? (
                      <div className="p-8 text-center">
                        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
                        <p>Loading channel members...</p>
                      </div>
                    ) : filteredAndSortedData.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="p-8 text-center">
                          <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No members found</h3>
                          <p className="text-gray-500">
                            {searchTerm ? 'No members match your search criteria' : `Channel ${selectedChannelId} has no members`}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col">
                        {/* Column Headers */}
                        <div className="grid grid-cols-[auto,200px,200px,200px,150px,auto] gap-4 p-4 border-b bg-gray-50 text-sm font-medium text-gray-600">
                          <div className="flex items-center">
                            <Checkbox
                              checked={paginatedData.length > 0 && paginatedData.every(item => {
                                const member = item as ChannelMemberData;
                                return member?.uuid?.id && selectedItems.has(member.uuid.id);
                              })}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  selectAllVisible();
                                } else {
                                  clearSelection();
                                }
                              }}
                              className="data-[state=checked]:bg-pubnub-blue data-[state=checked]:border-pubnub-blue"
                            />
                          </div>
                          <button
                            className="flex items-center gap-1 hover:text-gray-900 transition-colors text-left"
                            onClick={() => handleSort('id')}
                          >
                            User ID
                            {sortBy === 'id' && (
                              sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                            )}
                            {sortBy !== 'id' && <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                          </button>
                          <button
                            className="flex items-center gap-1 hover:text-gray-900 transition-colors text-left"
                            onClick={() => handleSort('name')}
                          >
                            Name
                            {sortBy === 'name' && (
                              sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                            )}
                            {sortBy !== 'name' && <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                          </button>
                          <div>Email</div>
                          <button
                            className="flex items-center gap-1 hover:text-gray-900 transition-colors text-left"
                            onClick={() => handleSort('updated')}
                          >
                            Updated
                            {sortBy === 'updated' && (
                              sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                            )}
                            {sortBy !== 'updated' && <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                          </button>
                          <div className="w-10"></div>
                        </div>
                        
                        {/* Channel Member Rows */}
                        <div className="flex-1 divide-y overflow-y-auto">
                          {paginatedData
                            .filter((member) => {
                              const memberData = member as ChannelMemberData;
                              return memberData?.uuid?.id && typeof memberData.uuid.id === 'string';
                            })
                            .map((member, index) => {
                            const memberData = member as ChannelMemberData;
                            const userId = memberData.uuid.id; // Safe to access since we filtered
                            
                            return (
                              <div 
                                key={`member-${userId || 'unknown'}-${index}`} 
                                className={`grid grid-cols-[auto,200px,200px,200px,150px,auto] gap-4 p-4 items-center transition-colors cursor-pointer ${
                                  selectedItems.has(userId) 
                                    ? 'bg-blue-50 hover:bg-blue-100' 
                                    : 'bg-white hover:bg-gray-50'
                                }`}
                                onClick={() => toggleItemSelection(userId)}
                              >
                                <div 
                                  className="flex items-center"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleItemSelection(userId);
                                  }}
                                >
                                  <Checkbox
                                    checked={selectedItems.has(userId)}
                                    className="data-[state=checked]:bg-pubnub-blue data-[state=checked]:border-pubnub-blue"
                                  />
                                </div>
                                <div className="truncate font-medium text-pubnub-blue">
                                  {userId}
                                </div>
                                <div className="truncate">
                                  {memberData.uuid?.name || '-'}
                                </div>
                                <div className="truncate">
                                  {memberData.uuid?.email || '-'}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {formatDate(memberData.updated)}
                                </div>
                                <div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <MoreVertical className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                      <DropdownMenuItem onClick={async () => {
                                        try {
                                          await navigator.clipboard.writeText(userId);
                                          toast({
                                            title: "User ID copied",
                                            description: "User ID copied to clipboard",
                                          });
                                        } catch (error) {
                                          toast({
                                            title: "Copy failed",
                                            description: "Failed to copy user ID",
                                            variant: "destructive",
                                          });
                                        }
                                      }}>
                                        <Copy className="w-4 h-4 mr-2" />
                                        Copy User ID
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </div>

                {/* Pagination Controls */}
                {filteredAndSortedData.length > pageSize && (
                  <div className="border-t p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        Page {currentPage} of {totalPages}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateField('appContext.currentPage', Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronDown className="w-4 h-4 rotate-90" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateField('appContext.currentPage', Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                          <ChevronDown className="w-4 h-4 -rotate-90" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}