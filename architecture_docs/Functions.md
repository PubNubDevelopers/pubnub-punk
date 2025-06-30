# Functions.md - Claude Development Context

## Implementation Status: COMPLETE ✅
**Date**: 2025-01-27
**Version**: 1.0.0 - Full featured PubNub Functions 2.0 developer tool

## Architecture & Design Decisions

### Core Structure
- **File**: `/src/pages/functions.tsx` - 916 lines, fully implemented
- **Pattern**: Follows existing codebase patterns from pubsub.tsx (1838 lines) and file-sharing.tsx (2023 lines)
- **Config Integration**: Uses `useConfig` context with FIELD_DEFINITIONS for state persistence
- **Layout**: Split-panel design - code editor (left) + testing/results (right)

### Key Implementation Details

#### Config Management (Lines 52-65)
```typescript
const FIELD_DEFINITIONS = {
  'functions.selectedFunction': { section: 'functions', field: 'selectedFunction', type: 'string', default: 'message-enricher' },
  'functions.functionType': { section: 'functions', field: 'functionType', type: 'string', default: 'before-publish' },
  'functions.channel': { section: 'functions', field: 'channel', type: 'string', default: 'test-channel' },
  'functions.channelPattern': { section: 'functions', field: 'channelPattern', type: 'string', default: '' },
  'functions.code': { section: 'functions', field: 'code', type: 'string', default: '' },
  // ... more fields
}
```
- **Critical**: Each field uses dot notation for nested config structure
- **Pattern**: Matches exact pattern from pubsub.tsx and file-sharing.tsx
- **State Sync**: Auto-persisted via useConfig context with setConfigType('FUNCTIONS')

#### Function Templates System (Lines 68-228)
```typescript
const FUNCTION_TEMPLATES = {
  'before-publish': { name: 'Before Publish', description: '...', code: `export default async (request) => {...}` },
  'after-publish': { name: 'After Publish', description: '...', code: `export default async (request) => {...}` },
  'on-request': { name: 'On Request (HTTP)', description: '...', code: `export default async (request, response) => {...}` },
  'on-interval': { name: 'On Interval (Scheduled)', description: '...', code: `export default async (event) => {...}` }
}
```
- **Templates Based On**: Actual PubNub Functions 2.0 patterns from MCP research
- **Signature Differences**: 
  - Event triggers: `(request)` or `(event)` with `.ok()/.abort()`
  - HTTP triggers: `(request, response)` with `response.send()`
- **Modules Used**: kvstore, xhr, vault, pubnub, crypto - all real PubNub modules
- **Best Practices**: Includes try/catch, proper error handling, async/await

#### Mock Execution System (Lines 230-261)
```typescript
const MOCK_EXECUTION_RESULTS = {
  success: { status: 'completed', duration: 245, result: 'ok', logs: [...], output: {...} },
  error: { status: 'error', duration: 89, result: 'abort', logs: [...], error: '...', output: null }
}
```
- **Purpose**: Simulates real function execution for testing
- **Randomization**: 70% success rate (Math.random() > 0.3)
- **Realistic Data**: Includes timing, logs with levels, structured output
- **Future Enhancement**: Replace with actual PubNub Functions API calls

#### UI Component Structure

##### Left Panel - Code Editor (Lines 471-616)
- **Function Type Selector**: 4 types with dynamic UI changes
- **Template Loader**: Loads pre-built templates with toast feedback
- **Channel/HTTP Config**: Dynamic based on function type
- **Code Textarea**: Full-height with monospace font, 300px min-height
- **Available Modules Display**: Shows all PubNub modules

##### Right Panel - Testing (Lines 618-911)
- **Test Configuration Card**: Tabbed interface (Message/HTTP/Context)
- **Execution Results Card**: Collapsible logs/output sections
- **Function Info Card**: Reference for modules and limits

#### State Management Pattern
```typescript
// Computed values from pageSettings (Lines 310-322)
const functionType = pageSettings?.functions?.functionType || FIELD_DEFINITIONS['functions.functionType'].default;
const code = pageSettings?.functions?.code || FUNCTION_TEMPLATES['before-publish'].code;

// Update helper (Lines 324-336)
const updateField = (path: string, value: any) => {
  const def = FIELD_DEFINITIONS[path as keyof typeof FIELD_DEFINITIONS];
  if (def) {
    setPageSettings(prev => ({
      ...prev,
      [def.section]: { ...prev?.[def.section], [def.field]: value }
    }));
  }
};
```
- **Pattern**: Matches exactly with pubsub.tsx useMemo pattern for config sync
- **Safety**: Null-safe access with fallbacks to defaults
- **Performance**: Only re-renders on actual changes

