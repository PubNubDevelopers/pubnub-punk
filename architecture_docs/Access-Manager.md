# Access Manager Architecture - Internal Implementation Guide

**Last Updated**: January 2025  
**Version**: Production-ready, simplified UI implementation  
**Purpose**: Complete technical reference for Access Manager functionality

## 🎯 Current Implementation Overview

The Access Manager is a **single-page React component** providing three core operations:
1. **Create Access Tokens** - Generate curl commands for token creation
2. **Revoke Access Tokens** - Generate curl commands for token revocation  
3. **Parse Access Tokens** - Decode and display token permissions

**Key Design Philosophy**: Browser-based tool that generates curl commands for execution, avoiding CORS limitations while providing full PAM functionality.

## 📁 File Structure & Architecture

### Primary Files
```
src/pages/access-manager.tsx         (580 lines) - Main component
src/types/access-manager.ts          (78 lines)  - TypeScript definitions
src/lib/access-manager/api.ts        (222 lines) - HMAC signature generation
src/lib/access-manager/utils.ts      (163 lines) - Utility functions
src/components/access-manager/       (1 component) - Grant dialog only
└── GrantTokenDialog.tsx             (729 lines) - Complex token creation UI
└── index.ts                         (5 lines)   - Component exports
```

### Removed/Cleaned Components
- `ParseTokenDialog.tsx` - Replaced with inline panel
- `TestTokenDialog.tsx` - Removed (no token testing)
- `RevokeTokenDialog.tsx` - Removed (inline revoke panel)
- `TokenDetailsPanel.tsx` - Removed (no token storage)
- `access-manager-original.tsx` - Deleted backup file

## 🏗️ Component Architecture

### Main Component Structure (`access-manager.tsx`)
```typescript
export default function AccessManagerPage() {
  // State Management
  const [mounted, setMounted] = useState(false)
  const [pubnubReady, setPubnubReady] = useState(false)
  const [pubnub, setPubnub] = useState<any>(null)
  
  // Core functionality states
  const [isGranting, setIsGranting] = useState(false)
  const [isRevoking, setIsRevoking] = useState(false) 
  const [isParsing, setIsParsing] = useState(false)
  
  // Dialog management
  const [grantDialogOpen, setGrantDialogOpen] = useState(false)
  
  // Form data
  const [grantForm, setGrantForm] = useState(DEFAULT_GRANT_FORM)
  const [parseTokenInput, setParseTokenInput] = useState('')
  const [parsedTokenResult, setParsedTokenResult] = useState<ParsedToken | null>(null)
  const [revokeTokenInput, setRevokeTokenInput] = useState('')
  
  // Curl command display
  const [grantTokenCurl, setGrantTokenCurl] = useState('')
  const [revokeTokenCurl, setRevokeTokenCurl] = useState('')
}
```

### UI Layout Order (Critical for UX)
1. **Configuration Warnings** (orange/yellow alerts)
2. **Curl Command Displays** (green for grant, red for revoke)
3. **Token Management Operations** (side-by-side create/revoke panels)
4. **Parse Token Panel** (full-width at bottom)
5. **Grant Token Dialog** (modal overlay)

## 🔧 Core Functions Implementation

### 1. Grant Token Flow
```typescript
const grantToken = useCallback(async () => {
  // 1. Validate configuration (secret key, real keys)
  // 2. Build GrantRequest from grantForm state
  // 3. Convert UI boolean permissions to numeric bitmasks
  // 4. Generate HMAC-SHA256 signed curl command
  // 5. Display curl command in green panel
  // 6. Toast: "Run the curl command above to grant the token"
}, [pubnub, grantForm, toast])
```

### 2. Revoke Token Flow  
```typescript
const revokeToken = useCallback(async () => {
  // 1. Validate token input and configuration
  // 2. Generate signed curl command for revoke endpoint
  // 3. Display curl command in red panel
  // 4. Toast: "Run the curl command above to revoke the token"
}, [pubnub, revokeTokenInput, toast])
```

### 3. Parse Token Flow
```typescript
const parseToken = useCallback(async () => {
  // 1. Validate token input
  // 2. Use pubnub.parseToken() for decoding
  // 3. Display formatted JSON with copy button
  // 4. Handle numeric permission conversion for display
}, [pubnub, parseTokenInput, toast])
```

## 🔐 HMAC Signature Generation

