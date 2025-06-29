# Access Manager Development Context - Internal Reference

## Current Issue Status
**RESOLVED**: Signature generation for PubNub REST API grantToken now working correctly. Fixed multiple signature generation bugs.

## Core Problem Analysis
**CONFIRMED ROOT CAUSE**: Browser-based PubNub SDK (CDN) intentionally disables `grantToken` and `revokeToken` operations. Functions exist but are stubs that throw "PAM module disabled" errors for security reasons.

**SOLUTION IMPLEMENTED**: Direct REST API calls via curl command generation with properly formatted HMAC-SHA256 signatures following PubNub v3 specification.

## Implementation Architecture

### File Structure
- **Primary File**: `/src/pages/access-manager.tsx`
- **Dependencies**: Native Web Crypto API (crypto-js removed)
- **PubNub SDK**: CDN version (`pubnub.9.6.1.min.js`) for all non-PAM operations

### Key Functions Implemented
1. **generateSignature()** - HMAC-SHA256 signature generation using Web Crypto API (WORKING)
2. **convertPermissionsToBitmask()** - Converts boolean permissions to numeric bitmask (READ=1, WRITE=2, MANAGE=4, etc.)
3. **generateGrantTokenCurl()** - Async function generating properly formatted curl commands (WORKING)
4. **generateRevokeTokenCurl()** - Async function for revoke token curl commands (WORKING)
5. **addManualToken()** - UI function to manually add tokens received from curl execution

### Current API Implementation Details

#### REST Endpoints Used
- **Grant**: `POST /v3/pam/{subscribeKey}/grant`
- **Revoke**: `POST /v3/pam/{subscribeKey}/revoke`

#### Authentication Requirements
- **timestamp**: Unix epoch timestamp (must be within ±60 seconds of NTP time)
- **uuid**: Client identifier ('access-manager-admin')
- **signature**: HMAC-SHA256 with `v2.` prefix using URL-safe Base64

#### Request Structure
```javascript
// Grant Token Body
{
  "ttl": 60,
  "permissions": {
    "resources": {
      "channels": { "channel-name": 3 },  // bitmask values
      "channelGroups": { "group-name": 5 },
      "uuids": { "user-id": 32 }
    },
    "patterns": { /* same structure */ },
    "meta": { /* custom metadata */ },
    "uuid": "authorized-user-id"  // optional
  }
}
```

#### Permission Bitmasks
- READ: 1, WRITE: 2, MANAGE: 4, DELETE: 8, CREATE: 16, GET: 32, UPDATE: 64, JOIN: 128

## Signature Generation Implementation (WORKING)

### String-to-Sign Format (CORRECT v3 FORMAT)
```
{method}\n{publish_key}\n{path}\n{query_string}\n{body}
```

**CRITICAL**: Use PUBLISH KEY, not subscribe key or domain name in string-to-sign.

### Function Signature
```javascript
async function generateSignature(
  subscribeKey: string,
  publishKey: string,      // REQUIRED for string-to-sign
  httpMethod: string,
  uri: string,
  queryParams: Record<string, string>,
  body: string,
  secretKey: string
): Promise<string>
```

### Query Parameter Handling
- Must be sorted lexicographically by key
- Must be percent-encoded in string-to-sign: `encodeURIComponent(value)`
- No duplicate keys allowed
- Format: `key1=encodedValue1&key2=encodedValue2`

### Base64 Encoding Requirements
- Standard Base64 encode the HMAC-SHA256 result
- Convert to URL-safe format:
  - Replace `+` with `-`
  - Replace `/` with `_`
  - Remove padding `=`
- Add `v2.` prefix

### Example Working Signature Process
1. Build string-to-sign: `POST\n{pubkey}\n/v3/pam/{subkey}/grant\ntimestamp=123&uuid=admin\n{jsonbody}`
2. HMAC-SHA256 with secret key
3. Base64 encode result
4. URL-safe conversion: replace +/= chars
5. Prepend `v2.`

## Curl Command Generation (WORKING)

### Query String Construction
```javascript
const queryString = Object.keys(queryParams)
  .sort()
  .map(key => {
    if (key === 'signature') {
      return `${key}=${queryParams[key]}`;  // No encoding for signature
    } else {
      return `${key}=${encodeURIComponent(queryParams[key])}`;
    }
  })
  .join('&');
```

**CRITICAL**: Do NOT URL-encode the signature in the final curl URL, but DO encode other parameters.

### Body Escaping for Shell
```javascript
const escapedBody = body.replace(/'/g, "'\"'\"'");  // Escape single quotes for bash
```

## UI Implementation

### State Management
```javascript
const [grantTokenCurl, setGrantTokenCurl] = useState('');
const [revokeTokenCurl, setRevokeTokenCurl] = useState('');
const [manualTokenInput, setManualTokenInput] = useState('');
const [manualTokenDialogOpen, setManualTokenDialogOpen] = useState(false);
```

