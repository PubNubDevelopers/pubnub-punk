# PubNub Developer Tools - Preferences Architecture

## Overview

This document describes the versioned configuration storage system implemented for the PubNub Developer Tools app. The system uses a dual storage approach combining PubNub Persistence (History) for version control and PubNub App Context (Channel Metadata) for fast latest version retrieval.

**IMPORTANT:** This system uses the PubNub JavaScript SDK via CDN (loaded in `index.html`) and makes real API calls to PubNub servers. It is NOT using any MCP server - all operations are direct browser-to-PubNub calls.

## Architecture Components

### 1. Configuration Service (`/src/lib/config-service.ts`)

**Main Class:** `ConfigurationService` (singleton pattern)

**Key Methods:**
- `saveVersionedConfig(configType, configData, description?, tags?)` - Save new version
- `loadLatestConfig(configType)` - Load most recent configuration  
- `getConfigHistory(configType, limit?, startTimetoken?)` - Get version history
- `restoreConfigVersion(configType, timetoken)` - Restore specific version
- `deleteConfigVersion(configType, timetoken)` - Delete version (requires secret key)
- `deleteAllConfigurationData()` - **Nuclear option**: Delete ALL config data from everywhere
- `getConfigStats(configType)` - Get statistics about versions

**Singleton Usage:**
```typescript
import { configService } from '@/lib/config-service';
```

### 2. Storage Strategy

**Dual Storage Approach:**
1. **PubNub Persistence (History):** Stores complete version history for each page
2. **PubNub App Context:** Stores latest configuration as stringified JSON for fast retrieval

**Channel Naming Convention:**
- History Channel: `CONFIG_PN_DEVTOOLS_{PAGE}` (e.g., `CONFIG_PN_DEVTOOLS_SETTINGS`)
- App Context Channel: `CONFIG_PN_DEVTOOLS` (shared across all pages)
- Custom Field Key: `{page}_latest` (e.g., `settings_latest`)

**App Context Storage Format:**
Each configuration type is stored as a stringified JSON in a single custom field:
```javascript
{
  "settings_latest": '{"timetoken":"123","version":1,"updated":"2025-06-27...","type":"SETTINGS","data":{...actualConfig...}}'
}
```

**Page-Specific Channel Examples:**
- Settings: `CONFIG_PN_DEVTOOLS_SETTINGS`
- Pub/Sub: `CONFIG_PN_DEVTOOLS_PUBSUB`
- Presence: `CONFIG_PN_DEVTOOLS_PRESENCE`

### 3. Data Structures

**VersionedConfig Interface:**
```typescript
interface VersionedConfig {
  timestamp: string;
  version: number;
  configType: string; // 'SETTINGS', 'PUBSUB', etc.
  userId: string;
  data: any; // Actual configuration data
  metadata: {
    description?: string;
    tags?: string[];
  };
}
```

**ConfigVersion Interface:**
```typescript
interface ConfigVersion {
  timetoken: string;
  timestamp: string;
  version: number;
  description?: string;
  data: any;
  publisher: string;
}
```

### 4. Type Extensions

**Updated StoragePreferences:**
```typescript
interface StoragePreferences {
  storeMessageHistory: boolean;
  autoSaveToPubNub: boolean;        // Default: true
  saveVersionHistory: boolean;      // Default: true
  maxVersionsToKeep: number;        // Default: 50
}
```

**Note:** The `autoSave` field has been removed as all configuration changes are now automatically saved to local storage.

## Implementation Guide for New Pages

### Step 1: Add Form Schema Fields

Add versioning fields to your page's Zod schema:

```typescript
const yourPageSchema = z.object({
  // ... your existing fields
  storeMessageHistory: z.boolean(),
  autoSaveToPubNub: z.boolean(),
  saveVersionHistory: z.boolean(),
  maxVersionsToKeep: z.number().min(1).max(1000),
});
```

### Step 2: Import Required Components

```typescript
import { configService } from '@/lib/config-service';
import { VersionHistoryPanel } from '@/components/config-versions/VersionHistoryPanel';
```

### Step 3: Add Submission Logic

```typescript
const onSubmit = async (data: YourFormData) => {
  // Save to local storage first
  const newConfig = { /* your config object */ };
  storage.saveYourConfig(newConfig);
  
  // Save to PubNub with versioning if enabled
  if (data.autoSaveToPubNub && data.saveVersionHistory) {
    const description = `Updated by ${userId} at ${new Date().toLocaleString()}`;
    const result = await configService.saveVersionedConfig(
      'YOUR_PAGE_TYPE', // e.g., 'PUBSUB', 'PRESENCE'
      newConfig,
      description
    );
    
    if (result.success) {
      toast({
        title: "Saved with versioning",
        description: `Configuration saved as version ${result.version?.version}`,
      });
    }
  }
};
```

