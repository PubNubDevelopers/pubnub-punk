# PubSub Page Complete Porting Plan - LLM Implementation Guide

## CRITICAL CONTEXT FOR LLM
This document is designed for LLM execution across multiple context windows. Each phase is self-contained with explicit file paths, line references, and implementation details. The goal is to port 100% functionality from the monolithic `/pubsub` page (1,901 lines) to a new component-based architecture starting from `/pubsub-wireframe` (already enhanced with filter improvements).

## SOURCE FILES REFERENCE
- **Original Implementation**: `/Users/todd/code/pn_devtools/src/pages/pubsub.tsx` (1,901 lines)
- **Wireframe Base**: `/Users/todd/code/pn_devtools/src/pages/pubsub-wireframe.tsx` (789 lines with filter enhancements)
- **Pattern Reference**: `/Users/todd/code/pn_devtools/src/components/file-sharing/` (modular component pattern)

## IMPLEMENTATION PHASES

### PHASE 1: Infrastructure Setup (Create Component Structure)
**Context**: Setting up the component directory structure following file-sharing pattern

1. **Create Directory Structure**
   ```
   mkdir -p src/components/pubsub/tabs
   mkdir -p src/components/pubsub/shared
   mkdir -p src/components/pubsub/dialogs
   ```

2. **Create Core Files**
   - `src/components/pubsub/index.ts` - Barrel exports
   - `src/components/pubsub/types.ts` - TypeScript interfaces from original lines 15-47
   - `src/components/pubsub/utils.ts` - Utility functions
   - `src/components/pubsub/constants.ts` - FIELD_DEFINITIONS from original lines 16-47

3. **Extract Type Definitions** from original pubsub.tsx:
   ```typescript
   // types.ts should include:
   - PubSubConfig interface (based on FIELD_DEFINITIONS structure)
   - MessageData, PresenceEvent interfaces
   - FilterCondition, FilterState interfaces
   - PublishFormData, SubscribeFormData interfaces
   - UIState interface (showAdvancedPublish, messageHeight, etc.)
   ```

4. **Extract Constants** from original pubsub.tsx lines 16-47:
   ```typescript
   // constants.ts - Copy FIELD_DEFINITIONS object exactly
   export const FIELD_DEFINITIONS = { ... }
   export const CONFIG_VERSION = 1;
   export const DEFAULT_MESSAGE_HEIGHT = 300;
   ```

5. **Create Utilities** from original pubsub.tsx lines 49-120:
   ```typescript
   // utils.ts functions to extract:
   - migrateConfig() - lines 49-71
   - pageSettingsToState() - lines 73-85  
   - stateToPageSettings() - lines 87-120
   - generateFilterExpression() - find in original
   - validateChannel() - create new
   - validateJSON() - create new
   ```

### PHASE 2: Main Page Component (PubSubPage)
**Context**: Create the main container component that orchestrates all features

1. **Create `src/components/pubsub/PubSubPage.tsx`**
   - Start with pubsub-wireframe.tsx as base (copy entire file)
   - Import new component structure instead of inline components
   - Extract state management to match original pubsub.tsx lines 122-200

2. **Port State Management** from original lines 122-200:
   ```typescript
   // Essential state from original:
   const [publishData, setPublishData] = useState(/* from FIELD_DEFINITIONS defaults */);
   const [subscribeData, setSubscribeData] = useState(/* from FIELD_DEFINITIONS defaults */);
   const [uiState, setUiState] = useState({ showAdvancedPublish, messageHeight, etc });
   const [filterState, setFilterState] = useState({ conditions: [], logic: '&&' });
   const [messages, setMessages] = useState<MessageData[]>([]);
   const [presenceEvents, setPresenceEvents] = useState<PresenceEvent[]>([]);
   const [isSubscribed, setIsSubscribed] = useState(false);
   ```

3. **Integrate Hooks** from original lines 201-250:
   ```typescript
   const pubnub = usePubNub('pubsub-page');
   const { config, updateConfig } = useConfig();
   const { addToast } = useToast();
   
   // Port useEffect for config loading/saving (lines 251-300)
   // Port useEffect for PubNub listeners (lines 301-400)
   ```

4. **Port Event Handlers** from original lines 401-600:
   ```typescript
   // Key handlers to port:
   - handlePublish() - lines 401-450
   - handleSubscribe() - lines 451-500
   - handleUnsubscribe() - lines 501-520
   - handleFilterChange() - lines 521-540
   - handleConfigSave() - lines 541-560
   ```

### PHASE 3: Live Messages Panel Components
**Context**: Create message display components with full functionality

1. **Create `src/components/pubsub/LiveMessagesPanel.tsx`**
   - Port from original lines 601-900
   - Import MessageItem and StatusIndicator components
   - Include message filtering, sorting, and display logic
   
