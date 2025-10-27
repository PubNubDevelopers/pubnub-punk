# PubNub File Sharing Page Documentation

## Overview
The File Sharing page (`/src/pages/file-sharing.tsx`) is a comprehensive file management interface for PubNub developers to administer files stored in PubNub channels. It provides a familiar file manager UX similar to traditional file explorers with advanced features like pagination, multi-select, bulk operations, and configuration persistence.

## Purpose
- **Target Users**: PubNub developers who use the Files API
- **Main Goal**: Provide a GUI administration tool for managing files across PubNub channels
- **Key Value**: Eliminates need for API calls to manage files; provides visual file organization with enterprise features

## Architecture

### Component Structure
```
FileSharingPage
├── State Management (useState, useCallback, useMemo)
├── PubNub Instance (created from storage settings)
├── Config Context Integration (for settings persistence)
├── Channel Sidebar (left panel)
├── Main Content Area (right panel)
│   ├── Header with Stats (files count, storage, last activity)
│   └── File List Panel
│       ├── Header
│       │   ├── Upload Button (top-left)
│       │   ├── Refresh + Truncated Title + Stats + Page Size Selector
│       │   ├── Search Bar + Selection Controls + Actions Dropdown
│       │   └── Selection Count Display
│       ├── Column Headers (with sorting)
│       ├── Top Pagination Controls
│       ├── File List (with checkboxes and copy URL)
│       └── Bottom Pagination Controls
├── Real-time File Event Listener
├── Progress Dialogs (Delete & Download)
└── Results Modals
```

### Key Dependencies
- **PubNub SDK**: Loaded from CDN via `window.PubNub`
- **JSZip**: For client-side ZIP file creation (`npm install jszip`)
- **Config Context**: `useConfig()` for page settings persistence
- **Storage**: `storage.getSettings()` for PubNub credentials
- **UI Components**: Radix UI components from `@/components/ui/*`

## State Management

### Page Settings (Config Persisted)
```typescript
const FIELD_DEFINITIONS = {
  'files.selectedChannel': { section: 'files', field: 'selectedChannel', type: 'string', default: 'file-uploads' },
  'files.channels': { section: 'files', field: 'channels', type: 'array', default: ['file-uploads'] },
  'files.searchTerm': { section: 'files', field: 'searchTerm', type: 'string', default: '' },
  'files.sortBy': { section: 'files', field: 'sortBy', type: 'string', default: 'created' },
  'files.sortOrder': { section: 'files', field: 'sortOrder', type: 'string', default: 'desc' },
  'files.viewMode': { section: 'files', field: 'viewMode', type: 'string', default: 'list' },
  'files.pageSize': { section: 'files', field: 'pageSize', type: 'number', default: 50 },
  'files.currentPage': { section: 'files', field: 'currentPage', type: 'number', default: 1 },
}
```

### Config Context Integration
- **Config Type**: `'FILES'` for the config service
- **Saved Data**: Only the channels list (simplified approach)
- **Page Settings Structure**: Maintains `files` structure for UI + `configForSaving` for persistence
- **Auto-sync**: Updates config context when channels change via UI

### Local State
- `mounted`: Boolean to prevent SSR issues
- `pubnubReady`: Boolean for SDK loading state
- `pubnub`: PubNub instance
- `allFiles`: Record<string, FileItem[]> - All files by channel (in-memory cache)
- `selectedFiles`: Set<string> - Currently selected file IDs
- `loading`: File loading state
- `uploading`: Upload in progress
- `downloading`: Bulk download in progress
- `deleting`: Bulk delete in progress
- `channelStats`: Per-channel statistics
- `newChannelName`: Input for adding channels
- `showNewChannelDialog`: Dialog visibility
- `showSelectAllWarning`: Select all warning dialog visibility
- `showDeleteConfirm`: Delete confirmation dialog
- `showDeleteResults`: Delete results modal
- `showDownloadProgress`: Download progress dialog
- `deleteProgress`: Delete operation progress tracking
- `downloadProgress`: Download operation progress tracking
- `deleteResults`: Delete operation results with logs

## Key Features

### 1. Channel Management
- **Channel List**: Left sidebar shows all channels with tooltips for long names
- **Add Channel**: Plus button opens dialog to add new channels
- **Channel Selection**: Click to switch between channels
- **Visual Indicators**: Selected channel highlighted in blue
- **File Counts**: Shows number of files per channel
- **Tooltips**: Hover tooltips for truncated channel names (>20 chars)

### 2. Header & Navigation
- **Truncated Titles**: Aggressive truncation with hover tooltips (>5 chars)
- **Stats Integration**: Files count, storage size, last activity moved to header
- **Visual Filtering**: Search term highlights stats in blue when active
- **Responsive Layout**: Proper spacing and alignment

### 3. File Operations
- **Upload**: Upload button in top-left of file panel (5MB limit with detailed error handling)
- **Multi-Select**: Checkbox per file + click anywhere on row to select
- **Select All Visible**: Selects only files on current page
- **Select All Filtered**: Selects ALL files matching current search filter (with warning for >page size)
- **Copy URL**: Copy icon in each row copies file URL to clipboard
- **Bulk Actions**: Actions dropdown for selected files (Delete, Download)