### Step 4: Add Restore Handler

```typescript
const handleConfigRestore = (restoredConfig: YourConfigType) => {
  // Update form with restored data
  form.reset({
    // ... map restoredConfig to form fields
  });
  
  // Update local state
  setYourConfig(restoredConfig);
  storage.saveYourConfig(restoredConfig);
};
```

### Step 5: Add Automatic Configuration Loading (Optional)

For pages that use PubNub keys, you can add automatic loading of the latest configuration when keys are populated:

```typescript
const [hasAttemptedAutoLoad, setHasAttemptedAutoLoad] = useState(false);

// Function to load latest configuration from PubNub
const loadLatestConfiguration = async () => {
  try {
    const result = await configService.loadLatestConfig('YOUR_PAGE_TYPE');
    if (result.success && result.config) {
      const latestConfig = result.config;
      
      // Update form with latest configuration
      form.reset({
        // ... map latestConfig to form fields
      });
      
      // Update local state
      setYourConfig(latestConfig);
      storage.saveYourConfig(latestConfig);
      
      toast({
        title: "Configuration Loaded",
        description: "Latest configuration loaded from PubNub App Context.",
      });
    }
  } catch (error) {
    console.log('No latest configuration found or failed to load:', error);
  }
};

// Watch for changes in PubNub keys (if applicable)
const publishKey = form.watch('publishKey');
const subscribeKey = form.watch('subscribeKey');

useEffect(() => {
  const bothKeysPresent = publishKey && subscribeKey && publishKey.trim() && subscribeKey.trim();
  
  // Only attempt auto-load once when both keys are first populated
  if (bothKeysPresent && !hasAttemptedAutoLoad) {
    setHasAttemptedAutoLoad(true);
    
    // Small delay to ensure form is ready
    setTimeout(() => {
      loadLatestConfiguration();
    }, 500);
  }
}, [publishKey, subscribeKey, hasAttemptedAutoLoad]);
```

### Step 6: Add Version History Panel to JSX

```tsx
{/* Add after your main configuration card */}
<VersionHistoryPanel
  configType="YOUR_PAGE_TYPE"
  currentConfig={yourCurrentConfig}
  onConfigRestore={handleConfigRestore}
/>
```

### Step 7: Add Storage Preferences UI

Add these form fields to your preferences section (in recommended order):

```tsx
<FormField
  control={form.control}
  name="autoSaveToPubNub"
  render={({ field }) => (
    <FormItem className="flex items-center justify-between">
      <div className="space-y-0.5">
        <FormLabel>Auto-save Configurations in PubNub</FormLabel>
        <FormDescription className="text-xs text-gray-500">
          You must have App Context enabled for your sub-key.
        </FormDescription>
      </div>
      <FormControl>
        <Switch checked={field.value} onCheckedChange={field.onChange} />
      </FormControl>
    </FormItem>
  )}
/>

<FormField
  control={form.control}
  name="saveVersionHistory"
  render={({ field }) => (
    <FormItem className="flex items-center justify-between">
      <div className="space-y-0.5">
        <FormLabel>Enable Version History</FormLabel>
        <FormDescription className="text-xs text-gray-500">
          You must have PubNub Persistence enabled for your sub-key, note that your history will be lost when your Persistence data is set to expire.
        </FormDescription>
      </div>
      <FormControl>
        <Switch checked={field.value} onCheckedChange={field.onChange} />
      </FormControl>
    </FormItem>
  )}
/>

<FormField
  control={form.control}
  name="maxVersionsToKeep"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Maximum Versions to Keep</FormLabel>
      <FormControl>
        <Input
          type="number"
          min="1"
          max="1000"
          {...field}
          onChange={(e) => field.onChange(parseInt(e.target.value) || 50)}
        />
      </FormControl>
      <FormDescription className="text-xs text-gray-500">
        Number of configuration versions to retain (1-1000)
      </FormDescription>
    </FormItem>
  )}
/>

<FormField
  control={form.control}
  name="storeMessageHistory"
  render={({ field }) => (
    <FormItem className="flex items-center justify-between">
      <div className="space-y-0.5">
        <FormLabel>Store message history</FormLabel>
        <FormDescription className="text-xs text-gray-500">
          Keep a local copy of message history for debugging
        </FormDescription>
      </div>
      <FormControl>
        <Switch checked={field.value} onCheckedChange={field.onChange} />
      </FormControl>
    </FormItem>
  )}
/>
```

## UI Components Available

