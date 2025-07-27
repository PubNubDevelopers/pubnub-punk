// PubSub Component Exports
// Export barrel for modular pubsub components

export { default as PubSubPage } from './PubSubPage';

export * from './types';
export * from './utils';

// Phase 2 component exports - Live Messages Panel
export { LiveMessagesPanel } from './LiveMessagesPanel';
export { MessageItem } from './shared/MessageItem';
export { StatusIndicator } from './shared/StatusIndicator';

// Phase 3 component exports - Quick Publish Panel
export { QuickPublishPanel } from './QuickPublishPanel';

// Future Phase 4 component exports
// export { default as SubscriptionConfigPanel } from './SubscriptionConfigPanel';
// export { default as ChannelsTab } from './tabs/ChannelsTab';
// export { default as GroupsTab } from './tabs/GroupsTab';
// export { default as FiltersTab } from './tabs/FiltersTab';
// export { default as AdvancedTab } from './tabs/AdvancedTab';

// Future Phase 5 component exports
// export { default as FilterBuilder } from './shared/FilterBuilder';