### 4. Bulk Delete (Implemented)
- **Confirmation Dialog**: Shows file count and channel with warning
- **Progress Tracking**: Real-time progress with current file name
- **Error Handling**: Individual file failures logged, operation continues
- **Results Modal**: Detailed success/failure counts, error messages, full operation log
- **Copy Log**: Button to copy complete operation log to clipboard
- **100% Complete**: Fully implemented and tested

### 5. Bulk Download (Implemented)
- **Smart Download Logic**:
  - **Single file**: Direct download (no ZIP)
  - **Multiple files**: ZIP archive creation
- **100-File Limit**: Validation with clear error message
- **ZIP Naming**: `PubNub_Files_[channel]_[YYYY-MM-DD_HH:MM:SS].zip`
- **Progress Tracking**: Two phases: downloading files, creating ZIP
- **Client-side ZIP**: Uses JSZip library for browser-based ZIP creation
- **Error Handling**: Individual download failures logged, partial success supported
- **Auto-cleanup**: Selection cleared after successful download

### 6. File List Features
- **Pagination**: Handles channels with >100 files by loading all files into memory
- **Page Size Options**: 10, 50, or 100 files per page
- **Dual Pagination Controls**: Next/Previous buttons at top and bottom of list
- **Sortable Columns**: Click headers to sort by Name, Size, or Created date
- **Search**: Real-time filtering across ALL files (substring matching, case-insensitive)
- **Visual Selection**: Selected rows have blue background
- **Click-to-Select**: Click anywhere on row to toggle selection (excluding copy button)
- **Selection Count**: Shows "N files selected" below controls

### 7. Enhanced Error Handling
- **File Size Validation**: Pre-upload check prevents files >5MB
- **XML Error Parsing**: Parses EntityTooLarge errors for exact size limits
- **User-Friendly Messages**: Shows file sizes in human-readable format
- **Network Failures**: Graceful degradation with detailed error reporting

### 8. Real-time Updates
- **File Events**: Listens for new file uploads via subscription
- **Toast Notifications**: Shows when files are uploaded/deleted
- **In-Memory Updates**: Updates cached file list without full reload

### 9. Configuration Persistence
- **Save Current Settings**: Button in header becomes active for this page
- **Simplified Config**: Only channels list is saved to PubNub (as per requirements)
- **Version History**: Full config service integration with versioning
- **Auto-restore**: Can restore previous channel configurations

## PubNub Files API Integration

### Pagination Implementation
```javascript
// Fetch ALL files using pagination
do {
  const result = await pubnub.listFiles({
    channel: channelName,
    limit: 100,
    next: nextToken
  });
  allChannelFiles.push(...result.data);
  nextToken = result.next;
} while (nextToken);
```

### Key API Methods Used
```javascript
// List files in channel (with pagination)
pubnub.listFiles({ channel, limit: 100, next })

// Upload file
pubnub.sendFile({ channel, file, message })

// Download file (for individual and bulk downloads)
pubnub.downloadFile({ channel, id, name })

// Delete file (used in bulk delete)
pubnub.deleteFile({ channel, id, name })

// Get file URL
pubnub.getFileUrl({ channel, id, name })
```

### File Event Subscription
```javascript
subscription.onFile = (fileEvent) => {
  // Handle real-time file notifications
}
```

## Recent Major Enhancements (2025)

### 1. Bulk Delete Implementation
- **Complete Implementation**: Confirmation, progress tracking, results modal
- **Error Resilience**: Individual failures don't stop operation
- **Detailed Logging**: Full operation log with copy functionality
- **Progress UI**: Real-time progress with current file indicator

### 2. Bulk Download Implementation
- **JSZip Integration**: Client-side ZIP creation
- **Smart Logic**: Single files download directly, multiple files create ZIP
- **100-File Limit**: Validation to prevent browser overload
- **Military Time Naming**: Timestamped ZIP files with precise naming
- **Two-phase Progress**: Download phase + ZIP creation phase

### 3. Configuration Persistence
- **Config Service Integration**: Uses existing app-wide config system
- **Simplified Approach**: Only channels list saved (as requested)
- **Save Button Activation**: "Save Current Settings" becomes active
- **Version History**: Full restoration capabilities

### 4. UI/UX Improvements
- **Header Reorganization**: Stats moved to align with title
- **Aggressive Truncation**: Channel names truncated with tooltips
- **Search Visual Feedback**: Blue highlighting when filtering active
- **Smart Select All**: Works with filtered results, not just all files
- **Progress Dialogs**: Professional progress tracking for long operations

### 5. Enhanced Selection Logic
- **Fixed Checkbox Issues**: Proper event handling for checkbox clicks
- **Row Click Selection**: Click anywhere on row to select (except copy button)
- **Visual Feedback**: Clear selection states with blue highlighting
- **Selection Persistence**: Maintains state across pagination