### VersionHistoryPanel
**Location:** `/src/components/config-versions/VersionHistoryPanel.tsx`
**Props:**
- `configType: string` - Unique identifier for your page (e.g., 'PUBSUB')
- `currentConfig: any` - Current configuration object
- `onConfigRestore: (config: any) => void` - Callback when version is restored
- `className?: string` - Optional CSS classes

### VersionListItem
**Location:** `/src/components/config-versions/VersionListItem.tsx`
**Used internally by VersionHistoryPanel**

### VersionRestoreDialog
**Location:** `/src/components/config-versions/VersionRestoreDialog.tsx`
**Used internally by VersionHistoryPanel**

### DeleteAllConfigDialog
**Location:** `/src/components/config-versions/DeleteAllConfigDialog.tsx`
**Props:**
- `isOpen: boolean` - Controls dialog visibility
- `onConfirm: () => Promise<void>` - Called when user confirms deletion
- `onCancel: () => void` - Called when user cancels
- `isDeleting: boolean` - Shows loading state during deletion

**Features:**
- Multi-step confirmation (checkbox + typing "DELETE ALL")
- Comprehensive warning messages
- Requires acknowledgment of permanent action
- Loading states and proper UX flow

## Configuration Types by Page

| Page | Config Type | Channel Name | Purpose |
|------|-------------|--------------|---------|
| Settings | `SETTINGS` | `CONFIG_PN_DEVTOOLS_SETTINGS` | App-wide settings |
| Pub/Sub | `PUBSUB` | `CONFIG_PN_DEVTOOLS_PUBSUB` | Publish/Subscribe settings |
| Presence | `PRESENCE` | `CONFIG_PN_DEVTOOLS_PRESENCE` | Presence settings |
| Functions | `FUNCTIONS` | `CONFIG_PN_DEVTOOLS_FUNCTIONS` | Functions settings |

## Default Settings & Behavior

**Default Storage Preferences:**
- `autoSaveToPubNub`: **true** (enabled by default)
- `saveVersionHistory`: **true** (enabled by default)
- `maxVersionsToKeep`: **50**
- `storeMessageHistory`: **false** (disabled by default)

**Automatic Configuration Loading:**
- Triggers when both publish and subscribe keys are populated
- Only attempts once per session to avoid repeated API calls
- Loads latest configuration from PubNub App Context
- Updates form and local storage with retrieved configuration
- Shows success toast notification
- Fails silently if no configuration found

## Storage Fallback Strategy

1. **Primary:** PubNub App Context (fastest - direct config retrieval)
2. **Secondary:** PubNub Persistence/History (using timetoken from App Context)
3. **Fallback:** Local Storage (always available)
4. **Graceful Degradation:** If PubNub fails, operations continue with local storage
5. **Backward Compatibility:** Automatically removes deprecated `autoSave` field from stored settings

## Technical Implementation Details

### PubNub SDK Integration
- **CDN Loading:** PubNub SDK loaded via `<script>` tag in `index.html`
- **Global Access:** Uses `window.PubNub` for all operations
- **Browser-Only:** No server-side dependencies, runs entirely in browser

### App Context Custom Fields
- **Scalar Values Only:** PubNub App Context requires scalar values (strings, numbers, booleans)
- **JSON Stringification:** Complex objects are stored as stringified JSON
- **Single Field Per Config:** Each page stores one field like `settings_latest`
- **Complete Data:** Each field contains both metadata AND actual configuration

### Error Handling
- **404 Handling:** Gracefully handles when App Context channel doesn't exist yet
- **JSON Parse Errors:** Falls back to History if App Context data is corrupted
- **Network Failures:** All operations fall back to local storage
- **Key Validation:** Checks for required PubNub credentials before API calls

## Security Considerations

- **No Sensitive Data:** Actual PubNub keys are never stored in published configurations
- **Key Presence Indicators:** Only boolean flags indicating if keys exist
- **User Control:** All PubNub operations are opt-in via user settings
- **Secret Key Required:** Deletion operations require secret key configuration

## Future Extension Points

1. **Multi-User Collaboration:** Framework ready for team features
2. **Configuration Templates:** Easy to add predefined configuration sets
3. **Import/Export:** Built-in export functionality, import can be added
4. **Branching/Merging:** Version system supports advanced workflows
5. **Real-time Sync:** Can be extended for live configuration sharing

## Troubleshooting

**Common Issues:**
1. **No versions showing:** Check if `autoSaveToPubNub` and `saveVersionHistory` are enabled
2. **Restore not working:** Verify PubNub credentials and permissions
3. **Missing components:** Ensure all imports are correct and UI components exist

**Debug Steps:**
1. Check browser console for config service logs
2. Verify localStorage contains fallback data
3. Confirm PubNub credentials in settings
4. Check network tab for PubNub API calls to `ps9.pndsn.com`
5. Verify App Context is enabled in PubNub Admin Portal
6. Check that custom fields in App Context contain valid stringified JSON

