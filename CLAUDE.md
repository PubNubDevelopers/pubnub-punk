# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The PubNub Ultimate Ninja Kit is a comprehensive client-side developer toolkit for building, testing, and managing PubNub applications. It provides professional-grade tools for all PubNub services including Pub/Sub, Presence, File Sharing, Mobile Push, Access Manager (PAM), Persistence, Channel Groups, and App Context.

## Development Commands

### Core Commands
- `npm run dev` - Start development server (Vite) at http://localhost:5173
- `npm run build` - Build production bundle to `dist/`
- `npm run preview` - Preview production build locally
- `npm run check` - Run TypeScript type checking without building

### Testing Commands
- `npm test` - Run unit tests with Vitest
- `npm run test:ui` - Run unit tests with interactive UI
- `npm run test:watch` - Run unit tests in watch mode
- `npm run test:coverage` - Run unit tests with coverage report
- `npm run test:e2e` - Run end-to-end tests with Playwright
- `npm run test:e2e:ui` - Run E2E tests with Playwright UI
- `npm run test:e2e:debug` - Run E2E tests in debug mode

### Test Execution Notes
- E2E tests require dev server to be running (Playwright auto-starts it)
- E2E tests run in headed mode by default (configured in playwright.config.ts:25)
- Test files are in `/tests` directory
- Unit tests use Vitest with React Testing Library

## Architecture Overview

### Technology Stack
- **React 18** with TypeScript for type safety
- **Vite** for fast development and building with HMR
- **Tailwind CSS** for styling
- **Radix UI** for accessible component primitives
- **Wouter** for lightweight client-side routing
- **PubNub JavaScript SDK v9.6.1** for real-time functionality

### Application Structure
```
src/
├── components/
│   ├── ui/                    # Base UI components (Radix wrappers)
│   ├── pubsub/               # Pub/Sub feature components (modular architecture)
│   ├── app-shell.tsx         # Main layout wrapper
│   └── sidebar.tsx           # Navigation sidebar
├── pages/                     # Feature pages (one per PubNub service)
├── lib/
│   ├── storage.ts            # LocalStorage wrapper for settings
│   ├── instance-registry.ts  # PubNub instance management registry
│   └── utils.ts              # Utility functions
├── contexts/
│   ├── pubnub-context.tsx    # Global PubNub connection management
│   └── config-context.tsx    # Page configuration state management
├── hooks/
│   └── usePubNub.ts          # Core hook for PubNub connection management
└── types/                     # TypeScript type definitions
```

## Critical Architecture Patterns

### PubNub Connection Management (Hybrid Approach)

The application uses a **hybrid connection architecture** that distinguishes between stateless and stateful operations:

**Centralized for Stateless Operations** (via `usePubNub` hook):
- Publish messages
- Fetch message history
- Channel group management
- File operations
- Access Manager (PAM) operations
- Presence queries (here-now/where-now)

**Local for Stateful Operations** (managed in components):
- Subscribe to channels/channel groups
- Maintain active subscriptions
- Handle real-time message callbacks

**Key Files**:
- `src/hooks/usePubNub.ts` - Centralized connection hook with instance registry
- `src/contexts/pubnub-context.tsx` - Global context for settings and default instance
- `src/lib/instance-registry.ts` - Instance reuse registry

**Usage Pattern**:
```typescript
// For stateless operations (publish, history, etc.)
const { pubnub, isReady, isConnected, connectionError } = usePubNub({
  instanceId: 'my-page',
  userId: 'my-user'
});

// For stateful operations (subscriptions)
const subscription = pubnub.channel(['my-channel']).subscription();
subscription.onMessage = (msg) => { /* handle locally */ };
subscription.subscribe();

// Cleanup subscriptions in useEffect
useEffect(() => {
  return () => subscription?.unsubscribe();
}, [subscription]);
```

### Configuration Management

The application implements a sophisticated configuration versioning system:

**Storage Layers**:
1. **LocalStorage** - Primary storage for all settings
2. **PubNub Persistence** (disabled) - Historical message storage
3. **PubNub App Context** (disabled) - Metadata storage

**Key Files**:
- `src/lib/storage.ts` - LocalStorage operations
- `src/contexts/config-context.tsx` - React context for page settings

**Configuration Pattern**:
Each page should implement page settings that auto-sync with the config context:
```typescript
const [pageSettings, setPageSettings] = useState({ /* feature config */ });
const { setPageSettings: setConfigPageSettings } = useConfig();

useEffect(() => {
  setConfigPageSettings(pageSettings);
  console.log('🔧 Page Settings Updated:', pageSettings);
}, [pageSettings]);
```

