# PubNub Presence Developer Tools - Implementation Documentation

## Overview
The Presence page (`/src/pages/presence.tsx`) is a comprehensive developer tool for testing and understanding PubNub Presence functionality. It provides real-time monitoring, REST API testing, simulated user management, and administrative controls.

## Current Implementation Status
✅ **COMPLETE** - Fully functional presence developer toolkit

## Architecture

### Key Components
1. **Real-Time Presence Monitor** - Left panel for live event monitoring
2. **Presence REST Calls** - Right panel for API testing and data display
3. **Test User Instances** - Bottom left for simulated user management
4. **Presence Administration** - Bottom right for advanced controls

### File Structure
```
src/pages/presence.tsx - Main component (1,200+ lines)
├── State Management (React hooks)
├── PubNub Integration (via CDN)
├── UI Components (Radix UI + Tailwind)
└── Configuration Integration (settings service)
```

## Technical Implementation

### State Management
```typescript
// Core monitoring state
const [isMonitoring, setIsMonitoring] = useState(false);
const [monitorChannel, setMonitorChannel] = useState('presence-demo-channel');
const [monitorPubnub, setMonitorPubnub] = useState<any>(null);
const [monitorSubscription, setMonitorSubscription] = useState<any>(null);

// REST API settings
const [enableHereNow, setEnableHereNow] = useState(true);
const [enableWhereNow, setEnableWhereNow] = useState(true);
const [autoRefresh, setAutoRefresh] = useState(true);
const [refreshInterval, setRefreshInterval] = useState(5000);

// Data storage
const [presenceEvents, setPresenceEvents] = useState<PresenceEvent[]>([]);
const [hereNowData, setHereNowData] = useState<HereNowData[]>([]);
const [whereNowData, setWhereNowData] = useState<{uuid: string, channels: string[]}[]>([]);

// User instances
const [userInstances, setUserInstances] = useState<UserInstance[]>([]);
const [maxInstances, setMaxInstances] = useState(10);
const [namePrefix, setNamePrefix] = useState('Test-User');
```

### Core Interfaces
```typescript
interface UserInstance {
  id: string;
  name: string;
  pubnub: any;
  subscription: any;
  isConnected: boolean;
  joinedChannels: string[];
  state?: any;
  lastSeen?: Date;
}

interface PresenceEvent {
  id: string;
  channel: string;
  action: 'join' | 'leave' | 'timeout' | 'state-change';
  uuid: string;
  occupancy: number;
  timestamp: Date;
  state?: any;
}

interface HereNowData {
  channel: string;
  occupancy: number;
  uuids: string[];
  lastUpdated: Date;
}
```

### Key Functions

#### Monitoring Functions
- `startMonitoring()` - Initialize PubNub connection and presence event subscription
- `stopMonitoring()` - Clean up connections and stop monitoring
- `refreshPresenceData()` - Execute Here Now and Where Now API calls

#### User Instance Management
- `createUserInstance()` - Create new simulated user with PubNub connection
- `removeUserInstance(instanceId)` - Clean up and remove user instance
- `toggleUserConnection(instanceId)` - Connect/disconnect user to/from monitor channel
- `removeAllUserInstances()` - Bulk cleanup of all instances
- `connectAllInstances()` - Bulk connect all users to monitor channel
- `disconnectAllInstances()` - Bulk disconnect all users

### PubNub Integration

#### Configuration
```typescript
const pubnubConfig = {
  publishKey: settings.credentials.publishKey,
  subscribeKey: settings.credentials.subscribeKey,
  userId: 'presence-monitor-' + Date.now(),
  enableEventEngine: true,
  authKey: settings.credentials.pamToken // if available
};
```

#### Event Handling
```typescript
subscription.onPresence = (presenceEvent) => {
  // Process join, leave, timeout, state-change events
  // Update occupancy counts and event history
};

subscription.onStatus = (statusEvent) => {
  // Handle connection status changes
  // Trigger initial data fetch on connection
};
```

#### API Calls
- **Here Now**: `pubnub.hereNow({ channels: [channel], includeUUIDs: true, includeState: true })`
- **Where Now**: `pubnub.whereNow({ uuid: userId })`
- **Subscribe**: `channel.subscription({ receivePresenceEvents: true })`

## UI Layout Structure

### Main Layout (Side-by-Side)
```
┌─────────────────────────────────────────────────────────────┐
│                     Page Header                             │
├─────────────────────────┬───────────────────────────────────┤
│  Real-Time Monitor      │    Presence REST Calls           │
│  - Channel input        │    - API toggles & settings      │
│  - Start/Stop toggle    │    - Current occupancy display   │
│  - Recent events list   │    - Where Now results           │
└─────────────────────────┴───────────────────────────────────┤
├─────────────────────────┬───────────────────────────────────┤
│  Test User Instances    │    Presence Administration       │
│  - Create/manage users  │    - Clear data controls         │
│  - Connect/disconnect   │    - Advanced options           │
│  - Instance details     │    - Batch operations           │
└─────────────────────────┴───────────────────────────────────┘
```

