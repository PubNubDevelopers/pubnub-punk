# PubSub Architecture - Internal Implementation Guide

**Version**: Production-ready, enhanced modular implementation  
**Purpose**: Complete technical reference for PubSub messaging functionality

## 🎯 Current Implementation Overview

The PubSub tool is a **modular React component system** providing comprehensive real-time messaging capabilities:
1. **Message Publishing** - Send messages with advanced options (TTL, metadata, custom types)
2. **Channel Subscription** - Subscribe to channels, groups, wildcards with presence support
3. **Message Filtering** - Server-side filtering with visual builder and live expression preview
4. **Config Persistence** - Auto-save/restore settings with debounced updates

**Key Design Philosophy**: Component-based architecture with clear separation of concerns, replacing a 1,901-line monolithic component with ~15 focused modules.

## 📁 File Structure & Architecture

### Primary Component Structure
```
src/components/pubsub/
├── PubSubPageEnhanced.tsx      (400 lines) - Main orchestrator component
├── PubSubPage.tsx               (350 lines) - Initial migration (reference)
├── LiveMessagesPanel.tsx        (250 lines) - Message display & management
├── QuickPublishPanel.tsx        (280 lines) - Publishing interface
├── SubscriptionConfigPanel.tsx  (180 lines) - Subscription tabs container
├── constants.ts                 (150 lines) - Field definitions & constants
├── types.ts                     (120 lines) - TypeScript interfaces
├── utils.ts                     (200 lines) - Utility functions
└── index.ts                     (20 lines)  - Barrel exports
```

### Hook Modules
```
src/components/pubsub/hooks/
├── usePubNubSubscription.ts    (180 lines) - Subscription management
├── usePubNubPublish.ts          (150 lines) - Publishing with retry logic
├── usePubNubPresence.ts         (120 lines) - Presence event handling
└── index.ts                     (10 lines)  - Hook exports
```

### Tab Components
```
src/components/pubsub/tabs/
├── ChannelsTab.tsx              (140 lines) - Channel subscription UI
├── GroupsTab.tsx                (130 lines) - Channel groups UI
├── FiltersTab.tsx               (250 lines) - Filter builder interface
├── AdvancedTab.tsx              (160 lines) - Advanced subscription options
└── index.ts                     (10 lines)  - Tab exports
```

### Shared Components
```
src/components/pubsub/shared/
├── MessageItem.tsx              (120 lines) - Individual message display
├── StatusIndicator.tsx          (80 lines)  - Connection status UI
├── ErrorParser.tsx              (90 lines)  - Error handling utilities
├── CopyHandlers.tsx             (70 lines)  - Clipboard operations
├── ScrollHandlers.tsx           (100 lines) - Auto-scroll management
└── index.ts                     (10 lines)  - Shared exports
```

### Archived Files
```
src/pages/
├── pubsub.tsx.archived          (1,901 lines) - Original monolithic implementation
└── pubsub-wireframe.tsx.archived (789 lines)  - Wireframe prototype
```

## 🏗️ Component Architecture

### Main Component Structure (`PubSubPageEnhanced.tsx`)
```typescript
export default function PubSubPageEnhanced() {
  // Configuration & Context
  const { toast } = useToast();
  const { setPageSettings, pageSettings } = useConfig();
  const pubnub = usePubNub('pubsub-page'); // Page-specific instance
  
  // Core State Management
  const [publishData, setPublishData] = useState<PublishFormData>({
    channel: 'hello_world',
    message: '{"text": "Hello, World!"}',
    storeInHistory: true,
    sendByPost: false,
    ttl: '',
    customMessageType: 'text-message',
    meta: ''
  });
  
  const [subscribeData, setSubscribeData] = useState<SubscribeFormData>({
    channels: 'hello_world',
    channelGroups: '',
    receivePresenceEvents: false,
    cursor: { timetoken: '', region: '' },
    withPresence: false,
    heartbeat: 300,
    restoreOnReconnect: true
  });
  
  // UI State
  const [filterState, setFilterState] = useState<FilterState>({
    conditions: [],
    logic: '&&',
    expression: ''
  });
  
  // Message Management
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [presenceEvents, setPresenceEvents] = useState<PresenceEvent[]>([]);
  
  // Custom Hooks
  const { subscribe, unsubscribe, isSubscribed } = usePubNubSubscription();
  const { publish, publishStatus } = usePubNubPublish();
  
  // Config Persistence (debounced auto-save)
  const debouncedSave = useMemo(
    () => debounce(saveConfig, 500),
    []
  );
}
```

