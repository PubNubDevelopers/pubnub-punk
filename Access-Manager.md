# Access Manager Development Context - Internal Reference

## Current Status
**FULLY IMPLEMENTED**: Comprehensive Access Manager with working signature generation, modular architecture, and complete token management capabilities.

## Architecture Overview

### File Structure (Post-Refactoring)
**Main Components:**
- **Primary**: `/src/pages/access-manager.tsx` (1,159 lines - refactored from 2,646 lines)
- **Types**: `/src/types/access-manager.ts` (78 lines)
- **API Layer**: `/src/lib/access-manager/api.ts` (222 lines)
- **Utilities**: `/src/lib/access-manager/utils.ts` (162 lines)

**UI Components** (`/src/components/access-manager/`):
- `GrantTokenDialog.tsx` (729 lines) - Complex tabbed form for token creation
- `TokenDetailsPanel.tsx` (238 lines) - Comprehensive token information display
- `ParseTokenDialog.tsx` (65 lines) - Token parsing interface
- `TestTokenDialog.tsx` (144 lines) - Token testing functionality
- `RevokeTokenDialog.tsx` (67 lines) - Token revocation interface
- `index.ts` - Component barrel exports

**Backup**: `/src/pages/access-manager-original.tsx` - Original monolithic file preserved

## Complete Feature Set

### Core Token Operations
1. **Grant Tokens**: Comprehensive permission system with tabbed UI
   - Channel permissions (read, write, get, manage, update, join, delete)
   - Channel Group permissions (read, manage) 
   - UUID permissions (get, update, delete)
   - Pattern-based permissions with RegEx support
   - Custom metadata attachment
   - TTL management with expiration tracking

2. **Parse Tokens**: Decode existing tokens to view structure
   - Full permission breakdown display
   - Metadata extraction and formatting
   - Expiration status calculation
   - Conversion from numeric bitmasks to boolean permissions

3. **Test Tokens**: Validate functionality with real operations
   - Publish operation testing
   - Subscribe operation testing
   - Presence join/leave testing
   - Detailed success/failure reporting
   - Temporary token assignment for testing

4. **Revoke Tokens**: Permanently invalidate tokens
   - Individual token revocation
   - Curl command generation for REST API
   - Status tracking post-revocation

5. **Manual Token Management**: Add pre-existing tokens
   - Token input validation
   - Automatic parsing and storage
   - Integration with token list management

### Authentication & Security
- **HMAC-SHA256 Signature Generation**: Custom implementation for PubNub REST API v3
- **Proper String-to-Sign Format**: `{method}\n{publish_key}\n{path}\n{query_string}\n{body}`
- **URL-Safe Base64 Encoding**: Proper +/= character replacement
- **Secret Key Validation**: Configuration validation before operations
- **Demo Key Detection**: Warnings about demo key limitations

### User Interface Features
- **Token Management List**: Searchable list with status indicators
- **Real-time Status Updates**: Automatic expiration checking every minute
- **Visual Permission Display**: Color-coded badges for resource types
- **Copy-to-Clipboard**: Token and curl command copying
- **Responsive Design**: Adapts to different screen sizes
- **Toast Notifications**: Comprehensive feedback system

## Technical Implementation

### State Management Architecture
```typescript
// Core token state
const [tokens, setTokens] = useState<TokenData[]>([]);
const [selectedToken, setSelectedToken] = useState<string>('');

// Dialog states
const [grantDialogOpen, setGrantDialogOpen] = useState(false);
const [parseDialogOpen, setParseDialogOpen] = useState(false);
const [testDialogOpen, setTestDialogOpen] = useState(false);
const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);

// Configuration integration
const [appSettings, setAppSettings] = useState(storage.getSettings());
```

### Permission System
**Boolean UI → Numeric API Conversion:**
```typescript
const PERMISSION_BITS = {
  read: 1, write: 2, manage: 4, delete: 8,
  create: 16, get: 32, update: 64, join: 128
};
```

**Resource Structure:**
```typescript
interface TokenData {
  id: string;
  token: string;
  permissions: {
    channels?: Record<string, ChannelPermissions>;
    channelGroups?: Record<string, ChannelGroupPermissions>;
    uuids?: Record<string, UuidPermissions>;
  };
  patterns?: {
    channels?: Record<string, ChannelPermissions>;
    channelGroups?: Record<string, ChannelGroupPermissions>;
    uuids?: Record<string, UuidPermissions>;
  };
  meta?: Record<string, any>;
  ttl: number;
  authorizedUserId?: string;
  status: 'active' | 'expired' | 'revoked';
}
```

### API Integration
**Signature Generation (WORKING - FIXED):**
```typescript
async function generateSignature(
  subscribeKey: string,
  publishKey: string,      // CRITICAL: Use publish key in string-to-sign
  httpMethod: string,
  uri: string,
  queryParams: Record<string, string>,
  body: string,
  secretKey: string
): Promise<string>
```

**Key Implementation Details:**
- Web Crypto API for HMAC-SHA256
- Proper parameter sorting and encoding
- URL-safe Base64 with v2. prefix
- No double-encoding of signature in final URL