## Known Limitations

### PubNub API Constraints
- **No Channel Discovery**: Cannot list channels with files
- **No File Search**: API doesn't support server-side search
- **No Bulk API Operations**: Must delete files individually
- **No File Updates**: Files are immutable once uploaded
- **5MB Size Limit**: Maximum file size restriction

### Current Implementation
- **Manual Channel Addition**: Users must know channel names
- **Client-side Search**: Only filters loaded files
- **Memory Usage**: All files loaded into memory (could be issue with thousands of files)
- **No Folder Hierarchy**: Flat structure within channels
- **100-File Download Limit**: Browser performance protection

## UI Layout (Current)

### File List Panel Header Structure
1. **Row 1**: Upload File button (standalone, top-left)
2. **Row 2**: [Refresh] "Files in [truncated channel]" | [Stats: files/MB/activity] | Page size selector
3. **Row 3**: Search bar | [Clear] [Select Visible] [Select All] [Actions▼]
4. **Row 4**: "N files selected" (only visible when files selected)

### File Table Structure
- **Columns**: [✓] Name | Size | Created | [Copy]
- **Features**: Click row to select, sortable columns, copy URL icon
- **Actions Dropdown**: Delete Selected, Download Selected

## Code Patterns

### Selection Management
```javascript
// Toggle file selection
const toggleFileSelection = (fileId: string) => {
  setSelectedFiles(prev => {
    const newSelection = new Set(prev);
    if (newSelection.has(fileId)) {
      newSelection.delete(fileId);
    } else {
      newSelection.add(fileId);
    }
    return newSelection;
  });
};
```

### Bulk Download Logic
```javascript
// Smart download: single file vs multiple files
if (selectedFilesList.length === 1) {
  const file = selectedFilesList[0];
  await downloadFile(file); // Direct download
  return;
}
// Multiple files: create ZIP
const zip = new JSZip();
// ... download files and add to ZIP
```

### Progress Tracking Pattern
```javascript
// Update progress during operations
setDownloadProgress({
  current: i + 1,
  total: selectedFilesList.length,
  currentFile: file.name,
  phase: 'downloading'
});
```

### Config Context Integration
```javascript
// Set config type and update settings
useEffect(() => {
  setConfigType('FILES');
}, [setConfigType]);

// Update config when channels change
const addChannel = () => {
  // ... update local state
  setPageSettings(prev => ({
    ...prev,
    configForSaving: {
      channels: updatedChannels,
      timestamp: new Date().toISOString(),
    }
  }));
};
```

## Testing Considerations
- **Large File Sets**: Test with channels containing 100+ files
- **Selection States**: Verify selection persists across pagination
- **Error Scenarios**: Test file size limits, network errors
- **Real-time Events**: Test file event notifications
- **Performance**: Monitor memory usage with many files
- **Bulk Operations**: Test with various file counts and error conditions
- **Config Persistence**: Test save/restore functionality
- **Long Channel Names**: Test truncation and tooltip behavior

## Implementation Status

### ✅ Completed Features
1. **Bulk Delete**: Full implementation with progress and results
2. **Bulk Download**: ZIP creation with smart single-file handling
3. **Configuration Persistence**: Simplified channels-only saving
4. **UI/UX Improvements**: Truncation, tooltips, header reorganization
5. **Progress Tracking**: Professional progress dialogs for long operations
6. **Error Handling**: Comprehensive error handling and user feedback
7. **Selection Logic**: Fixed checkbox and row selection issues

### 🚫 Removed Features
- **Export CSV**: Removed from Actions dropdown (not needed)

### 🔮 Future Opportunities
1. **Lazy Loading**: Virtual scrolling for very large file lists
2. **Keyboard Shortcuts**: Add keyboard navigation and actions
3. **File Preview**: Quick preview for images and text files
4. **Drag and Drop**: Multi-file upload support
5. **Advanced Search**: Search by size, date range, file type
6. **Batch Upload Progress**: Show individual progress for multiple uploads

## Related Files
- `/src/lib/storage.ts`: Settings storage
- `/src/contexts/config-context.tsx`: Page settings context
- `/src/index.css`: PubNub color utilities
- `/src/components/ui/*`: Shared UI components
- `tailwind.config.ts`: Color definitions
- `/utils/upload_test_files.py`: Python script for bulk file upload testing
- `package.json`: JSZip dependency

## Important Notes
- Always check `pubnub` instance exists before API calls
- Use `mounted` state to prevent SSR issues
- File IDs and names are both required for most operations
- Channel names are case-sensitive
- Files are permanently deleted (no trash/recycle bin)
- Selection state clears when switching channels
- All files are loaded into memory for better search/sort performance
- Config context requires both `files` structure (for UI) and `configForSaving` (for persistence)
- ZIP files use military time format: `PubNub_Files_[channel]_[YYYY-MM-DD_HH:MM:SS].zip`
- 100-file limit enforced for bulk downloads to prevent browser performance issues
- JSZip library required for client-side ZIP creation (`npm install jszip`)