## 🔧 Core Features Implementation

### 1. Publishing System

#### Component: `QuickPublishPanel.tsx`
- JSON message validation with error feedback
- Advanced options panel (collapsible)
- TTL support (Time To Live)
- Custom message types
- Metadata attachment
- POST vs GET method selection
- Visual status indicator with timetoken

#### Hook: `usePubNubPublish.ts`
```typescript
export function usePubNubPublish(pubnub: any) {
  const [status, setStatus] = useState<PublishStatus>('idle');
  const [timetoken, setTimetoken] = useState<string>('');
  
  const publish = async (params: PublishParams) => {
    // Retry logic with exponential backoff
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const result = await pubnub.publish({
          channel: params.channel,
          message: params.message,
          storeInHistory: params.storeInHistory,
          sendByPost: params.sendByPost,
          ttl: params.ttl,
          customMessageType: params.customMessageType,
          meta: params.meta
        });
        setTimetoken(result.timetoken);
        setStatus('success');
        return result;
      } catch (error) {
        if (attempt === 3) throw error;
        await delay(Math.pow(2, attempt) * 1000);
      }
    }
  };
  
  return { publish, status, timetoken };
}
```

### 2. Subscription System

#### Component: `SubscriptionConfigPanel.tsx`
- Tabbed interface for configuration
- Channel subscription (single/multiple/wildcard)
- Channel groups support
- Filter builder with templates
- Advanced options (heartbeat, cursor, restore)

#### Hook: `usePubNubSubscription.ts`
```typescript
export function usePubNubSubscription(pubnub: any) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  
  const subscribe = useCallback((config: SubscribeConfig) => {
    // Parse channels (comma-separated, wildcards)
    const channelList = parseChannels(config.channels);
    
    // Build subscription with filters
    const sub = pubnub.channel(channelList).subscription({
      filter: config.filterExpression,
      cursor: config.cursor,
      withPresence: config.withPresence
    });
    
    // Attach listeners
    sub.on('message', handleMessage);
    sub.on('presence', handlePresence);
    sub.on('error', handleError);
    
    sub.subscribe();
    setSubscription(sub);
    setIsSubscribed(true);
  }, [pubnub]);
  
  const unsubscribe = useCallback(() => {
    subscription?.unsubscribe();
    setIsSubscribed(false);
  }, [subscription]);
  
  return { subscribe, unsubscribe, isSubscribed };
}
```

### 3. Filter System

#### Component: `FiltersTab.tsx`
Features:
- Visual filter builder with dropdowns
- AND/OR logic selector
- Multiple condition support
- Filter templates (5 pre-configured)
- Live expression preview with syntax highlighting
- Real-time validation

```typescript
// Filter condition structure
interface FilterCondition {
  id: string;
  field: string;        // e.g., "message.type"
  operator: string;     // ==, !=, >, <, contains, etc.
  value: string;        // comparison value
  dataType: 'string' | 'number' | 'boolean';
}

// Generate PubNub filter expression
function generateFilterExpression(conditions: FilterCondition[], logic: string): string {
  if (!conditions.length) return '';
  
  return conditions
    .map(c => {
      const field = c.field.startsWith('meta.') 
        ? `meta.${c.field.slice(5)}` 
        : c.field;
      
      const value = c.dataType === 'string' 
        ? `"${c.value}"` 
        : c.value;
      
      return `${field} ${c.operator} ${value}`;
    })
    .join(` ${logic} `);
}
```

