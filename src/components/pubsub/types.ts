// TypeScript interfaces for PubSub component

export interface PubSubConfig {
  publish: PublishFormData;
  subscribe: SubscribeFormData;
  ui: UIState;
  filters: FilterState;
  _version?: number;
}

export interface PublishFormData {
  channel: string;
  message: string;
  storeInHistory: boolean;
  sendByPost: boolean;
  ttl: string;
  customMessageType: string;
  meta: string;
}

export interface SubscribeFormData {
  channels: string;
  channelGroups: string;
  receivePresenceEvents: boolean;
  cursor: {
    timetoken: string;
    region: string;
  };
  withPresence: boolean;
  heartbeat: number;
  restoreOnReconnect: boolean;
}

export interface UIState {
  showFilters: boolean;
  showMessages: boolean;
  messagesHeight: number;
  showRawMessageData: boolean;
}

export interface FilterCondition {
  id: number;
  target: 'message' | 'uuid' | 'channel';
  field: string;
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | '!contains' | 'startsWith' | 'endsWith';
  value: string;
  type: 'string' | 'number' | 'boolean';
}

export interface FilterState {
  logic: '&&' | '||';
  conditions: FilterCondition[];
}

export interface MessageData {
  channel: string;
  subscription?: string;
  timetoken: string;
  message: any;
  publisher?: string;
  userMetadata?: any;
  messageType?: string;
  timestamp?: string;
}

export interface PresenceEvent {
  action: 'join' | 'leave' | 'timeout' | 'state-change' | 'interval';
  uuid: string;
  channel: string;
  subscription?: string;
  timetoken: string;
  timestamp?: string;
  occupancy?: number;
  state?: any;
  join?: string[];
  leave?: string[];
  timeout?: string[];
}

export interface PublishStatus {
  isVisible: boolean;
  isSuccess: boolean;
  timetoken?: string;
  isFlashing: boolean;
}

export interface FieldDefinition {
  section: string;
  field: string;
  type: 'string' | 'boolean' | 'number';
  default: any;
}

export type FieldDefinitions = Record<string, FieldDefinition>;