2. **Key Features to Port**:
   ```typescript
   // From original implementation:
   - Message display with virtualScrolling consideration
   - Presence event integration (if receivePresenceEvents enabled)
   - Raw message data toggle
   - Copy all messages functionality
   - Clear messages functionality
   - Auto-scroll to bottom
   - Message count display
   - Connection status indicator
   ```

3. **Create `src/components/pubsub/shared/MessageItem.tsx`**
   - Extract message rendering logic from original lines 750-850
   - Handle regular messages vs presence events
   - Implement raw data view toggle
   - Format timestamps and metadata

4. **Create `src/components/pubsub/shared/StatusIndicator.tsx`**
   - Port subscription status display
   - Show connected/disconnected state
   - Display active channel/group count
   - Show filter status if filters active

### PHASE 4: Quick Publish Panel
**Context**: Complete publish functionality with all advanced features

1. **Create `src/components/pubsub/QuickPublishPanel.tsx`**
   - Port from original lines 1101-1400
   - Include all publish fields and validation
   
2. **Features to Implement**:
   ```typescript
   // Essential publish features from original:
   - Channel input with validation
   - Message textarea with JSON formatting button
   - Store in History toggle (default: true)
   - Send by POST toggle (for large messages)
   - Advanced section (collapsible):
     - TTL (Time To Live) input
     - Custom Message Type input
     - Meta (metadata) JSON input
   - Publish button with loading state
   - Success/error toast notifications
   ```

3. **Port Validation Logic**:
   ```typescript
   // From original lines 1101-1150:
   - Channel name validation
   - JSON message validation
   - Custom message type validation (3-50 chars, alphanumeric + - _)
   - Meta JSON validation
   - TTL number validation
   ```

### PHASE 5: Subscription Configuration Tabs
**Context**: Implement the tabbed subscription interface

1. **Create `src/components/pubsub/SubscriptionConfigPanel.tsx`**
   - Container for tabs
   - Tab switching logic
   - Filter count badge on Filters tab
   
2. **Create `src/components/pubsub/tabs/ChannelsTab.tsx`**
   - Port from original lines 1451-1500
   - Channels textarea with comma-separated parsing
   - Wildcard support documentation
   - Channel validation and error display

3. **Create `src/components/pubsub/tabs/GroupsTab.tsx`**
   - Port from original lines 1501-1550
   - Channel groups textarea
   - Groups validation

4. **Create `src/components/pubsub/tabs/FiltersTab.tsx`**
   - USE ENHANCED VERSION from pubsub-wireframe.tsx lines 574-707
   - Keep the improvements: dropdown operators, AND/OR logic, templates, live preview
   - Port additional validation from original lines 1601-1750

5. **Create `src/components/pubsub/tabs/AdvancedTab.tsx`**
   - Port from original lines 1801-1890
   ```typescript
   // Advanced options to include:
   - Cursor Timetoken input
   - Cursor Region input
   - Enable Heartbeat toggle
   - Heartbeat Interval input (seconds)
   - Restore on Reconnect toggle
   ```

### PHASE 6: Shared Components and Dialogs
**Context**: Create reusable components

1. **Create `src/components/pubsub/shared/FilterBuilder.tsx`**
   - Extract the enhanced filter UI from FiltersTab
   - Make it reusable with props for onChange, onRemove

2. **Create `src/components/pubsub/shared/ChannelInput.tsx`**
   - Reusable channel input with validation
   - History/suggestions dropdown
   - Copy button functionality

3. **Create `src/components/pubsub/dialogs/JSONFormatterDialog.tsx`**
   - Port JSON formatting dialog for message field
   - Pretty print and minify options
   - Validation feedback

### PHASE 7: PubNub Integration
**Context**: Wire up actual PubNub functionality

1. **Port Subscribe Logic** from original lines 451-500:
   ```typescript
   // Key subscribe functionality:
   - Parse channels and channel groups
   - Build subscription options with filters
   - Handle cursor if provided
   - Set up message/presence listeners
   - Update connection status
   ```

2. **Port Publish Logic** from original lines 401-450:
   ```typescript
   // Key publish functionality:
   - Validate all fields
   - Build publish parameters (meta, customMessageType, ttl, etc.)
   - Use POST if sendByPost enabled
   - Handle success/error responses
   - Show toast notifications
   ```

3. **Port Message Handlers** from original lines 301-400:
   ```typescript
   // Event listener setup:
   - Message event handler
   - Presence event handler
   - Status event handler
   - Signal event handler
   - Cleanup on unmount
   ```

### PHASE 8: Storage and Config Persistence
**Context**: Implement config saving/loading

1. **Port Config Management** from original lines 251-300:
   ```typescript
   // Storage integration:
   - Load config on mount using storage.get()
   - Save config on change using storage.set()
   - Migrate old configs using migrateConfig()
   - Handle config version updates
   ```