### Responsive Behavior
- **Large screens (lg+)**: Side-by-side layout (50/50 split)
- **Medium/small screens**: Stacked layout for mobile optimization
- **Scrollable content**: Max heights with overflow for data displays

## Configuration Integration

### Page Settings Auto-Sync
```typescript
const currentPageSettings = useMemo(() => {
  return {
    monitor: { channel: monitorChannel, enableHereNow, enableWhereNow, autoRefresh, refreshInterval },
    instances: { maxInstances, namePrefix },
    ui: { showAdvanced, showInstanceDetails },
    _version: CURRENT_CONFIG_VERSION
  };
}, [/* all dependencies */]);
```

### Storage Integration
- Uses existing `storage` service for PubNub credentials
- Integrates with `useConfig` hook for page settings persistence
- Auto-saves configuration changes to localStorage and PubNub App Context

## Features Implemented

### ✅ Real-Time Presence Monitoring
- Live presence event subscription with start/stop controls
- Real-time event display with color-coded action indicators
- Channel configuration with copy-to-clipboard functionality
- Event history management with clear controls

### ✅ REST API Testing
- Here Now API integration with occupancy display
- Where Now API integration with channel tracking
- Auto-refresh functionality with configurable intervals
- Manual refresh controls with proper error handling

### ✅ Simulated User Management
- Create up to 50 test user instances
- Individual connect/disconnect controls
- Batch operations (connect all, disconnect all)
- Instance details display with connection status
- Proper cleanup and memory management

### ✅ Administration Tools
- Data clearing functionality
- Advanced options toggle
- Instance detail visibility controls
- Comprehensive error handling and user feedback

### ✅ UI/UX Features
- Professional design matching app patterns
- PubNub brand colors and consistent styling
- Responsive layout for all screen sizes
- Loading states and disabled states
- Toast notifications for user feedback
- Proper accessibility with labels and descriptions

## Best Practices Implemented

### PubNub Integration
- Event Engine enabled for reliable connections
- Proper cleanup and resource management
- Unique user IDs for accurate presence tracking
- Error handling with graceful fallbacks

### React Patterns
- Functional components with hooks
- Proper useEffect dependencies
- Memory leak prevention with cleanup
- State management best practices

### Performance
- Data limiting (100 events max, 50 instances max)
- Efficient re-renders with useMemo
- Proper scroll handling with auto-scroll controls
- Optimized API calls with proper caching

## Future Enhancement Opportunities

### Potential Features
1. **State Management**: User state setting and monitoring
2. **Channel Groups**: Support for presence on channel groups
3. **Historical Data**: Presence history visualization and export
4. **Advanced Filtering**: Filter events by action type, user, etc.
5. **Bulk Operations**: Mass user creation with templates
6. **Export Functions**: Export presence data to JSON/CSV
7. **Real-time Charts**: Occupancy trends and visualization
8. **Presence Regions**: Multi-region presence testing

### Technical Improvements
1. **Performance**: Virtual scrolling for large event lists
2. **Testing**: Unit tests for core functions
3. **Error Handling**: More granular error states
4. **Documentation**: JSDoc comments for functions
5. **Accessibility**: Enhanced screen reader support
6. **Mobile**: Touch-optimized controls

## Dependencies

### External Libraries
- React 18 (hooks, state management)
- Lucide React (icons)
- Radix UI (components)
- Tailwind CSS (styling)
- PubNub JavaScript SDK (via CDN)

### Internal Dependencies
- `@/hooks/use-toast` - Toast notifications
- `@/lib/storage` - Settings and credentials
- `@/contexts/config-context` - Configuration management
- `@/components/ui/*` - Reusable UI components

## Development Notes

### PubNub Requirements
- Presence must be enabled in PubNub Admin Portal
- "Selected channels only" configuration recommended
- Presence Management configuration required for channel rules
- Subscribe key required minimum, Publish key for full functionality

### Testing Workflow
1. Configure PubNub keys in Settings
2. Start monitoring a channel
3. Create test user instances
4. Connect users to the channel
5. Observe presence events and occupancy changes
6. Test REST API calls and data refresh

### Common Issues
- Presence not working: Check Admin Portal configuration
- No events: Ensure presence events are enabled for the channel
- Connection failures: Verify PubNub credentials
- Memory issues: User instances not cleaned up properly

## Code Maintenance

### Key Areas to Monitor
- Memory leaks in PubNub instance management
- useEffect dependency arrays for proper cleanup
- State updates causing unnecessary re-renders
- Error handling for network failures

### When Adding Features
- Update interfaces for new data structures
- Add proper TypeScript types
- Include error handling and loading states
- Update page settings auto-sync
- Test responsive behavior
- Add proper cleanup in useEffect hooks

This documentation provides the complete context needed to continue development on the Presence page efficiently.