### 4. Message Display System

#### Component: `LiveMessagesPanel.tsx`
- Split view for messages and presence events
- Auto-scroll with manual override
- Raw message data toggle
- Copy all messages to clipboard
- Clear messages functionality
- Message count with MAX_MESSAGES limit (1000)

```typescript
interface MessageData {
  id: string;
  channel: string;
  message: any;
  timetoken: string;
  timestamp: Date;
  publisher?: string;
  customMessageType?: string;
  meta?: any;
}

// Auto-scroll management
const scrollToBottom = useCallback(() => {
  if (autoScroll && messagesEndRef.current) {
    messagesEndRef.current.scrollIntoView({ 
      behavior: 'smooth',
      block: 'end'
    });
  }
}, [autoScroll]);

// Message limit enforcement
useEffect(() => {
  if (messages.length > MAX_MESSAGES) {
    setMessages(prev => prev.slice(-MAX_MESSAGES));
  }
}, [messages]);
```

### 5. Config Persistence System

#### Storage Management
```typescript
// Auto-save configuration
const saveConfig = useCallback(() => {
  const config: PubSubConfig = {
    version: CURRENT_CONFIG_VERSION,
    publish: publishData,
    subscribe: subscribeData,
    filters: filterState,
    ui: {
      showAdvancedPublish,
      messageHeight,
      showFilters,
      showPresenceEvents,
      showRawMessageData
    }
  };
  
  storage.set(STORAGE_KEYS.CONFIG, config);
  console.log('Config auto-saved');
}, [publishData, subscribeData, filterState, /* ui states */]);

// Debounced auto-save on state changes
useEffect(() => {
  if (isConfigLoaded) {
    debouncedSave();
  }
}, [publishData, subscribeData, filterState, debouncedSave]);

// Load config on mount
useEffect(() => {
  const savedConfig = storage.get<PubSubConfig>(STORAGE_KEYS.CONFIG);
  if (savedConfig) {
    const migrated = migrateConfig(savedConfig);
    // Apply saved state...
    toast({
      title: 'Config Loaded',
      description: 'Your previous settings have been restored'
    });
  }
  setIsConfigLoaded(true);
}, []);
```

## 🔄 Data Flow

### Publishing Flow
1. User enters message in `QuickPublishPanel`
2. Validation via `validateJSON()` utility
3. Advanced options collected if expanded
4. `usePubNubPublish` hook handles retry logic
5. Status indicator shows timetoken on success
6. Error toast on failure with parsed error message

### Subscription Flow
1. User configures in `SubscriptionConfigPanel` tabs
2. Channels parsed and validated
3. Filters built from visual builder or raw input
4. `usePubNubSubscription` creates subscription
5. Messages routed to `LiveMessagesPanel`
6. Auto-scroll manages view updates
7. Message limit enforced at 1000

### Filter Flow
1. User builds conditions in `FiltersTab`
2. Real-time expression generation
3. Expression validated and displayed
4. Applied to subscription on subscribe
5. Server-side filtering via PubNub
6. Only matching messages delivered

## 🎨 UI/UX Features

### Layout Structure
```
┌─────────────────────────────────────────┐
│         Header with Status              │
├─────────────────────────────────────────┤
│                                         │
│    Live Messages Panel (Resizable)     │
│    - Messages | Presence Events         │
│                                         │
├─────────────────────────────────────────┤
│         Quick Publish Panel            │
│    - Channel, Message, Options         │
├─────────────────────────────────────────┤
│     Subscription Configuration         │
│    [Channels][Groups][Filters][Adv]    │
└─────────────────────────────────────────┘
```

### Interactive Elements
- **Status Indicator**: Real-time connection status
- **Toggle Switches**: Binary options with labels
- **Collapsible Panels**: Advanced options, filters
- **Tabbed Interface**: Organized subscription config
- **Copy Buttons**: Quick clipboard operations
- **Clear Actions**: Reset messages or config
- **Auto-scroll Toggle**: Manual scroll override
- **Format Button**: JSON prettification