2. **Implement Auto-save**:
   ```typescript
   // Auto-save on state changes:
   useEffect(() => {
     const settings = stateToPageSettings(publishData, subscribeData, uiState, filterState);
     updateConfig('pubsub', settings);
   }, [publishData, subscribeData, uiState, filterState]);
   ```

### PHASE 9: Testing Checklist
**Context**: Validate all functionality works

1. **Publishing Tests**:
   - [ ] Basic message publish
   - [ ] JSON formatted message
   - [ ] Custom message type
   - [ ] TTL setting
   - [ ] Meta data
   - [ ] POST vs GET
   - [ ] Store in history toggle
   - [ ] Error handling for invalid JSON

2. **Subscription Tests**:
   - [ ] Single channel subscription
   - [ ] Multiple channels (comma-separated)
   - [ ] Wildcard channels
   - [ ] Channel groups
   - [ ] Mixed channels and groups
   - [ ] Presence events toggle
   - [ ] Message filtering
   - [ ] Advanced options (cursor, heartbeat)

3. **Filter Tests**:
   - [ ] Single filter
   - [ ] Multiple filters with AND
   - [ ] Multiple filters with OR
   - [ ] Filter templates
   - [ ] Live expression preview
   - [ ] Complex filter expressions

4. **UI State Tests**:
   - [ ] Panel collapse/expand
   - [ ] Tab switching
   - [ ] Message auto-scroll
   - [ ] Copy functionality
   - [ ] Clear messages
   - [ ] Config persistence
   - [ ] Page refresh maintains state

### PHASE 10: Route Migration
**Context**: Replace old page with new implementation

1. **Update Route** in main app router:
   ```typescript
   // Change from:
   import PubSub from './pages/pubsub';
   // To:
   import { PubSubPage } from './components/pubsub';
   ```

2. **Remove Old File**:
   - Delete `src/pages/pubsub.tsx` after confirming new version works
   - Delete `src/pages/pubsub-wireframe.tsx` after porting complete

3. **Update Imports**:
   - Search for any imports of old pubsub page
   - Update to use new component path

## CRITICAL IMPLEMENTATION NOTES FOR LLM

### State Management Pattern
```typescript
// ALWAYS use this pattern for form fields (from original):
const handleFieldChange = (section: string, field: string, value: any) => {
  if (section === 'publish') {
    setPublishData(prev => ({ ...prev, [field]: value }));
  } else if (section === 'subscribe') {
    setSubscribeData(prev => ({ ...prev, [field]: value }));
  }
  // Auto-save to storage
};
```

### PubNub Hook Pattern
```typescript
// ALWAYS use the page-specific instance:
const pubnub = usePubNub('pubsub-page');
// NOT the default instance
```

### Storage Pattern
```typescript
// ALWAYS use the storage utility:
import { storage } from '@/lib/storage';
// Save: storage.set('pubsub-config', data);
// Load: storage.get('pubsub-config');
```

### Toast Notifications
```typescript
// ALWAYS show feedback:
addToast('Message published successfully', 'success');
addToast('Failed to subscribe: ' + error.message, 'error');
```

### Component Import Pattern
```typescript
// ALWAYS use barrel exports:
import { LiveMessagesPanel, QuickPublishPanel } from '@/components/pubsub';
// NOT individual file imports
```

## VALIDATION REQUIREMENTS

### Must Preserve from Original
1. **FIELD_DEFINITIONS** - Exact structure for config compatibility
2. **Config Migration** - Version 1 to Version 2+ compatibility
3. **Schema-driven Forms** - Dynamic field generation from definitions
4. **Storage Keys** - Must match: 'pubsub-config', 'pubsub-ui-state'
5. **PubNub Instance ID** - Must be 'pubsub-page'
6. **Toast Messages** - Exact wording for consistency

### Must Enhance from Wireframe
1. **Filter Builder** - Keep dropdown operators, AND/OR, templates, live preview
2. **Tabbed Interface** - Maintain improved UX design
3. **Status Indicators** - Keep visual improvements
4. **Live Expression** - Keep syntax highlighting

### Performance Considerations
1. **Message Limit** - Cap stored messages at 1000 (original line 850)
2. **Debounce** - Config save debounced by 500ms
3. **Memoization** - Use React.memo for MessageItem components
4. **Virtual Scroll** - Consider for > 100 messages

## SUCCESS CRITERIA
- [ ] All 21 publish/subscribe fields from FIELD_DEFINITIONS work
- [ ] Config persists and migrates correctly
- [ ] All original features present (100% parity)
- [ ] Improved UX from wireframe maintained
- [ ] Component files < 300 lines each
- [ ] Type-safe with full TypeScript coverage
- [ ] No console errors or warnings
- [ ] Performance equal or better than original