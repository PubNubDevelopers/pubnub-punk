# Channel Groups Page - Architecture & Current State

## Critical Context
- **NEVER** store channel groups in localStorage - this was the main bug fixed
- PubNub has **no "list all channel groups" API** - must query by name
- Requires **Stream Controller add-on** enabled in PubNub Admin Portal
- Requires **secret key** for channel group operations

## Current Implementation (/src/pages/channel-groups.tsx)

### Fixed Issues (2025-07-21)
1. **Infinite Loop Bug**: `updateField` in `loadChannelGroups` dependencies caused re-render loops
   - **Fix**: Replace `updateField()` with direct `setPageSettings()` calls
2. **Local Storage Misuse**: Groups were incorrectly stored in localStorage
   - **Fix**: Removed all localStorage operations, use only PubNub APIs

### Architecture Pattern
```typescript
// Query-based system (users must specify group names to check)
const [groupNamesToQuery, setGroupNamesToQuery] = useState<string[]>([]);

// Load groups by querying each name via PubNub API
const loadChannelGroups = useCallback(async () => {
  // For each group name, call pubnub.channelGroups.listChannels()
  // Groups that don't exist are silently ignored
}, [pubnub, groupNamesToQuery, toast, setPageSettings]); // NO updateField here!
```

### Key Functions
- `loadChannelGroups()`: Queries PubNub for each group name in `groupNamesToQuery`
- `createChannelGroup()`: Uses `pubnub.channelGroups.addChannels()` + adds to query list
- `addChannelToGroup()`: Uses `pubnub.channelGroups.addChannels()` 
- `removeChannelFromGroup()`: Uses `pubnub.channelGroups.removeChannels()`
- `deleteChannelGroup()`: Uses `pubnub.channelGroups.deleteGroup()` + removes from query list

### State Management
- `channelGroups[]`: Current groups loaded from PubNub (React state only)
- `groupNamesToQuery[]`: User-managed list of group names to check
- Config updates via `setPageSettings()` not `updateField()` (prevents loops)

### UI Flow
1. **Empty State**: Shows "No groups to query" + instructions
2. **Add Groups**: Search button opens dialog to add group names to query
3. **Create Groups**: Plus button creates new group + auto-adds to query list
4. **Operations**: All CRUD operations work directly with PubNub APIs

### PubNub API Usage
```typescript
// List channels in group (verification)
await pubnub.channelGroups.listChannels({ channelGroup: name });

// Create/add channels to group  
await pubnub.channelGroups.addChannels({ 
  channels: ['ch1', 'ch2'], 
  channelGroup: 'group-name' 
});

// Remove channels from group
await pubnub.channelGroups.removeChannels({
  channels: ['ch1'], 
  channelGroup: 'group-name'
});

// Delete entire group
await pubnub.channelGroups.deleteGroup({ channelGroup: 'group-name' });
```

### Critical Dependencies
- `usePubNub({ instanceId: 'channel-groups' })`: Centralized PubNub connection
- Secret key in settings required for channel group operations
- `useConfig()` for page settings persistence (UI state only)

### Testing Setup
- PubNub keys: pub-c-17c0aef0-b03b-460f-8f93-69fa5d80034a, sub-c-f18d5abb-122f-4ca0-9031-64e002e0fad0, sec-c-MTc4MGEzMDUtNTU4Ni00MGEwLTgyYjItZDE3MzUxYTkxZjc0
- User ID: test-user-123

## Performance Notes
- No longer causes infinite loops/flickering 
- Still some connection logs on form input (minor issue, not critical)
- Group descriptions are UI-only (PubNub doesn't store them server-side)

## Future Improvements Needed
- Could reduce PubNub connection chatter on form inputs
- Consider caching group existence checks
- Add bulk operations for multiple group management