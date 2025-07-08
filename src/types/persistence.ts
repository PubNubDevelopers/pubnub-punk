export interface HistoryMessage {
  message: any;
  timetoken: string;
  uuid?: string;
  meta?: any;
  messageType?: string;
  channel?: string;
}

export interface ChannelHistory {
  channel: string;
  messages: HistoryMessage[];
  totalMessages: number;
  startTimetoken?: string;
  endTimetoken?: string;
}

export interface FetchProgress {
  current: number;
  total: number;
  currentChannel: string;
  currentBatch: number;
  totalBatches: number;
}

export interface PersistenceSettings {
  selectedChannels: string;
  count: number;
  includeTimetoken: boolean;
  includeMeta: boolean;
  includeMessageActions: boolean;
  includeUUID: boolean;
  reverse: boolean;
  startTimetoken: string;
  endTimetoken: string;
  searchTerm: string;
  showRawData: boolean;
}

export interface MessageDeleteRequest {
  channel: string;
  timetoken: string;
}

export interface PubNubHistoryParams {
  channels: string[];
  count: number;
  includeTimetoken: boolean;
  includeMeta: boolean;
  includeUUID: boolean;
  includeMessageActions: boolean;
  reverse: boolean;
  start?: string;
  end?: string;
}

// Field definitions for config management
export const FIELD_DEFINITIONS = {
  'persistence.selectedChannels': { section: 'persistence', field: 'selectedChannels', type: 'string', default: 'hello_world' },
  'persistence.count': { section: 'persistence', field: 'count', type: 'number', default: 100 },
  'persistence.includeTimetoken': { section: 'persistence', field: 'includeTimetoken', type: 'boolean', default: true },
  'persistence.includeMeta': { section: 'persistence', field: 'includeMeta', type: 'boolean', default: false },
  'persistence.includeMessageActions': { section: 'persistence', field: 'includeMessageActions', type: 'boolean', default: false },
  'persistence.includeUUID': { section: 'persistence', field: 'includeUUID', type: 'boolean', default: true },
  'persistence.reverse': { section: 'persistence', field: 'reverse', type: 'boolean', default: false },
  'persistence.startTimetoken': { section: 'persistence', field: 'startTimetoken', type: 'string', default: '' },
  'persistence.endTimetoken': { section: 'persistence', field: 'endTimetoken', type: 'string', default: '' },
  'persistence.searchTerm': { section: 'persistence', field: 'searchTerm', type: 'string', default: '' },
  'persistence.showRawData': { section: 'persistence', field: 'showRawData', type: 'boolean', default: false },
} as const;

// Common timezones list
export const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago', 
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Vancouver',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland'
];