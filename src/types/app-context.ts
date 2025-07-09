// Data interfaces based on PubNub App Context APIs
export interface UserMetadata {
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

export interface ChannelMetadata {
  id: string;
  name?: string;
  description?: string;
  status?: string;
  type?: string;
  custom?: Record<string, any>;
  updated: string;
  eTag: string;
}

export interface MembershipData {
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

export interface ChannelMemberData {
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
export const FIELD_DEFINITIONS = {
  'appContext.selectedTab': { section: 'appContext', field: 'selectedTab', type: 'string', default: 'users' },
  'appContext.searchTerm': { section: 'appContext', field: 'searchTerm', type: 'string', default: '' },
  'appContext.sortBy': { section: 'appContext', field: 'sortBy', type: 'string', default: 'updated' },
  'appContext.sortOrder': { section: 'appContext', field: 'sortOrder', type: 'string', default: 'desc' },
  'appContext.pageSize': { section: 'appContext', field: 'pageSize', type: 'number', default: 50 },
  'appContext.currentPage': { section: 'appContext', field: 'currentPage', type: 'number', default: 1 },
  'appContext.selectedUserId': { section: 'appContext', field: 'selectedUserId', type: 'string', default: '' },
  'appContext.selectedChannelId': { section: 'appContext', field: 'selectedChannelId', type: 'string', default: '' },
} as const;

// Additional types for component props and state
export interface LoadingProgress {
  current: number;
  total?: number;
  message: string;
}

export interface DeleteResults {
  successful: number;
  failed: number;
  cancelled: number;
  errors: string[];
  fullLog: string;
}

export interface DeleteProgress {
  current: number;
  total: number;
  currentItem: string;
}

export type AppContextTab = 'users' | 'channels';
export type SortOrder = 'asc' | 'desc';

export interface AppContextPageSettings {
  appContext: {
    selectedTab: AppContextTab;
    searchTerm: string;
    sortBy: string;
    sortOrder: SortOrder;
    pageSize: number;
    currentPage: number;
    selectedUserId: string;
    selectedChannelId: string;
  };
  configForSaving: {
    selectedTab: AppContextTab;
    timestamp: string;
  };
}

export interface CustomField {
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean';
}