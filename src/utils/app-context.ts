import { UserMetadata, ChannelMetadata, MembershipData, ChannelMemberData, AppContextTab, SortOrder } from '@/types/app-context';

export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const filterData = (
  data: (UserMetadata | ChannelMetadata | MembershipData | ChannelMemberData)[],
  searchTerm: string,
  selectedTab: AppContextTab
): (UserMetadata | ChannelMetadata | MembershipData | ChannelMemberData)[] => {
  if (!searchTerm) return data;
  
  const searchLower = searchTerm.toLowerCase();
  
  return data.filter(item => {
    if (selectedTab === 'users') {
      const user = item as UserMetadata;
      return (
        user.id.toLowerCase().includes(searchLower) ||
        (user.name || '').toLowerCase().includes(searchLower) ||
        (user.email || '').toLowerCase().includes(searchLower)
      );
    } else {
      const channel = item as ChannelMetadata;
      return (
        channel.id.toLowerCase().includes(searchLower) ||
        (channel.name || '').toLowerCase().includes(searchLower) ||
        (channel.description || '').toLowerCase().includes(searchLower)
      );
    }
  });
};

export const sortData = (
  data: (UserMetadata | ChannelMetadata | MembershipData | ChannelMemberData)[],
  sortBy: string,
  sortOrder: SortOrder,
  selectedTab: AppContextTab
): (UserMetadata | ChannelMetadata | MembershipData | ChannelMemberData)[] => {
  return [...data].sort((a, b) => {
    let aValue: any, bValue: any;
    
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
};

export const paginateData = <T>(
  data: T[],
  currentPage: number,
  pageSize: number
): { paginatedData: T[]; totalPages: number; startIndex: number; endIndex: number } => {
  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = data.slice(startIndex, endIndex);
  
  return {
    paginatedData,
    totalPages,
    startIndex,
    endIndex
  };
};

export const getItemDisplayName = (item: UserMetadata | ChannelMetadata): string => {
  if ('name' in item && item.name) {
    return item.name;
  }
  return item.id;
};

export const getItemKey = (item: UserMetadata | ChannelMetadata | MembershipData | ChannelMemberData): string => {
  if ('id' in item) {
    return item.id;
  }
  if ('channel' in item) {
    return (item as MembershipData).channel.id;
  }
  if ('uuid' in item) {
    return (item as ChannelMemberData).uuid.id;
  }
  return '';
};

export const validateCustomFields = (customFields: Array<{ key: string; value: string; type: string }>): Record<string, any> => {
  const result: Record<string, any> = {};
  
  customFields.forEach(field => {
    if (field.key.trim()) {
      let value: any = field.value;
      
      switch (field.type) {
        case 'number':
          const num = parseFloat(field.value);
          if (!isNaN(num)) {
            value = num;
          }
          break;
        case 'boolean':
          value = field.value.toLowerCase() === 'true';
          break;
        case 'string':
        default:
          value = field.value;
          break;
      }
      
      result[field.key.trim()] = value;
    }
  });
  
  return result;
};

export const parseCustomFieldsFromObject = (custom: Record<string, any> | undefined): Array<{ key: string; value: string; type: string }> => {
  if (!custom) return [];
  
  return Object.entries(custom).map(([key, value]) => ({
    key,
    value: String(value),
    type: typeof value
  }));
};

export const generatePlaceholders = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `placeholder-${i}`,
    isPlaceholder: true
  }));
};

export const hasCustomFields = (item: UserMetadata | ChannelMetadata | MembershipData | ChannelMemberData): boolean => {
  return !!(item.custom && Object.keys(item.custom).length > 0);
};

export const getCustomFieldsDisplay = (custom: Record<string, any> | undefined): string => {
  if (!custom || Object.keys(custom).length === 0) return '';
  
  return Object.entries(custom)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');
};