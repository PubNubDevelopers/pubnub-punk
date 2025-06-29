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
  status?: string;
  type?: string;
  custom?: Record<string, any>;
  updated: string;
  eTag: string;
}

interface ChannelMetadata {
  id: string;
  name?: string;
  description?: string;
  status?: string;
  type?: string;
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deletingItem, setDeletingItem] = useState<any>(null);
  const [newItemData, setNewItemData] = useState<any>({});

  // Cache tracking
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [channelsLoaded, setChannelsLoaded] = useState(false);
  const [usersLastLoaded, setUsersLastLoaded] = useState<Date | null>(null);
  const [channelsLastLoaded, setChannelsLastLoaded] = useState<Date | null>(null);

  // Contextual view tracking
  const [showMemberships, setShowMemberships] = useState(false);
  const [showChannelMembers, setShowChannelMembers] = useState(false);
  const [currentMembershipsUserId, setCurrentMembershipsUserId] = useState<string>('');
  const [currentChannelMembersChannelId, setCurrentChannelMembersChannelId] = useState<string>('');

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
    hideContextualViews(); // Hide any contextual views when switching tabs
    
    // Load data for the selected tab
    if (value === 'users') {
      loadUsers();
    } else if (value === 'channels') {
      loadChannels();
    }
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
          aValue = (a as any)?.id || '';
          bValue = (b as any)?.id || '';
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
      return (item as any)?.id;
    }).filter(id => id != null)); // Filter out null/undefined IDs
    setSelectedItems(visibleItemIds);
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  // Show memberships for a specific user
  const showUserMemberships = (userId: string) => {
    setCurrentMembershipsUserId(userId);
    setShowMemberships(true);
    setShowChannelMembers(false);
    updateField('appContext.selectedUserId', userId);
    updateField('appContext.currentPage', 1);
    setSelectedItems(new Set());
    loadMemberships(userId);
  };

  // Show members for a specific channel
  const showChannelMembersList = (channelId: string) => {
    setCurrentChannelMembersChannelId(channelId);
    setShowChannelMembers(true);
    setShowMemberships(false);
    updateField('appContext.selectedChannelId', channelId);
    updateField('appContext.currentPage', 1);
    setSelectedItems(new Set());
    loadChannelMembers(channelId);
  };

  // Hide contextual views
  const hideContextualViews = () => {
    setShowMemberships(false);
    setShowChannelMembers(false);
    setCurrentMembershipsUserId('');
    setCurrentChannelMembersChannelId('');
  };

  // Handle saving edited item
  const handleSaveEdit = useCallback(async (updatedData: any) => {
    if (!pubnubRef.current || !editingItem) return;

    try {
      if (selectedTab === 'users') {
        // Update user metadata
        const userData = {
          name: updatedData.name || undefined,
          email: updatedData.email || undefined,
          externalId: updatedData.externalId || undefined,
          profileUrl: updatedData.profileUrl || undefined,
          status: updatedData.status || undefined,
          type: updatedData.type || undefined,
          custom: updatedData.custom || undefined
        };

        // Remove undefined values to avoid overwriting with null
        Object.keys(userData).forEach(key => {
          if (userData[key as keyof typeof userData] === undefined || userData[key as keyof typeof userData] === '') {
            delete userData[key as keyof typeof userData];
          }
        });

        const result = await pubnubRef.current.objects.setUUIDMetadata({
          uuid: updatedData.id,
          data: userData,
          include: { customFields: true }
        });

        // Update local state
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user.id === updatedData.id 
              ? { ...user, ...result.data }
              : user
          )
        );

        toastRef.current({
          title: "User updated",
          description: `User ${updatedData.name || updatedData.id} has been updated successfully.`,
        });

      } else if (selectedTab === 'channels') {
        // Update channel metadata
        const channelData = {
          name: updatedData.name || undefined,
          description: updatedData.description || undefined,
          status: updatedData.status || undefined,
          type: updatedData.type || undefined,
          custom: updatedData.custom || undefined
        };

        // Remove undefined values to avoid overwriting with null
        Object.keys(channelData).forEach(key => {
          if (channelData[key as keyof typeof channelData] === undefined || channelData[key as keyof typeof channelData] === '') {
            delete channelData[key as keyof typeof channelData];
          }
        });

        const result = await pubnubRef.current.objects.setChannelMetadata({
          channel: updatedData.id,
          data: channelData,
          include: { customFields: true }
        });

        // Update local state
        setChannels(prevChannels => 
          prevChannels.map(channel => 
            channel.id === updatedData.id 
              ? { ...channel, ...result.data }
              : channel
          )
        );

        toastRef.current({
          title: "Channel updated",
          description: `Channel ${updatedData.name || updatedData.id} has been updated successfully.`,
        });
      }

      // Close dialog and reset state
      setShowEditDialog(false);
      setEditingItem(null);

    } catch (error) {
      console.error('Error updating metadata:', error);
      toastRef.current({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update metadata",
        variant: "destructive",
      });
    }
  }, [selectedTab, editingItem]);

  // Handle deleting item
  const handleDeleteItem = useCallback(async () => {
    if (!pubnubRef.current || !deletingItem) return;

    try {
      if (selectedTab === 'users') {
        // Delete user metadata
        await pubnubRef.current.objects.removeUUIDMetadata({
          uuid: deletingItem.id
        });

        // Update local state
        setUsers(prevUsers => 
          prevUsers.filter(user => user.id !== deletingItem.id)
        );

        toastRef.current({
          title: "User deleted",
          description: `User ${deletingItem.name || deletingItem.id} has been deleted successfully.`,
        });

      } else if (selectedTab === 'channels') {
        // Delete channel metadata
        await pubnubRef.current.objects.removeChannelMetadata({
          channel: deletingItem.id
        });

        // Update local state
        setChannels(prevChannels => 
          prevChannels.filter(channel => channel.id !== deletingItem.id)
        );

        toastRef.current({
          title: "Channel deleted",
          description: `Channel ${deletingItem.name || deletingItem.id} has been deleted successfully.`,
        });
      }

      // Close dialog and reset state
      setShowDeleteDialog(false);
      setDeletingItem(null);

      // Clear selection if the deleted item was selected
      setSelectedItems(prev => {
        const newSelection = new Set(prev);
        newSelection.delete(deletingItem.id);
        return newSelection;
      });

    } catch (error) {
      console.error('Error deleting item:', error);
      toastRef.current({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete item",
        variant: "destructive",
      });
    }
  }, [selectedTab, deletingItem]);

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
                    {showMemberships ? (
                      // Memberships View
                      <div className="flex-1 flex flex-col">
                        <div className="p-4 bg-gray-50 flex items-center justify-between border-b">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={hideContextualViews}
                              className="hover:bg-gray-200"
                            >
                              ← Back to Users
                            </Button>
                            <div className="h-4 w-px bg-gray-300" />
                            <h3 className="text-lg font-medium">
                              Memberships for User: <span className="text-pubnub-blue font-mono">{currentMembershipsUserId}</span>
                            </h3>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={hideContextualViews}
                            className="hover:bg-gray-200"
                          >
                            ✕ Close
                          </Button>
                        </div>
                        <div className="flex-1 p-4">
                          {loading ? (
                            <div className="text-center py-8">
                              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                              <p>Loading memberships...</p>
                            </div>
                          ) : memberships.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                              <UserPlus className="w-12 h-12 mx-auto mb-2 opacity-50" />
                              <p>User has no channel memberships</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {memberships.map((membership, index) => {
                                const channelId = membership.channel.id;
                                return (
                                  <div
                                    key={`membership-${channelId}-${index}`}
                                    className="flex items-center justify-between p-3 bg-white border rounded-lg hover:bg-gray-50"
                                  >
                                    <div>
                                      <div className="font-medium text-pubnub-blue">{channelId}</div>
                                      <div className="text-sm text-gray-600">{membership.channel.name || 'No name'}</div>
                                      {membership.channel.description && (
                                        <div className="text-xs text-gray-500 mt-1">{membership.channel.description}</div>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      {formatDate(membership.updated)}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : loading ? (
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
                            <Edit className="w-3 h-3 opacity-50" title="Click User ID to edit" />
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
                                <div 
                                  className="truncate font-medium text-pubnub-blue cursor-pointer hover:underline hover:text-pubnub-blue/80 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingItem(userData);
                                    setShowEditDialog(true);
                                  }}
                                  title="Click to edit user"
                                >
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
                                      showUserMemberships(userData.id);
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
                                      <DropdownMenuItem 
                                        onClick={() => {
                                          setDeletingItem(userData);
                                          setShowDeleteDialog(true);
                                        }}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete
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
                    {showChannelMembers ? (
                      // Channel Members View
                      <div className="flex-1 flex flex-col">
                        <div className="p-4 bg-gray-50 flex items-center justify-between border-b">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={hideContextualViews}
                              className="hover:bg-gray-200"
                            >
                              ← Back to Channels
                            </Button>
                            <div className="h-4 w-px bg-gray-300" />
                            <h3 className="text-lg font-medium">
                              Members of Channel: <span className="text-pubnub-blue font-mono">{currentChannelMembersChannelId}</span>
                            </h3>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={hideContextualViews}
                            className="hover:bg-gray-200"
                          >
                            ✕ Close
                          </Button>
                        </div>
                        <div className="flex-1 p-4">
                          {loading ? (
                            <div className="text-center py-8">
                              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                              <p>Loading channel members...</p>
                            </div>
                          ) : channelMembers.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                              <Settings className="w-12 h-12 mx-auto mb-2 opacity-50" />
                              <p>Channel has no members</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {channelMembers.map((member, index) => {
                                const userId = member.uuid.id;
                                return (
                                  <div
                                    key={`member-${userId}-${index}`}
                                    className="flex items-center justify-between p-3 bg-white border rounded-lg hover:bg-gray-50"
                                  >
                                    <div>
                                      <div className="font-medium text-pubnub-blue">{userId}</div>
                                      <div className="text-sm text-gray-600">{member.uuid.name || 'No name'}</div>
                                      {member.uuid.email && (
                                        <div className="text-xs text-gray-500 mt-1">{member.uuid.email}</div>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      {formatDate(member.updated)}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : loading ? (
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
                            <Edit className="w-3 h-3 opacity-50" title="Click Channel ID to edit" />
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
                                <div 
                                  className="truncate font-medium text-pubnub-blue cursor-pointer hover:underline hover:text-pubnub-blue/80 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingItem(channelData);
                                    setShowEditDialog(true);
                                  }}
                                  title="Click to edit channel"
                                >
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
                                      showChannelMembersList(channelData.id);
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
                                      <DropdownMenuItem 
                                        onClick={() => {
                                          setDeletingItem(channelData);
                                          setShowDeleteDialog(true);
                                        }}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete
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

        {/* User Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedTab === 'users' ? 'Edit User' : 'Edit Channel'}
              </DialogTitle>
              <DialogDescription>
                {selectedTab === 'users' 
                  ? 'Update user metadata and custom fields'
                  : 'Update channel metadata and custom fields'
                }
              </DialogDescription>
            </DialogHeader>
            
            {editingItem && (
              <UserEditForm
                item={editingItem}
                itemType={selectedTab as 'users' | 'channels'}
                onSave={handleSaveEdit}
                onCancel={() => {
                  setShowEditDialog(false);
                  setEditingItem(null);
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm Delete</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this {selectedTab === 'users' ? 'user' : 'channel'}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            
            {deletingItem && (
              <div className="py-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {selectedTab === 'users' ? (
                      <Users className="w-8 h-8 text-gray-400" />
                    ) : (
                      <Hash className="w-8 h-8 text-gray-400" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{deletingItem.name || deletingItem.id}</p>
                      <p className="text-sm text-gray-500">ID: {deletingItem.id}</p>
                      {deletingItem.email && (
                        <p className="text-sm text-gray-500">Email: {deletingItem.email}</p>
                      )}
                      {deletingItem.description && (
                        <p className="text-sm text-gray-500">Description: {deletingItem.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDeleteDialog(false);
                  setDeletingItem(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteItem}
                className="bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete {selectedTab === 'users' ? 'User' : 'Channel'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// User Edit Form Component
interface UserEditFormProps {
  item: UserMetadata | ChannelMetadata;
  itemType: 'users' | 'channels';
  onSave: (updatedData: any) => Promise<void>;
  onCancel: () => void;
}

function UserEditForm({ item, itemType, onSave, onCancel }: UserEditFormProps) {
  const [formData, setFormData] = useState(() => {
    if (itemType === 'users') {
      const user = item as UserMetadata;
      return {
        id: user.id,
        name: user.name || '',
        email: user.email || '',
        externalId: user.externalId || '',
        profileUrl: user.profileUrl || '',
        status: user.status || '',
        type: user.type || '',
        custom: user.custom || {}
      };
    } else {
      const channel = item as ChannelMetadata;
      return {
        id: channel.id,
        name: channel.name || '',
        description: channel.description || '',
        status: channel.status || '',
        type: channel.type || '',
        custom: channel.custom || {}
      };
    }
  });

  const [loading, setLoading] = useState(false);
  const [customFields, setCustomFields] = useState<Array<{key: string, value: string, type: 'string' | 'number' | 'boolean', error?: string}>>(() => {
    const custom = formData.custom as Record<string, any>;
    return Object.entries(custom).map(([key, value]) => ({
      key,
      value: String(value),
      type: typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : 'string'
    }));
  });

  const addCustomField = () => {
    setCustomFields(prev => [...prev, { key: '', value: '', type: 'string' }]);
  };

  const removeCustomField = (index: number) => {
    setCustomFields(prev => prev.filter((_, i) => i !== index));
  };

  const validateFieldValue = (value: string, type: 'string' | 'number' | 'boolean'): string | undefined => {
    if (!value.trim()) return undefined; // Empty values are allowed
    
    switch (type) {
      case 'number':
        const num = parseFloat(value);
        if (isNaN(num)) {
          return 'Must be a valid number';
        }
        return undefined;
      case 'boolean':
        const lowerValue = value.toLowerCase().trim();
        if (lowerValue !== 'true' && lowerValue !== 'false') {
          return 'Must be "true" or "false"';
        }
        return undefined;
      default:
        return undefined; // Strings are always valid
    }
  };

  const updateCustomField = (index: number, field: 'key' | 'value' | 'type', newValue: string) => {
    setCustomFields(prev => prev.map((item, i) => {
      if (i !== index) return item;
      
      const updatedItem = { ...item, [field]: newValue };
      
      // Validate when value or type changes
      if (field === 'value' || field === 'type') {
        const error = validateFieldValue(
          field === 'value' ? newValue : item.value,
          field === 'type' ? newValue as 'string' | 'number' | 'boolean' : item.type
        );
        updatedItem.error = error;
      }
      
      return updatedItem;
    }));
  };

  const convertValue = (value: string, type: 'string' | 'number' | 'boolean') => {
    if (!value.trim()) return undefined; // Don't include empty values
    
    switch (type) {
      case 'number':
        const num = parseFloat(value);
        return isNaN(num) ? 0 : num;
      case 'boolean':
        return value.toLowerCase().trim() === 'true';
      default:
        return value;
    }
  };

  // Check if there are any validation errors
  const hasValidationErrors = customFields.some(field => field.error);
  const hasEmptyKeys = customFields.some(field => field.key.trim() && !field.value.trim());
  const hasDuplicateKeys = customFields.some((field, index) => 
    field.key.trim() && customFields.findIndex(f => f.key.trim() === field.key.trim()) !== index
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check for validation errors
    if (hasValidationErrors) {
      return; // Don't submit if there are validation errors
    }

    if (hasDuplicateKeys) {
      return; // Don't submit if there are duplicate keys
    }

    setLoading(true);
    try {
      // Build custom object from custom fields
      const customData: Record<string, any> = {};
      customFields.forEach(field => {
        if (field.key.trim() && field.value.trim()) {
          customData[field.key.trim()] = convertValue(field.value, field.type);
        }
      });

      const updateData: any = {
        ...formData,
        custom: Object.keys(customData).length > 0 ? customData : undefined
      };

      // Remove empty fields to avoid overwriting with empty strings
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === '' && key !== 'id') {
          delete updateData[key];
        }
      });

      await onSave(updateData);
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {/* ID Field (Read-only) */}
        <div className="col-span-2">
          <Label htmlFor="id">ID</Label>
          <Input
            id="id"
            value={formData.id}
            disabled
            className="bg-gray-50 text-gray-600"
          />
          <p className="text-xs text-gray-500 mt-1">ID cannot be changed</p>
        </div>

        {/* Name Field */}
        <div className="col-span-1">
          <Label htmlFor="name">
            {itemType === 'users' ? 'Display Name' : 'Channel Name'}
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder={itemType === 'users' ? 'Enter display name' : 'Enter channel name'}
          />
        </div>

        {/* Status Field */}
        <div className="col-span-1">
          <Label htmlFor="status">Status</Label>
          <Input
            id="status"
            value={formData.status}
            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
            placeholder="Enter status (e.g., active, inactive)"
          />
        </div>

        {/* Type Field */}
        <div className="col-span-1">
          <Label htmlFor="type">Type</Label>
          <Input
            id="type"
            value={formData.type}
            onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
            placeholder={itemType === 'users' ? 'Enter user type (e.g., admin, member)' : 'Enter channel type (e.g., public, private)'}
          />
        </div>

        {/* Email Field (Users only) */}
        {itemType === 'users' && (
          <div className="col-span-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={(formData as any).email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="Enter email address"
            />
          </div>
        )}

        {/* Description Field (Channels only) */}
        {itemType === 'channels' && (
          <div className="col-span-1">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={(formData as any).description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter channel description"
            />
          </div>
        )}

        {/* External ID Field (Users only) */}
        {itemType === 'users' && (
          <div className="col-span-1">
            <Label htmlFor="externalId">External ID</Label>
            <Input
              id="externalId"
              value={(formData as any).externalId}
              onChange={(e) => setFormData(prev => ({ ...prev, externalId: e.target.value }))}
              placeholder="Enter external system ID"
            />
          </div>
        )}

        {/* Profile URL Field (Users only) */}
        {itemType === 'users' && (
          <div className="col-span-1">
            <Label htmlFor="profileUrl">Profile URL</Label>
            <Input
              id="profileUrl"
              type="url"
              value={(formData as any).profileUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, profileUrl: e.target.value }))}
              placeholder="Enter profile picture URL"
            />
          </div>
        )}
      </div>

      {/* Custom Fields */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label>Custom Fields</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addCustomField}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Field
          </Button>
        </div>
        
        {customFields.length === 0 ? (
          <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
            <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No custom fields</p>
            <p className="text-xs">Click "Add Field" to add custom metadata</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {customFields.map((field, index) => {
              const isDuplicateKey = field.key.trim() && 
                customFields.findIndex(f => f.key.trim() === field.key.trim()) !== index;
              
              return (
                <div key={index} className="space-y-2">
                  <div className={`grid grid-cols-12 gap-2 items-center p-3 border rounded-lg ${
                    field.error || isDuplicateKey ? 'border-red-300 bg-red-50' : ''
                  }`}>
                    <div className="col-span-4">
                      <Input
                        placeholder="Field name"
                        value={field.key}
                        onChange={(e) => updateCustomField(index, 'key', e.target.value)}
                        className={`text-sm ${isDuplicateKey ? 'border-red-500' : ''}`}
                      />
                    </div>
                    <div className="col-span-4">
                      <Input
                        placeholder="Field value"
                        value={field.value}
                        onChange={(e) => updateCustomField(index, 'value', e.target.value)}
                        className={`text-sm ${field.error ? 'border-red-500' : ''}`}
                      />
                    </div>
                    <div className="col-span-3">
                      <Select
                        value={field.type}
                        onValueChange={(value: 'string' | 'number' | 'boolean') => updateCustomField(index, 'type', value)}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="string">String</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="boolean">Boolean</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCustomField(index)}
                        className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Error Messages */}
                  {field.error && (
                    <p className="text-sm text-red-600 ml-3 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {field.error}
                    </p>
                  )}
                  {isDuplicateKey && (
                    <p className="text-sm text-red-600 ml-3 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      Duplicate field name
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        <div className="mt-2 space-y-1">
          <p className="text-xs text-gray-500">
            Add custom metadata fields with proper data types. Boolean values should be "true" or "false".
          </p>
          {(hasValidationErrors || hasDuplicateKeys) && (
            <p className="text-xs text-red-600 flex items-center">
              <AlertCircle className="w-3 h-3 mr-1" />
              Please fix validation errors before saving
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading || hasValidationErrors || hasDuplicateKeys}
          className="bg-pubnub-blue hover:bg-pubnub-blue/90"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}