### User Experience Flow
1. User configures grant token permissions via UI
2. Click grant button generates curl command (no direct API call)
3. Curl command displayed in orange warning card with copy button
4. User executes curl in terminal manually
5. User copies returned token from terminal
6. User clicks "Add Token" button to manually paste token into app
7. Token parsed and added to managed tokens list

### UI Components 
- **Curl Display Card**: Orange warning card showing curl commands with copy functionality
- **Manual Token Dialog**: Modal with textarea for token input and validation
- **Copy Buttons**: Automatic clipboard copying of curl commands
- **Clear Buttons**: Remove curl commands from display

## Critical Implementation Details

### Permission Conversion Logic
Boolean UI permissions converted to bitmask before API call:
```javascript
if (permObj.read) bitmask |= 1;
if (permObj.write) bitmask |= 2;
if (permObj.manage) bitmask |= 4;
// etc for all 8 permission types
```

### Resource Name Mapping (UI → API)
- UI uses `groups` → API expects `channelGroups`
- UI uses `uuids` → API expects `uuids` 
- UI uses `channels` → API expects `channels`

### Function Call Patterns
```javascript
// Grant token
const curlCommand = await generateGrantTokenCurl(
  currentSettings.credentials.subscribeKey,
  currentSettings.credentials.publishKey,  // REQUIRED
  currentSecretKey,
  grantRequest
);

// Revoke token  
const curlCommand = await generateRevokeTokenCurl(
  currentSettings.credentials.subscribeKey,
  currentSettings.credentials.publishKey,  // REQUIRED
  currentSecretKey,
  tokenToRevoke
);
```

## Previously Fixed Issues

### Issue 1: "Invalid timestamp" Error
**Problem**: Timestamp validation failing with "Must have no more than ± 60 second offset from NTP"
**Root Cause**: Incorrect signature format was causing primary validation to fail, timestamp error was secondary
**Fix**: Corrected string-to-sign format to use publish key instead of subscribe key

### Issue 2: "Invalid signature" Error  
**Problem**: Client and server producing different signatures
**Root Causes Fixed**:
1. **Wrong key in string-to-sign**: Was using subscribe key or domain, fixed to use publish key
2. **Missing URL encoding**: Added proper `encodeURIComponent()` for query params in string-to-sign
3. **Incorrect Base64 format**: Implemented URL-safe Base64 (replace +/= chars)
4. **Double URL encoding**: Signature was being encoded twice in final URL

### Issue 3: Function Signature Mismatches
**Problem**: generateSignature() calls missing publishKey parameter
**Fix**: Updated all function signatures and calls to include publishKey parameter

## Known Working Elements
- ✅ Signature generation (Web Crypto API with correct v3 format)
- ✅ Permission form UI and validation
- ✅ Boolean to bitmask conversion
- ✅ Curl command generation and display
- ✅ Manual token addition workflow
- ✅ Token parsing and storage
- ✅ URL-safe Base64 encoding
- ✅ Query parameter sorting and encoding
- ✅ Shell escaping for curl commands
- ✅ All other PubNub SDK operations (parse, test)

## Testing Verification
- Curl commands now execute successfully against PubNub REST API
- No more "Invalid signature" or "Invalid timestamp" errors
- Token generation and revocation working as expected
- Manual token workflow fully functional

## Development Notes for Future Work

### Architecture Constraints
- **Client-side only**: User requirement, no server-side components
- **CORS limitations**: Cannot make direct API calls from browser to PubNub
- **Manual workflow acceptable**: Curl command generation + manual execution is preferred approach
- **Secret key handling**: Stored in sessionStorage, cleared on page refresh

### Code Organization
- **Lines 52-103**: `generateSignature()` - Core signature generation logic
- **Lines 126-214**: `generateGrantTokenCurl()` - Grant token curl generation  
- **Lines 217-262**: `generateRevokeTokenCurl()` - Revoke token curl generation
- **Lines 628-640**: Grant token UI handler
- **Lines 724-730**: Revoke token UI handler
- **Lines 1000+**: Curl display UI components

### Debug Logging
All signature generation includes console logging for troubleshooting:
```javascript
console.log('String to sign:', stringToSign);
console.log('Generated curl command:', curlCommand);
```

### Future Enhancement Opportunities
1. **Batch operations**: Support multiple token grants in single operation
2. **Token templates**: Save/load common permission sets
3. **Expiration tracking**: UI warnings for tokens approaching TTL
4. **Permission calculator**: Helper to build complex permission bitmasks
5. **Export/import**: Save token configurations to file

## Important Context for Future Sessions
- Signature generation is now WORKING correctly
- Focus should be on UI/UX improvements and additional features
- No need to revisit signature algorithm unless PubNub changes v3 spec
- User prefers manual curl workflow over automated API calls
- All core PAM functionality is implemented and functional