**Common Error Messages:**
- `"Only scalar values are permitted in custom properties"` - Fixed: Now using stringified JSON
- `"Requested object was not found" (404)` - Expected first time, creates new channel
- `"PubNub operation failed, using local storage fallback"` - Network/credential issues
- `"Secret key required for deletion operations"` - Need secret key for delete functions

## Example Complete Implementation

See `/src/pages/settings.tsx` for the reference implementation that includes:
- Complete form integration with Zod validation
- Version history panel with full UI
- Restore functionality with confirmation dialogs
- Comprehensive error handling and fallbacks
- Toast notifications for user feedback
- Local storage fallback for offline use
- Automatic configuration loading when PubNub keys are populated
- Real PubNub SDK integration (not simulated)

## Quick Start Checklist for New Pages

1. ✅ **Add PubNub SDK** - Already loaded via CDN in `index.html`
2. ✅ **Import ConfigService** - `import { configService } from '@/lib/config-service';`
3. ✅ **Define Config Type** - Choose unique identifier (e.g., 'PUBSUB', 'PRESENCE')
4. ✅ **Add Storage Preferences** - Include the 4 storage fields in your schema
5. ✅ **Implement Save Logic** - Call `configService.saveVersionedConfig()`
6. ✅ **Add Restore Handler** - Handle `onConfigRestore` from VersionHistoryPanel
7. ✅ **Include UI Components** - Add VersionHistoryPanel and storage preference fields
8. ✅ **Add Danger Zone (Optional)** - Include DeleteAllConfigDialog for nuclear reset
9. ✅ **Test with Real Keys** - Verify with actual PubNub credentials

## Adding Delete All Functionality (Optional)

For pages where you want to include the nuclear "Delete All" option:

### Required Imports:
```typescript
import { DeleteAllConfigDialog } from '@/components/config-versions/DeleteAllConfigDialog';
import { AlertTriangle, Trash2 } from 'lucide-react';
```

### State Management:
```typescript
const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
const [isDeleting, setIsDeleting] = useState(false);
```

### Delete Handler:
```typescript
const handleDeleteAllConfig = async () => {
  setIsDeleting(true);
  
  try {
    const result = await configService.deleteAllConfigurationData();
    
    if (result.success) {
      toast({
        title: "All Configuration Data Deleted",
        description: "Application has been reset to vanilla state. Please refresh the page.",
      });
      
      setShowDeleteAllDialog(false);
      
      // Reload the page after a short delay to reset everything
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } else {
      toast({
        title: "Deletion Failed",
        description: result.error || "Some operations failed. Check console for details.",
        variant: "destructive",
      });
    }
  } catch (error) {
    toast({
      title: "Deletion Error",
      description: "An unexpected error occurred. Check console for details.",
      variant: "destructive",
    });
  } finally {
    setIsDeleting(false);
  }
};
```

### Danger Zone UI:
```tsx
{/* Danger Zone */}
<Card className="mt-8 border-red-200 bg-red-50">
  <CardHeader>
    <div className="flex items-center space-x-3">
      <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
        <AlertTriangle className="text-white h-5 w-5" />
      </div>
      <div>
        <CardTitle className="text-red-800">Danger Zone</CardTitle>
        <CardDescription className="text-red-600">
          Irreversible actions that will permanently delete data
        </CardDescription>
      </div>
    </div>
  </CardHeader>
  <CardContent>
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
      <div className="flex-1">
        <h3 className="text-sm font-medium text-red-800">Delete All Configuration Data</h3>
        <p className="text-sm text-red-600 mt-1">
          Permanently delete all settings, version history, and App Context data. 
          This will reset the entire application to a vanilla state.
        </p>
      </div>
      <Button
        type="button"
        variant="destructive"
        onClick={() => setShowDeleteAllDialog(true)}
        disabled={isDeleting}
        className="bg-red-600 hover:bg-red-700 text-white"
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete All Data
      </Button>
    </div>
  </CardContent>
</Card>

{/* Delete All Configuration Dialog */}
<DeleteAllConfigDialog
  isOpen={showDeleteAllDialog}
  onConfirm={handleDeleteAllConfig}
  onCancel={() => setShowDeleteAllDialog(false)}
  isDeleting={isDeleting}
/>
```

## Real vs Simulated Behavior

**✅ REAL (Current Implementation):**
- Makes actual HTTP calls to PubNub REST API
- Stores data in real PubNub Persistence and App Context
- Requires valid PubNub credentials
- Shows network traffic in browser dev tools
- Data persists across sessions and devices

**❌ NOT Simulated:**
- No MCP server dependency
- No console.log() mock operations
- No localStorage-only storage
- No demo/fake data