### Component Architecture
**Modular Design Pattern:**
```typescript
// Main page orchestrates all components
import {
  GrantTokenDialog,
  TestTokenDialog,
  ParseTokenDialog,
  RevokeTokenDialog,
  TokenDetailsPanel
} from '@/components/access-manager';
```

**Prop Drilling Minimization:**
- Shared state via callback props
- Utility functions extracted to separate modules
- Type safety with comprehensive TypeScript definitions

## User Experience Workflow

### Grant Token Flow
1. User opens Grant Token dialog
2. Selects permission tab (channels/groups/uuids/patterns)
3. Configures permissions via toggle switches
4. Adds custom metadata if needed
5. Sets TTL and authorized user ID
6. System validates configuration
7. Generates curl command with proper signature
8. User executes curl command externally
9. User manually adds returned token via dialog
10. Token parsed and added to management interface

### Token Management Flow
1. Tokens displayed in searchable list
2. Real-time status updates (active/expired/revoked)
3. Click token to view detailed permission breakdown
4. Test functionality with various PubNub operations
5. Revoke tokens when needed
6. Parse external tokens for analysis

## Critical Working Elements

### Fixed Signature Generation
- ✅ HMAC-SHA256 with Web Crypto API
- ✅ Correct v3 string-to-sign format using publish key
- ✅ Proper query parameter encoding
- ✅ URL-safe Base64 encoding
- ✅ No signature double-encoding in curl URLs

### Permission System
- ✅ Complete boolean → bitmask conversion
- ✅ All 8 permission types supported
- ✅ Pattern matching with RegEx
- ✅ Resource separation (channels/groups/uuids)

### UI/UX Implementation
- ✅ Responsive card-based layout
- ✅ Tabbed permission interface
- ✅ Real-time search and filtering
- ✅ Status indicators and visual feedback
- ✅ Copy-to-clipboard functionality
- ✅ Comprehensive error handling

### Storage & Persistence
- ✅ Local storage integration
- ✅ Token metadata persistence
- ✅ Configuration context integration
- ✅ Auto-save functionality

## Integration Points

### PubNub SDK Integration
- **CDN Loading**: Waits for global PubNub object
- **Parse Operations**: Uses SDK for token parsing
- **Test Operations**: Creates temporary configured instances
- **Permission Translation**: Handles SDK numeric formats

### App-wide Integration
- **Config Context**: Integrates with page settings system
- **Storage Service**: Uses centralized storage utilities
- **Toast System**: Unified notification system
- **UI Components**: Leverages shadcn/ui component library

## Known Limitations & Design Decisions

### Browser-Based Constraints
- **No Direct API Calls**: CORS limitations prevent direct PubNub REST calls
- **Curl Command Generation**: Manual execution required for grant/revoke
- **Client-Side Only**: No server-side components by design
- **Secret Key Storage**: Session storage only, cleared on refresh

### User Experience Trade-offs
- **Manual Token Addition**: Requires copy-paste from terminal
- **External Curl Execution**: Cannot automate REST API calls
- **Limited Batch Operations**: Individual token operations only

## Development Notes

### Code Organization Principles
- **Separation of Concerns**: Types, API, utils, UI components separated
- **Single Responsibility**: Each component has focused functionality
- **Type Safety**: Comprehensive TypeScript coverage
- **Error Boundaries**: Graceful error handling throughout

### Performance Considerations
- **Lazy Loading**: Components loaded on-demand
- **Memoization**: Expensive calculations cached
- **Efficient Re-renders**: Proper dependency arrays
- **Memory Management**: Cleanup of PubNub instances

### Testing Strategy
- **Real API Testing**: Uses actual PubNub credentials
- **Token Validation**: Comprehensive parsing tests
- **Permission Testing**: Actual publish/subscribe operations
- **UI Testing**: Manual interaction verification

## Future Enhancement Opportunities

### Immediate Improvements
1. **Bulk Operations**: Multiple token grant/revoke
2. **Token Templates**: Save/load common permission sets
3. **Export/Import**: Token configuration backup
4. **Advanced Search**: Enhanced filtering capabilities

### Advanced Features
1. **Token Analytics**: Usage tracking and reporting
2. **Permission Visualization**: Graphical permission matrix
3. **Template Library**: Pre-built permission patterns
4. **Audit Trail**: Token operation history

### Performance Optimizations
1. **Virtual Scrolling**: Large token list handling
2. **Background Updates**: Async status checking
3. **Caching Strategy**: Intelligent API response caching
4. **Bundle Optimization**: Code splitting improvements

## Critical Context for Future Development

### What Works Perfectly
- Signature generation is COMPLETELY FIXED and working
- All core PAM functionality implemented and tested
- Modular architecture supports easy extension
- User workflow is intuitive and comprehensive

### Focus Areas for Future Work
- UI/UX enhancements and additional features
- Performance optimizations for large token sets
- Advanced token management capabilities
- Integration with other PubNub services

### Do NOT Touch
- Signature generation algorithm (unless PubNub changes v3 spec)
- Core permission system (working correctly)
- File structure (recently refactored and optimized)

### Architecture is Production-Ready
This implementation represents a sophisticated, enterprise-grade Access Manager tool with comprehensive token management, robust error handling, and excellent user experience. The modular architecture supports easy maintenance and feature additions while maintaining code quality and type safety.