## PubNub Functions 2.0 Knowledge Base

### Function Types & Signatures
1. **Before/After Publish/Signal**: `async (request) => request.ok()|request.abort()`
2. **HTTP Endpoints**: `async (request, response) => response.send(body, statusCode)`
3. **Scheduled**: `async (event) => event.ok()|event.abort()`

### Available Modules (From MCP Research)
- **Core**: `kvstore`, `xhr`, `vault`, `pubnub`
- **Utilities**: `crypto`, `utils`, `uuid`, `jwt`
- **Codecs**: `codec/auth`, `codec/base64`, `codec/query_string`
- **Advanced**: `advanced_math`, `jsonpath`

### Execution Limits
- Max 3 external operations per execution (XHR, KV, publish/fire)
- Max 3-level function chaining
- Async/await supported, avoid .then()/.catch()
- ES6+ JavaScript features available

### Channel Patterns
- Wildcards must be at end: `alerts.*` ✅, `alerts.*.critical` ❌
- Max 2 literal segments before wildcard: `prefix.sub.*` ✅

## Implementation Notes

### Key Functions
- `loadTemplate(type)` - Loads template and updates function type
- `formatCode()` - Basic JavaScript formatting
- `testFunction()` - Mock execution with realistic timing
- `updateField(path, value)` - Config state updater
- `formatJson(field, value)` - JSON formatter for test data

### State Variables
- `executing: boolean` - Test execution state
- `executionResult: any` - Last execution result with logs/output
- `showLogs/showResult: boolean` - UI toggles for result sections
- `mounted: boolean` - Component mount state

### CSS Classes Used
- `font-mono text-sm` - Code editor styling
- `bg-pubnub-blue`, `bg-green-500`, `bg-red-500` - Brand colors
- `flex-1 flex flex-col` - Layout system
- `space-y-4`, `gap-6` - Spacing system

## Future Enhancements

### Priority 1 - Core Functionality
1. **Real PubNub Functions API Integration**
   - Replace mock execution with actual PubNub Functions API
   - Use MCP Server's `mcp__pubnub__write_pubnub_app` if available
   - Implement function deployment/management

2. **Advanced Code Editor**
   - Syntax highlighting (Monaco Editor or CodeMirror)
   - Auto-completion for PubNub modules
   - Error highlighting and validation

### Priority 2 - Developer Experience  
3. **Function Management**
   - Save/load functions from local storage
   - Function versioning system
   - Import/export function code

4. **Enhanced Testing**
   - Multiple test scenarios per function
   - Test result history
   - Performance benchmarking

### Priority 3 - Advanced Features
5. **Debugging Tools**
   - Breakpoint simulation
   - Variable inspection
   - Step-through execution

6. **Integration Features**
   - Deploy to PubNub account
   - Function analytics dashboard
   - Real-time function monitoring

## Dependencies & Imports
```typescript
// React hooks used
import { useState, useEffect, useMemo, useRef } from 'react';

// UI components used  
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Icons from lucide-react (23 total)
import { Code, Play, Settings, Monitor, Activity, CheckCircle2, XCircle, /* ... */ } from 'lucide-react';

// Contexts and utilities
import { useToast } from '@/hooks/use-toast';
import { useConfig } from '@/contexts/config-context';
import { storage } from '@/lib/storage';
```

## Error Handling Patterns
- All async functions wrapped in try/catch
- Toast notifications for user feedback
- Graceful degradation for invalid JSON
- Null-safe config access throughout

## Testing Strategy
- Mock execution with realistic results
- Randomized success/failure for demo
- Structured logging with different levels
- JSON output formatting and display

## Code Quality Notes
- 916 lines total, well-structured
- TypeScript throughout with proper typing
- Follows existing codebase patterns exactly
- No external dependencies beyond existing UI kit
- Responsive design with proper mobile support

## Integration Points
- Uses same config system as other pages
- Follows same UI/UX patterns as pubsub.tsx
- Compatible with existing routing in App.tsx
- Uses same toast system and error handling

## Performance Considerations
- Computed values with proper dependencies
- Minimal re-renders using useMemo patterns
- Efficient state updates via updateField helper
- Lazy loading of execution results

## Security Notes
- No actual PubNub API calls yet (mock only)
- No credential exposure in templates
- Safe JSON parsing with error handling
- Proper input sanitization for test data