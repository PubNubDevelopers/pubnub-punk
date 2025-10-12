import type { FieldDefinitions } from './types';

// Schema-driven field definitions for bidirectional sync
export const FIELD_DEFINITIONS: FieldDefinitions = {
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

// Config version for migration support
export const CURRENT_CONFIG_VERSION = 1;

// Default message height for the messages panel
export const DEFAULT_MESSAGE_HEIGHT = 300;

// Maximum number of messages to keep in memory
export const MAX_MESSAGES = 1000;

// PubNub instance ID for this page
export const PUBSUB_INSTANCE_ID = 'pubsub-page';

// Storage keys
export const STORAGE_KEYS = {
  CONFIG: 'pubsub-config',
  UI_STATE: 'pubsub-ui-state',
} as const;

// Default filter condition
export const DEFAULT_FILTER_CONDITION = {
  id: 1,
  target: 'message' as const,
  field: '',
  operator: '==' as const,
  value: '',
  type: 'string' as const,
};