### Critical Implementation Details (`api.ts`)
```typescript
// PubNub v3 signature format: WORKING IMPLEMENTATION
const stringToSign = [
  httpMethod.toUpperCase(),  // POST
  publishKey,                // NOT subscribeKey - critical difference
  uri,                       // /v3/pam/sub-c-xxx/grant
  sortedParams,              // timestamp=xxx&uuid=xxx
  body || ''                 // JSON payload
].join('\n')

// Web Crypto API for HMAC-SHA256
const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(stringToSign))
const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)))
const urlSafeSignature = base64Signature.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
return `v2.${urlSafeSignature}`
```

**CRITICAL**: Never change signature generation unless PubNub updates v3 spec.

## 📊 State Management Patterns

### Form State Structure
```typescript
// DEFAULT_GRANT_FORM in utils.ts
{
  ttl: 60,
  authorizedUserId: '',  // Fixed: was authorizedUuid
  description: '',       // Fixed: was missing
  channels: [],
  channelGroups: [], 
  uuids: [],
  channelPatterns: [],
  channelGroupPatterns: [],
  uuidPatterns: [],
  meta: {}
}
```

### Permission System
```typescript
// UI uses boolean permissions, API uses numeric bitmasks
const PERMISSION_BITS = {
  READ: 1, WRITE: 2, MANAGE: 4, DELETE: 8,
  CREATE: 16, GET: 32, UPDATE: 64, JOIN: 128
}

// Conversion happens in grantToken function:
channels.forEach(channel => {
  if (channel.name) {
    grantRequest.resources.channels[channel.name] = channel.permissions // boolean → numeric
  }
})
```

## 🎨 UI Design System

### Color Coding
- **Green Theme**: Grant token operations (`bg-green-50`, `border-green-200`, `text-green-600`)
- **Red Theme**: Revoke token operations (`bg-red-50`, `border-red-200`, `text-red-600`)  
- **Blue Theme**: Parse token operations (`FileText` icon, standard styling)
- **Orange/Yellow**: Configuration warnings

### Panel Structure
```typescript
// Token Management Operations (Grid Layout)
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
  <Card> {/* Create Token Panel */}
    <CardHeader> {/* Plus icon, title, description */}
    <CardContent> {/* Centered button only */}
  </Card>
  <Card> {/* Revoke Token Panel */}
    <CardHeader> {/* Lock icon, title, description */}
    <CardContent> {/* Textarea + buttons */}
  </Card>
</div>

// Parse Token Panel (Full Width)
<Card className="mb-6">
  <CardHeader> {/* FileText icon, title, description */}
  <CardContent> {/* Textarea + buttons + collapsible results */}
</Card>
```

## 🚫 Removed Functionality (Important Context)

### What Was Deliberately Removed
1. **Token Storage/Persistence** - No localStorage saving of tokens
2. **Token List Management** - No display of saved tokens
3. **Search Functionality** - No token filtering/searching
4. **Token Details Panel** - No sidebar for viewing token info
5. **Test Token Functionality** - No publish/subscribe testing
6. **Manual Token Addition** - No "Add Token" dialogs
7. **Token Status Checking** - No expiration monitoring
8. **Bulk Operations** - No multi-token management

### Why These Were Removed
- **Simplified UX**: Focus on core create/revoke/parse operations
- **Reduced Complexity**: Fewer state management requirements
- **Cleaner Interface**: No token management overhead
- **User Request**: Explicit removal of storage functionality

## 🔄 Critical Workflows

### Create Token Workflow
1. User clicks "Create Token" button
2. `GrantTokenDialog` modal opens with tabbed interface
3. User configures permissions via toggle switches
4. User clicks "Grant Token" 
5. `grantToken()` function generates curl command
6. Green panel displays curl command with copy button
7. User manually executes curl command externally
8. Token is created in PubNub PAM system

### Revoke Token Workflow  
1. User pastes token in revoke textarea
2. User clicks "Revoke Token" button
3. `revokeToken()` function generates curl command
4. Red panel displays curl command with copy button
5. User manually executes curl command externally
6. Token is permanently revoked

### Parse Token Workflow
1. User pastes token in parse textarea
2. User clicks "Parse Token" button  
3. `parseToken()` function uses PubNub SDK
4. Formatted JSON appears below with copy button
5. Scrollable results with max-height constraints

## 🛠️ Technical Dependencies

### External Dependencies
- **PubNub SDK**: Loaded via CDN, accessed as `window.PubNub`
- **Web Crypto API**: For HMAC-SHA256 signature generation
- **React 18**: Functional components with hooks
- **Tailwind CSS**: Utility-first styling
- **Radix UI**: Accessible component primitives

