// PubSub Component Types and Interfaces
// Extracted from original monolithic pubsub.tsx for modular architecture

// Schema-driven field definition structure
export interface FieldDefinition {
  section: string;
  field: string;
  type: 'string' | 'number' | 'boolean';
  default: string | number | boolean;
}

// Field definitions for bidirectional sync
export const FIELD_DEFINITIONS: Record<string, FieldDefinition> = {
  // Publish Panel
  'publish.channel': { section: 'publish', field: 'channel', type: 'string', default: 'hello_world' },
  'publish.message': { section: 'publish', field: 'message', type: 'string', default: '{"text": "Hello, World!", "sender": "PubNub Developer Tools"}' },
  'publish.storeInHistory': { section: 'publish', field: 'storeInHistory', type: 'boolean', default: true },
  'publish.sendByPost': { section: 'publish', field: 'sendByPost', type: 'boolean', default: false },
  'publish.ttl': { section: 'publish', field: 'ttl', type: 'string', default: '' },
  'publish.customMessageType': { section: 'publish', field: 'customMessageType', type: 'string', default: 'text-message' },
  'publish.meta': { section: 'publish', field: 'meta', type: 'string', default: '' },
  
  // Subscribe Panel
  'subscribe.channels': { section: 'subscribe', field: 'channels', type: 'string', default: 'hello_world' },
  'subscribe.channelGroups': { section: 'subscribe', field: 'channelGroups', type: 'string', default: '' },
  'subscribe.receivePresenceEvents': { section: 'subscribe', field: 'receivePresenceEvents', type: 'boolean', default: false },
  'subscribe.cursor.timetoken': { section: 'subscribe', field: 'cursor.timetoken', type: 'string', default: '' },
  'subscribe.cursor.region': { section: 'subscribe', field: 'cursor.region', type: 'string', default: '' },
  'subscribe.withPresence': { section: 'subscribe', field: 'withPresence', type: 'boolean', default: false },
  'subscribe.heartbeat': { section: 'subscribe', field: 'heartbeat', type: 'number', default: 300 },
  'subscribe.restoreOnReconnect': { section: 'subscribe', field: 'restoreOnReconnect', type: 'boolean', default: true },
  
  // UI State
  'ui.showAdvanced': { section: 'ui', field: 'showAdvanced', type: 'boolean', default: false },
  'ui.showFilters': { section: 'ui', field: 'showFilters', type: 'boolean', default: false },
  'ui.showMessages': { section: 'ui', field: 'showMessages', type: 'boolean', default: true },
  'ui.messagesHeight': { section: 'ui', field: 'messagesHeight', type: 'number', default: 200 },
  'ui.showRawMessageData': { section: 'ui', field: 'showRawMessageData', type: 'boolean', default: false },
  
  // Filter Settings
  'filters.logic': { section: 'filters', field: 'logic', type: 'string', default: '&&' },
} as const;

// Configuration version and migration types
export const CURRENT_CONFIG_VERSION = 1;

export type ConfigMigration = (config: any) => any;

export const CONFIG_MIGRATIONS: Record<number, ConfigMigration> = {
  1: (config: any) => config, // Initial version, no migration needed
};

// Core data interfaces
export interface PublishFormData {
  channel: string;
  message: string;
  storeInHistory: boolean;
  sendByPost: boolean;
  ttl: string;
  customMessageType: string;
  meta: string;
}

export interface CursorData {
  timetoken: string;
  region: string;
}

export interface SubscribeFormData {
  channels: string;
  channelGroups: string;
  receivePresenceEvents: boolean;
  cursor: CursorData;
  withPresence: boolean;
  heartbeat: number;
  restoreOnReconnect: boolean;
}

export interface UIState {
  showAdvanced: boolean;
  showFilters: boolean;
  showMessages: boolean;
  messagesHeight: number;
  showRawMessageData: boolean;
}

export interface FilterConfig {
  id: number;
  target: string;
  field: string;
  operator: string;
  value: string;
  type: 'string' | 'number' | 'boolean';
}

export interface FilterState {
  logic: string;
  conditions: FilterConfig[];
}

export interface PubSubConfig {
  publish: PublishFormData;
  subscribe: SubscribeFormData;
  ui: UIState;
  filters: FilterState;
  _version: number;
}

// Message and event interfaces
export interface MessageData {
  channel: string;
  subscription?: string;
  timetoken: string;
  message: any;
  publisher?: string;
  actualChannel?: string;
  subscribedChannel?: string;
  userMetadata?: any;
  messageType?: string;
}

export interface PresenceEvent {
  action: 'join' | 'leave' | 'state-change' | 'timeout';
  channel: string;
  occupancy: number;
  state?: any;
  timetoken: string;
  uuid: string;
  subscription?: string;
  actualChannel?: string;
  subscribedChannel?: string;
}

// Status and state interfaces
export interface PublishStatus {
  isVisible: boolean;
  isSuccess: boolean;
  timetoken?: string;
  isFlashing: boolean;
}

export interface ConnectionStatus {
  isConnected: boolean;
  isSubscribed: boolean;
  messageCount: number;
  error?: string;
}

// Component prop interfaces
export interface PubSubPageProps {
  className?: string;
}

export interface LiveMessagesPanelProps {
  messages: MessageData[];
  presenceEvents: PresenceEvent[];
  isSubscribed: boolean;
  receivePresenceEvents: boolean;
  showRawMessageData: boolean;
  showMessages: boolean;
  messagesHeight: number;
  onReceivePresenceEventsChange: (value: boolean) => void;
  onShowRawMessageDataChange: (value: boolean) => void;
  onCopyAll: () => void;
  onClear: () => void;
  onToggleVisibility: () => void;
}

export interface QuickPublishPanelProps {
  publishData: PublishFormData;
  publishStatus: PublishStatus;
  isConnected: boolean;
  onPublishDataChange: (field: keyof PublishFormData, value: any) => void;
  onPublish: () => void;
  onFormatMessage: () => void;
}

export interface SubscriptionConfigPanelProps {
  subscribeData: SubscribeFormData;
  filters: FilterConfig[];
  filterLogic: string;
  showFilters: boolean;
  showAdvanced: boolean;
  isSubscribed: boolean;
  onSubscribeDataChange: (field: string, value: any) => void;
  onFiltersChange: (filters: FilterConfig[]) => void;
  onFilterLogicChange: (logic: string) => void;
  onToggleSubscription: () => void;
}

export interface ChannelsTabProps {
  channels: string;
  onChannelsChange: (channels: string) => void;
}

export interface GroupsTabProps {
  channelGroups: string;
  onChannelGroupsChange: (groups: string) => void;
}

export interface FiltersTabProps {
  filters: FilterConfig[];
  filterLogic: string;
  onFiltersChange: (filters: FilterConfig[]) => void;
  onFilterLogicChange: (logic: string) => void;
}

export interface AdvancedTabProps {
  cursor: CursorData;
  withPresence: boolean;
  restoreOnReconnect: boolean;
  heartbeat: number;
  onCursorChange: (cursor: CursorData) => void;
  onWithPresenceChange: (value: boolean) => void;
  onRestoreOnReconnectChange: (value: boolean) => void;
  onHeartbeatChange: (value: number) => void;
}

// Utility type helpers
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type ConfigSection = 'publish' | 'subscribe' | 'ui' | 'filters';

export type FieldPath = keyof typeof FIELD_DEFINITIONS;