### Component Structure Pattern

Pages follow this standard structure:
1. Import PubNub connection via `usePubNub` hook
2. Manage local state for UI and subscriptions
3. Implement page settings for configuration persistence
4. Use toast notifications for user feedback
5. Implement proper cleanup in useEffect hooks

### Instance Registry System

The `InstanceRegistry` class manages PubNub instance reuse:
- Instances are keyed by credentials + configuration
- Shared instances reduce overhead
- Automatic cleanup on settings changes
- Debug info available via `getDebugInfo()`

## Route Management

Routes are defined in `src/App.tsx` with a `pageConfig` object mapping paths to titles/subtitles.

**Adding a new page**:
1. Create page component in `src/pages/`
2. Add route to `App.tsx` Switch component
3. Add page config entry to `pageConfig` object
4. Update sidebar navigation in `src/components/sidebar.tsx`

## Key Implementation Notes

### PubNub SDK Loading
- PubNub SDK is loaded via CDN (configured in `index.html`)
- Type definitions from `pubnub` npm package
- Check `window.PubNub` availability before instantiation

### Settings Management
- All app settings stored in localStorage under key `pubnub_developer_tools_settings`
- Settings structure defined in `src/types/settings.ts` as `AppSettings`
- Default settings in `src/lib/storage.ts:7-27`
- PAM (Access Manager) support via `pamEnabled` flag and `pamToken` field

### Error Handling Pattern
```typescript
try {
  const result = await pubnub.someOperation();
  toast({ title: "Success", description: "Operation completed" });
} catch (error) {
  console.error('Operation failed:', error);
  toast({
    title: "Error",
    description: error.message || "Operation failed",
    variant: "destructive"
  });
}
```

### Path Alias
- `@/` maps to `src/` directory (configured in vite.config.ts:8-10)
- Always use `@/` imports for consistency

## Pub/Sub Refactor (Current State)

The Pub/Sub page is currently being refactored to a modular architecture:
- **Old implementation**: `src/pages/pubsub.tsx` (archived)
- **New implementation**: `src/components/pubsub/` (modular components)
- The new implementation uses:
  - Separate components for panels (LiveMessagesPanel, QuickPublishPanel, etc.)
  - Custom hooks in `src/components/pubsub/hooks/`
  - Shared utilities in `src/components/pubsub/utils.ts`
  - Tab-based organization in `src/components/pubsub/tabs/`

## Testing Approach

### Unit Tests (Vitest)
- Test utilities and business logic
- Mock PubNub SDK operations
- Use React Testing Library for component tests
- Located in `/tests` directory

### E2E Tests (Playwright)
- Test real PubNub integration
- Require valid PubNub credentials (set in Settings page)
- Run against local dev server
- Test complete user workflows

**Important**: Tests involving PubNub APIs require valid credentials to be configured in the application before running.

## Design System

PubNub Brand Colors:
- **Navy Blue** (`#070f39`) - Primary dark theme
- **PubNub Red** (`#c71929`) - Action buttons and highlights
- **Light Blue** (`#528dfa`) - Secondary highlights
- **Light Grey** (`#f9f9f9`) - Backgrounds
- **Dark Grey** (`#171717`) - Text

## Common Debugging

### Connection Issues
1. Check credentials in Settings page (/)
2. Verify PubNub SDK loaded: `window.PubNub` should exist
3. Check browser console for connection errors
4. Use `getDebugInfo()` from PubNubContext for instance info

### Subscription Not Receiving Messages
1. Verify local subscription is active
2. Check subscription setup includes proper callbacks
3. Ensure cleanup is not prematurely unsubscribing
4. Check PubNub Admin Console for channel permissions

### Settings Not Persisting
1. Check localStorage for `pubnub_developer_tools_settings` key
2. Verify `storage.saveSettings()` is being called
3. Check for localStorage quota exceeded errors

## Critical Files Reference

- `src/App.tsx` - Main app router and page configuration
- `src/hooks/usePubNub.ts` - Core PubNub connection management
- `src/contexts/pubnub-context.tsx` - Global PubNub context provider
- `src/lib/storage.ts` - Settings persistence layer
_(Versioned configuration subsystem removed; settings now persist only via `storage.ts`.)_
- `src/lib/instance-registry.ts` - Instance management and reuse
- `src/components/app-shell.tsx` - Main layout wrapper
- `src/components/sidebar.tsx` - Navigation and routing

## Version Management

The application includes a version management system:
- Version info displayed in sidebar footer
- Changelog modal available by clicking version
- Build-time injection of version from git tags
- Development builds show commit info

See `/architecture_docs/versionManager.md` for full documentation.