### Internal Dependencies
```typescript
// Required imports for main component
import { useToast } from '@/hooks/use-toast'
import { useConfig } from '@/contexts/config-context' 
import { storage } from '@/lib/storage'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button, Input, Label, Textarea } from '@/components/ui/*'
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog'
```

## ⚠️ Known Limitations & Constraints

### Browser-Based Limitations
- **CORS Restrictions**: Cannot make direct PubNub REST API calls
- **Curl Command Generation**: Manual execution required
- **No Server-Side Components**: Pure client-side implementation
- **Secret Key Handling**: Session storage only, cleared on refresh

### Security Considerations
- **Secret Key Exposure**: Only used for signature generation, not stored permanently
- **Demo Key Detection**: Warnings prevent PAM operations with demo keys
- **Configuration Validation**: Ensures real PubNub keys before operations

## 🔍 Error Handling Patterns

### Validation Layers
1. **UI Level**: Button disabled states based on form validation
2. **Function Level**: Input validation with toast notifications
3. **API Level**: HMAC signature generation error handling
4. **PubNub Level**: SDK error catching and user feedback

### Toast Message Patterns
```typescript
// Success patterns
toast({ title: 'Curl command generated', description: 'Run the curl command above to [action] the token' })
toast({ title: 'Token parsed successfully', description: 'Token details have been extracted' })

// Error patterns  
toast({ title: '[Action] failed', description: error.message, variant: 'destructive' })
toast({ title: 'Configuration Required', description: 'Please configure...', variant: 'destructive' })
```

## 🚀 Performance Optimizations

### State Management
- **useCallback**: All functions memoized with proper dependency arrays
- **useMemo**: Configuration validation cached 
- **Minimal Re-renders**: State updates only when necessary

### Component Loading
- **Lazy Modal**: Grant dialog only rendered when needed
- **Conditional Rendering**: Curl panels only show when commands exist
- **Efficient Updates**: Toast notifications for user feedback

## 🔮 Future Enhancement Opportunities

### Low-Impact Additions
1. **Token Templates**: Save/load common permission patterns
2. **Export Functionality**: Download curl commands as files
3. **Syntax Highlighting**: Better JSON display for parsed tokens
4. **Keyboard Shortcuts**: Quick access to common operations

### Medium-Impact Enhancements
1. **Batch Operations**: Multiple token operations at once
2. **Permission Presets**: Common permission combinations
3. **Advanced Validation**: Real-time token format checking
4. **History**: Recent curl commands cache

### High-Impact Features (Architectural Changes)
1. **Server-Side Proxy**: Direct API integration without CORS
2. **Token Management**: Re-add storage with better UX
3. **Advanced Testing**: Token validation against real channels
4. **Analytics**: Usage tracking and reporting

## 🧪 Testing Strategy

### Manual Testing Checklist
- [ ] Grant token with various permission combinations
- [ ] Revoke token with valid token string
- [ ] Parse token with valid/invalid tokens
- [ ] Copy curl commands to clipboard
- [ ] Clear form inputs and results
- [ ] Configuration warnings display correctly
- [ ] Demo key detection prevents operations
- [ ] Secret key validation works
- [ ] Responsive design on different screen sizes

### Build Verification
```bash
npm run build  # Should complete without errors
# File should be ~879KB minified
# No TypeScript errors
# No React warnings
```

## 📝 Code Quality Standards

### TypeScript Coverage
- **100% type safety**: All functions and state properly typed
- **Interface definitions**: Complete type definitions in `types/access-manager.ts`
- **No `any` types**: Except for PubNub SDK instance (external dependency)

### React Best Practices
- **Functional components only**: No class components
- **Hook dependency arrays**: All useCallback/useEffect properly configured
- **Controlled components**: All form inputs properly controlled
- **Error boundaries**: Comprehensive error handling

### Accessibility
- **Semantic HTML**: Proper heading hierarchy and ARIA labels
- **Keyboard Navigation**: Full tab order and keyboard shortcuts
- **Screen Reader Support**: Descriptive labels and announcements
- **Color Contrast**: WCAG AA compliant color schemes

## 🔄 Maintenance Guidelines

### Regular Updates
- **Dependency Updates**: Monitor PubNub SDK for breaking changes
- **Security Patches**: Keep React and build tools updated
- **Browser Compatibility**: Test with latest browser versions

### Code Modifications
- **Never modify**: HMAC signature generation without PubNub coordination
- **Always test**: Curl command generation after changes
- **Preserve**: Clean UI design and minimal complexity
- **Document**: Any new functionality or architectural changes

---

**This document should be updated whenever significant changes are made to the Access Manager implementation. It serves as the single source of truth for understanding the current architecture and future development decisions.**