## 🔐 Security Considerations

### Input Validation
- JSON message validation before publish
- Channel name validation (alphanumeric, wildcards)
- Filter expression syntax validation
- TTL range validation (0-2880 minutes)
- Custom message type validation

### Error Handling
- Graceful degradation on PubNub errors
- Retry logic with exponential backoff
- User-friendly error messages via toast
- Console logging for debugging
- Network error recovery

## 🚀 Performance Optimizations

### Rendering
- React.memo for MessageItem components
- Debounced config saves (500ms)
- Message limit (1000) to prevent memory issues
- Virtualized scrolling ready (not implemented)
- Optimized re-renders with proper dependencies

### State Management
- Local state for UI interactions
- Context for cross-component state
- Memoized callbacks and values
- Cleanup on unmount
- Proper effect dependencies

## 📊 Configuration Schema

### FIELD_DEFINITIONS Structure
```typescript
export const FIELD_DEFINITIONS = {
  publish: {
    channel: { type: 'string', default: 'hello_world' },
    message: { type: 'json', default: '{"text": "Hello, World!"}' },
    storeInHistory: { type: 'boolean', default: true },
    sendByPost: { type: 'boolean', default: false },
    ttl: { type: 'number', default: '' },
    customMessageType: { type: 'string', default: 'text-message' },
    meta: { type: 'json', default: '' }
  },
  subscribe: {
    channels: { type: 'string', default: 'hello_world' },
    channelGroups: { type: 'string', default: '' },
    receivePresenceEvents: { type: 'boolean', default: false },
    cursor: { type: 'object', default: { timetoken: '', region: '' } },
    withPresence: { type: 'boolean', default: false },
    heartbeat: { type: 'number', default: 300 },
    restoreOnReconnect: { type: 'boolean', default: true }
  }
};
```

## 🧪 Testing Approach

### Component Testing
- Individual component isolation
- Mock PubNub instance for unit tests
- UI interaction testing with Playwright
- Config persistence verification
- Error scenario coverage

### Integration Testing
- Full publish/subscribe flow
- Filter application verification
- Multi-channel subscription
- Presence event handling
- Config migration testing

## 📝 Migration Notes

### From Original (1,901 lines) to Modular
- Extracted 15+ focused components
- Separated concerns (UI, logic, state)
- Created reusable hooks
- Improved error handling
- Added config persistence
- Enhanced filter builder
- Better TypeScript coverage

### Backwards Compatibility
- Config migration from v1 to v2
- Same storage keys maintained
- Feature parity preserved
- UI improvements added
- No breaking changes

## 🔮 Future Enhancements

### Planned Improvements
- Virtual scrolling for > 100 messages
- Message search/filtering in UI
- Export messages to file
- Import/export configurations
- Keyboard shortcuts
- Accessibility improvements (ARIA)
- Dark mode optimizations

### Performance Opportunities
- Web Worker for message processing
- IndexedDB for message storage
- Lazy loading for large message sets
- Code splitting for tabs
- Memoization of filter expressions

## 📚 Developer Notes

### Key Patterns
1. **Page-specific PubNub instance**: Always use `usePubNub('pubsub-page')`
2. **Debounced saves**: Config auto-saves after 500ms of inactivity
3. **Toast feedback**: User actions confirmed via toast notifications
4. **Error recovery**: Retry logic for transient failures
5. **Cleanup**: Proper subscription cleanup on unmount

### Common Pitfalls
- Don't forget to parse comma-separated channels
- Always validate JSON before publishing
- Remember to cleanup subscriptions
- Check for demo key limitations (403 errors)
- Handle presence events separately from messages

### Debug Tips
- Check console for PubNub debug logs
- Verify config in localStorage
- Monitor network tab for API calls
- Use raw message view for debugging
- Check filter expression syntax carefully