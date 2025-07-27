# PubSub Page Porting Plan

## Overview
This plan details the complete migration from the monolithic `/pubsub` page (1,901 lines) to the new wireframe-based UX design (`/pubsub-wireframe` - 639 lines), while preserving 100% of the original functionality and splitting the code into modular component files.

## Current State Analysis

### Original Page Structure (`src/pages/pubsub.tsx`)
- **Size**: 1,901 lines - fully monolithic
- **Key Features**:
  - Schema-driven field definitions with FIELD_DEFINITIONS object
  - Config migration system (version 1)
  - Real-time message display with presence events
  - Advanced publish panel with meta, TTL, custom message types
  - Subscribe panel with channels, channel groups
  - Subscribe filters (server-side filtering with target/field/operator/value)
  - Advanced options (cursor timetoken/region, heartbeat, restore on reconnect)
  - Message persistence and storage
  - UI state management (show/hide panels, message height)
  - PubNub SDK integration via usePubNub hook
  - Toast notifications and error handling
  - Local storage integration via storage lib

### Wireframe Structure (`src/pages/pubsub-wireframe.tsx`)
- **Size**: 639 lines - basic mockup without full functionality
- **New UX Design**:
  - Tabbed "Subscription Configuration" panel (Channels/Groups/Filters/Advanced)
  - Cleaner message display area
  - Improved quick publish panel
  - Better visual hierarchy and status indicators

### Target Component Structure (Based on other pages)
Following patterns from `/file-sharing`, `/app-context`, `/access-manager`:
```
src/components/pubsub/
├── index.ts                          # Export barrel
├── types.ts                          # TypeScript interfaces
├── utils.ts                          # Utility functions
├── PubSubPage.tsx                    # Main page component
├── LiveMessagesPanel.tsx             # Real-time message display
├── QuickPublishPanel.tsx             # Publishing interface
├── SubscriptionConfigPanel.tsx       # Tabbed subscription config
├── tabs/
│   ├── ChannelsTab.tsx              # Channels configuration
│   ├── GroupsTab.tsx                # Channel groups configuration
│   ├── FiltersTab.tsx               # Server-side filtering
│   └── AdvancedTab.tsx              # Advanced options
└── shared/
    ├── MessageItem.tsx              # Individual message display
    ├── StatusIndicator.tsx          # Connection status
    └── FilterBuilder.tsx            # Filter configuration UI
```

## Detailed Implementation Plan

### Phase 1: Setup and Core Infrastructure (Foundation)
1. **Create component directory structure**
   - Create `src/components/pubsub/` directory
   - Create subdirectories: `tabs/`, `shared/`
   - Create `index.ts`, `types.ts`, `utils.ts` files

2. **Extract and define TypeScript interfaces** 
   - Port FIELD_DEFINITIONS structure to types.ts
   - Define interfaces for:
     - `PubSubConfig` (publish/subscribe/ui/filters sections)
     - `MessageData`, `PresenceEvent`, `FilterConfig`
     - `PublishFormData`, `SubscribeFormData`
     - `UIState`, `FilterState`
   - Define config migration types and version constants

3. **Create utilities module**
   - Port config migration functions from original pubsub.tsx (lines ~50-100)
   - Create message formatting utilities
   - Create filter expression generation utilities
   - Create validation functions for channels, groups, etc.

4. **Set up base PubSubPage component**
   - Create `PubSubPage.tsx` as main container
   - Implement basic layout structure matching wireframe
   - Set up state management using original schema-driven approach
   - Integrate usePubNub hook and useConfig context
   - Set up storage integration for persistence

### Phase 2: Live Messages Panel (Core Functionality)
5. **Create LiveMessagesPanel component**
   - Port real-time message display logic (lines ~600-900 in original)
   - Implement message filtering and sorting
   - Add presence event handling
   - Include "Receive Presence Events" and "Show Raw Message Data" toggles
   - Port copy/clear functionality
   - Implement scroll-to-bottom behavior
   - Add connection status indicator

6. **Create MessageItem component**
   - Extract individual message rendering logic
   - Handle different message types (regular, presence, error)
   - Implement raw data toggle functionality
   - Add timestamp formatting and sender information

7. **Create StatusIndicator component**
   - Port subscription status logic
   - Show connection state, message count, active filters
   - Visual indicators (green/gray dots, badges)

### Phase 3: Quick Publish Panel (Publishing Functionality)
8. **Create QuickPublishPanel component**
   - Port complete publish form logic (lines ~1100-1400 in original)
   - Implement channel input with history/autocomplete
   - Add message textarea with JSON formatting
   - Include "Store in History" and "Send by POST" toggles
   - Add advanced publish options (collapsible)
   - Port TTL, custom message type, meta fields
   - Implement publish validation and error handling
   - Add publish status feedback/toasts

