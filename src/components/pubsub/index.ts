// Barrel exports for PubSub components

export { default as PubSubPageEnhanced } from './PubSubPageEnhanced';

// Panel components
export { default as LiveMessagesPanel } from './LiveMessagesPanel';
export { QuickPublishPanel } from './QuickPublishPanel';
export { default as SubscriptionConfigPanel } from './SubscriptionConfigPanel';

// Tab components
export { default as ChannelsTab } from './tabs/ChannelsTab';
export { default as GroupsTab } from './tabs/GroupsTab';
export { default as FiltersTab } from './tabs/FiltersTab';
export { default as AdvancedTab } from './tabs/AdvancedTab';

// Shared components
export { default as MessageItem } from './shared/MessageItem';
export { default as StatusIndicator } from './shared/StatusIndicator';
export { parsePublishError } from './shared/ErrorParser';
export { copyAllMessages, copyAllPresenceEvents } from './shared/CopyHandlers';
export { 
  scrollToBottom, 
  handleScroll, 
  useAutoScroll, 
  useDelayedAutoScroll 
} from './shared/ScrollHandlers';

// Hooks
export { usePubNubSubscription } from './hooks/usePubNubSubscription';
export { usePubNubPublish } from './hooks/usePubNubPublish';
export { usePubNubPresence } from './hooks/usePubNubPresence';

// Types
export type {
  PubSubConfig,
  PublishFormData,
  SubscribeFormData,
  UIState,
  FilterState,
  FilterCondition,
  MessageData,
  PresenceEvent,
  PublishStatus,
  FieldDefinition,
  FieldDefinitions,
} from './types';

// Constants
export {
  FIELD_DEFINITIONS,
  CURRENT_CONFIG_VERSION,
  DEFAULT_MESSAGE_HEIGHT,
  MAX_MESSAGES,
  PUBSUB_INSTANCE_ID,
  STORAGE_KEYS,
  DEFAULT_FILTER_CONDITION,
} from './constants';

// Utilities
export {
  migrateConfig,
  pageSettingsToState,
  stateToPageSettings,
  createDefaultPageSettings,
  deepMerge,
  getNestedValue,
  setNestedValue,
  generateFilterExpression,
  validateChannel,
  validateJSON,
  validateCustomMessageType,
  formatTimestamp,
  parseChannels,
  copyToClipboard,
} from './utils';
