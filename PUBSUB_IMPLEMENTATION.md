# PubSub Page Implementation Guide

## Overview
The PubSub page (`/src/pages/pubsub.tsx`) is a comprehensive real-time messaging testing tool that provides publish/subscribe functionality with advanced features like presence events, message filtering, and dual-window display.

## Key Features

### 1. Publish Message Panel
- **Location**: Right side of the page
- **Status Indicator**: Small grey indicator below "Publish Message" button
  - Flashes green on success with `timetoken=<value>` display
  - Flashes red on error with "Publish Error" text + detailed error toast
  - Replaces the old annoying success pop-up
- **Fields**: Channel, Message (JSON), Custom Message Type, TTL, Meta, switches for Store in History/Send by POST

### 2. Real-Time Messages Panel
- **Toggle Controls**: "Receive Presence Events" and "Show Raw Message Data" in header
- **Display Modes**:
  - **Single View**: When presence events OFF - full-width messages display
  - **Split View**: When presence events ON - side-by-side windows

### 3. Split View Layout (when presence events enabled)
- **Left Window**: "Messages" - regular pub/sub messages
- **Right Window**: "Presence Events" - presence events with green styling
- **Independent Scrolling**: Each window has its own scroll state and controls
- **Auto-scroll**: Both windows auto-scroll to bottom for new content
- **Scroll Buttons**: Blue for messages, green for presence events

### 4. Subscribe Panel
- **Location**: Left side of the page  
- **Core Fields**: Channels, Channel Groups
- **Advanced Options**: Collapsible section with cursor, heartbeat, restore settings
- **Subscribe Filters**: Server-side message filtering with expression builder
- **Toggle Switch**: Master subscribe/unsubscribe control in header

## State Management

### Core State Variables
```typescript
// Message storage
const [messages, setMessages] = useState<any[]>([]);
const [presenceEvents, setPresenceEvents] = useState<any[]>([]);

// Scroll states (independent for each window)
const [autoScroll, setAutoScroll] = useState(true);
const [showScrollButton, setShowScrollButton] = useState(false);
const [presenceAutoScroll, setPresenceAutoScroll] = useState(true);
const [showPresenceScrollButton, setShowPresenceScrollButton] = useState(false);

// Publish status indicator
const [publishStatus, setPublishStatus] = useState<{
  isVisible: boolean;
  isSuccess: boolean;
  timetoken?: string;
  isFlashing: boolean;
}>({ isVisible: false, isSuccess: false, isFlashing: false });
```

### Page Settings JSON Object
The page maintains a comprehensive in-memory JSON object that captures ALL user inputs in real-time:

```typescript
const [pageSettings, setPageSettings] = useState({
  // Publish Panel Settings
  publish: {
    channel: 'hello_world',
    message: '{"text": "Hello, World!", "sender": "PubNub Developer Tools"}',
    storeInHistory: true,
    sendByPost: false,
    ttl: '',
    customMessageType: 'text-message',
    meta: ''
  },
  // Subscribe Panel Settings
  subscribe: {
    channels: 'hello_world',
    channelGroups: '',
    receivePresenceEvents: false,
    cursor: {
      timetoken: '',
      region: ''
    },
    withPresence: false,
    heartbeat: 300,
    restoreOnReconnect: true
  },
  // UI State Settings
  ui: {
    showAdvanced: false,
    showFilters: false,
    showMessages: true,
    messagesHeight: 200,
    showRawMessageData: false
  },
  // Filter Settings
  filters: {
    logic: '&&',
    conditions: [{
      id: 1,
      target: 'message',
      field: '',
      operator: '==',
      value: '',
      type: 'string'
    }]
  }
});
```

**Key Features:**
- Updates automatically on every user input change
- Logs complete object to console with `🔧 PubSub Page Settings Updated:`
- Structured for future persistence and versioning
- Captures all form fields, toggles, filters, and UI state