### Phase 4: Subscription Configuration Tabs (Tabbed Interface)
9. **Create SubscriptionConfigPanel component**
   - Implement tabbed interface container
   - Port subscription state management
   - Add tab switching logic
   - Include filter count badges on tabs

10. **Create ChannelsTab component**
    - Port channels input functionality (lines ~1450-1500 in original)
    - Implement comma-separated channel parsing
    - Add wildcard pattern support documentation
    - Include channel validation

11. **Create GroupsTab component**
    - Port channel groups input functionality
    - Implement comma-separated groups parsing
    - Add group validation

12. **Create FiltersTab component**
    - Port complete subscribe filters logic (lines ~1600-1750 in original)
    - Implement dynamic filter addition/removal
    - Create target/field/operator/value dropdowns
    - Add filter expression generation and preview
    - Port "Add Another Filter" functionality
    - Include filter validation

13. **Create AdvancedTab component**
    - Port advanced options (lines ~1800-1890 in original)
    - Implement cursor timetoken/region inputs
    - Add "Enable Heartbeat" toggle
    - Add "Restore on Reconnect" toggle
    - Include heartbeat interval configuration
    - Add field validation

### Phase 5: Shared Components (Reusable UI)
14. **Create FilterBuilder component**
    - Extract filter configuration UI from FiltersTab
    - Make reusable for multiple filter types
    - Implement dropdown validation and field constraints

15. **Enhance shared components**
    - Add loading states and error boundaries
    - Implement consistent styling patterns
    - Add accessibility features (ARIA labels, keyboard navigation)

### Phase 6: Integration and State Management (Wiring Everything Together)
16. **Complete state integration**
    - Port complete schema-driven config system
    - Ensure bidirectional sync between components and storage
    - Implement config migration for backward compatibility
    - Add proper error handling and validation

17. **Integrate PubNub functionality**
    - Port subscribe/unsubscribe logic
    - Implement message handling and event listeners
    - Add reconnection and heartbeat management
    - Ensure proper cleanup on component unmount

18. **Add advanced features**
    - Port message persistence integration
    - Implement proper toast notifications
    - Add keyboard shortcuts and accessibility
    - Include debug logging and developer tools integration

### Phase 7: Testing and Optimization (Quality Assurance)
19. **Functional testing**
    - Test all publish scenarios (basic, advanced, POST, TTL, meta)
    - Test all subscribe scenarios (channels, groups, filters, advanced)
    - Test real-time message flow and presence events
    - Test config persistence and migration
    - Test error handling and edge cases

20. **UI/UX validation**
    - Ensure wireframe design is fully implemented
    - Test responsive behavior and mobile compatibility
    - Validate accessibility compliance
    - Test keyboard navigation and screen readers

21. **Performance optimization**
    - Optimize component re-renders
    - Implement proper memoization where needed
    - Test with high message volumes
    - Optimize bundle size and loading performance

### Phase 8: Migration and Cleanup (Final Steps)
22. **Route migration**
    - Update `/pubsub` route to use new PubSubPage component
    - Ensure seamless transition for existing users
    - Test that all saved configurations still work

23. **Documentation and cleanup**
    - Document component API and props
    - Add JSDoc comments for complex functions
    - Remove original monolithic pubsub.tsx file
    - Update any references or imports

## Critical Implementation Notes

### State Management Patterns
- **Preserve schema-driven approach**: The original FIELD_DEFINITIONS pattern must be maintained for config persistence
- **Bidirectional sync**: All form fields must sync with storage via the established patterns
- **Migration compatibility**: Version 1 config migration must work seamlessly

### Key Functionality Requirements
- **100% feature parity**: Every feature in the 1,901-line original must be preserved
- **Real-time performance**: Message display must handle high-frequency updates
- **Filter complexity**: Server-side filtering with complex expressions must work identically
- **Config persistence**: All user settings must persist across sessions
- **Error handling**: Toast notifications and error states must match original behavior

### Integration Points
- **usePubNub hook**: Core PubNub SDK integration - do not modify
- **useConfig context**: Global configuration management - preserve patterns
- **storage lib**: Local storage abstraction - use existing API
- **Toast system**: Error/success notifications - maintain consistency

### Component Communication
- **Props down, events up**: Standard React patterns for component communication
- **Context for shared state**: Use existing config context, avoid new contexts unless necessary
- **Event handlers**: Preserve original handler naming and behavior patterns

### Testing Priorities
1. **Message flow**: Publish → Subscribe → Display pipeline
2. **Config persistence**: Save → Load → Migrate configurations
3. **Filter functionality**: Complex server-side filtering expressions
4. **Error scenarios**: Network failures, invalid inputs, API errors
5. **UI state**: Panel visibility, tab switching, responsive behavior

This plan ensures complete functionality preservation while achieving the improved UX design and modular architecture goals. Each phase builds upon the previous, allowing for incremental development and testing.