### PubNub Integration
- **Instance Management**: Creates new PubNub instances per operation (no global connection state)
- **Subscription**: Uses entity-based subscriptionSet approach
- **Message Handling**: Separates regular messages from presence events into different state arrays
- **Cleanup**: Proper cleanup on unsubscribe and component unmount

## Key Functions

### Message Handlers
- `handlePublish()` - Publishes messages and updates status indicator
- `handleSubscribe()` - Creates PubNub subscription with filters
- `handleUnsubscribe()` - Cleans up subscriptions and clears messages

### Settings Management
- `updatePageSettings(section, updates)` - Updates page settings JSON and logs changes
- `handlePublishInputChange()` - Updates publish data + page settings
- `handleSubscribeInputChange()` - Updates subscribe data + page settings (handles nested objects)
- `handleShowAdvancedToggle()` - UI toggle with settings update
- `handleShowFiltersToggle()` - UI toggle with settings update
- `handleShowMessagesToggle()` - UI toggle with settings update
- `handleShowRawMessageDataToggle()` - UI toggle with settings update
- `handleFilterLogicChange()` - Filter logic update with settings sync

### Copy Functions
- `copyAllMessages()` - Copies all messages as JSON to clipboard
- `copyAllPresenceEvents()` - Copies all presence events as JSON to clipboard

### Scroll Management
- `handleScroll()` / `handlePresenceScroll()` - Independent scroll detection
- `scrollToBottom()` / `scrollPresenceToBottom()` - Scroll controls
- **Auto-scroll Effects**: Maintain scroll position when toggling views

### Filter System
- `generateFilterExpression()` - Builds PubNub server-side filter expressions
- Support for multiple filter conditions with AND/OR logic

## Important Implementation Notes

### Page Settings System
- **Real-time Updates**: Every user input immediately updates the `pageSettings` JSON object
- **Comprehensive Capture**: All form fields, toggles, filters, and UI state included
- **Console Logging**: Every change logged as `🔧 PubSub Page Settings Updated:` with full object
- **Future-Ready**: Structured for persistence, versioning, and configuration management
- **No Prototype Pollution**: Uses plain objects optimal for JSON serialization

### Presence Events Integration
- Presence events are stored separately from regular messages
- Only displayed when "Receive Presence Events" toggle is ON
- Green-themed styling to differentiate from regular messages
- Independent scroll behavior from messages window

### Copy Functionality
- **Single View**: One copy button in header copies all messages
- **Split View**: Two copy buttons - one per window header
- **Messages Copy**: Copies all messages with full metadata as JSON
- **Presence Copy**: Copies all presence events with action/occupancy data as JSON
- Buttons disabled when respective arrays are empty

### Message Display Modes
- **Raw Mode**: Shows complete message metadata as JSON
- **Simple Mode**: Clean formatted display with channel tags and timestamps
- Mode applies to both message and presence event windows

### Scroll Position Preservation
- When switching between single/split view, scroll positions are maintained
- 50ms timeout ensures DOM updates complete before adjusting scroll
- Only applies when auto-scroll is enabled

### Error Handling
- Publish errors show both indicator flash AND detailed error toast
- Subscribe errors display toast notifications
- Graceful cleanup on connection failures

## Recent Updates

### Page Settings Implementation
- Added comprehensive `pageSettings` JSON object that captures all user inputs
- Implemented real-time updates on every field change with console logging
- Created wrapper functions for all UI state changes to sync with settings
- Prepared foundation for future persistence and versioning features

### Enhanced Copy Functionality  
- Added dual copy icons when presence events are enabled
- Separate copy functions for messages vs presence events
- Logical positioning within respective window headers
- Smart disable state when no data available

## Future Enhancement Areas
- **Settings Persistence**: Save/load pageSettings to localStorage or server
- **Configuration Versioning**: Allow users to save and switch between named configurations
- **Settings Export/Import**: JSON export/import functionality for sharing configurations
- Real-time connection status integration
- Advanced filtering options
- Message replay capabilities
- Performance optimizations for high-volume streams