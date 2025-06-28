# PubNub File Sharing Page Documentation

## Overview
The File Sharing page (`/src/pages/file-sharing.tsx`) is a comprehensive file management interface for PubNub developers to administer files stored in PubNub channels. It provides a familiar file manager UX similar to traditional file explorers with advanced features like pagination, multi-select, and bulk operations.

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
├── Channel Sidebar (left panel)
├── Main Content Area (right panel)
│   ├── Stats Bar (total files, storage, last activity)
│   └── File List Panel
│       ├── Header
│       │   ├── Upload Button (top-left)
│       │   ├── Refresh + Title + Page Size Selector
│       │   ├── Search Bar + Selection Controls + Actions Dropdown
│       │   └── Selection Count Display
│       ├── Column Headers (with sorting)
│       ├── Top Pagination Controls
│       ├── File List (with checkboxes and copy URL)
│       └── Bottom Pagination Controls
└── Real-time File Event Listener
```

### Key Dependencies
- **PubNub SDK**: Loaded from CDN via `window.PubNub`
- **Config Context**: `useConfig()` for page settings persistence
- **Storage**: `storage.getSettings()` for PubNub credentials
- **UI Components**: Radix UI components from `@/components/ui/*`

## State Management

### Page Settings (Persisted)
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

### Local State
- `mounted`: Boolean to prevent SSR issues
- `pubnubReady`: Boolean for SDK loading state
- `pubnub`: PubNub instance
- `files`: Array of FileItem objects (deprecated - for compatibility)
- `allFiles`: Record<string, FileItem[]> - All files by channel (in-memory cache)
- `selectedFiles`: Set<string> - Currently selected file IDs
- `loading`: File loading state
- `uploading`: Upload in progress
- `channelStats`: Per-channel statistics
- `newChannelName`: Input for adding channels
- `showNewChannelDialog`: Dialog visibility
- `showSelectAllWarning`: Select all warning dialog visibility

## Key Features

### 1. Channel Management
- **Channel List**: Left sidebar shows all channels
- **Add Channel**: Plus button opens dialog to add new channels
- **Channel Selection**: Click to switch between channels
- **Visual Indicators**: Selected channel highlighted in blue
- **File Counts**: Shows number of files per channel

### 2. File Operations
- **Upload**: Upload button in top-left of file panel (5MB limit with detailed error handling)
- **Multi-Select**: Checkbox per file + click anywhere on row to select
- **Select All Visible**: Selects only files on current page
- **Select All**: Selects ALL files in channel (with warning dialog)
- **Copy URL**: Copy icon in each row copies file URL to clipboard
- **Bulk Actions**: Actions dropdown for selected files (Delete, Download, Export CSV)

### 3. File List Features
- **Pagination**: Handles channels with >100 files by loading all files into memory
- **Page Size Options**: 10, 50, or 100 files per page
- **Dual Pagination Controls**: Next/Previous buttons at top and bottom of list
- **Sortable Columns**: Click headers to sort by Name, Size, or Created date
- **Search**: Real-time filtering across ALL files (not just visible page)
- **Visual Selection**: Selected rows have blue background
- **Click-to-Select**: Click anywhere on row to toggle selection
- **Selection Count**: Shows "N files selected" below controls

### 4. Enhanced Error Handling
- **File Size Validation**: Pre-upload check prevents files >5MB
- **XML Error Parsing**: Parses EntityTooLarge errors for exact size limits
- **User-Friendly Messages**: Shows file sizes in human-readable format

### 5. Real-time Updates
- **File Events**: Listens for new file uploads via subscription
- **Toast Notifications**: Shows when files are uploaded/deleted
- **In-Memory Updates**: Updates cached file list without full reload

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

// Download file
pubnub.downloadFile({ channel, id, name })

// Delete file
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

## Recent Enhancements (2025)

### 1. Pagination for Large File Lists
- **Issue**: Channels with >100 files couldn't display all files
- **Solution**: Fetch all files using pagination API, store in memory, paginate display

### 2. Multi-Select Functionality
- **Features**: Checkboxes, row click selection, select all options
- **Visual**: Blue background for selected rows
- **Actions**: Bulk delete, download, export (ready for implementation)

### 3. Enhanced Error Messages
- **Issue**: Cryptic XML errors for file size limits
- **Solution**: Parse EntityTooLarge errors, show exact size limits

### 4. UI Reorganization
- **Moved**: Search, selection controls, and refresh into file panel
- **Added**: Actions dropdown for bulk operations
- **Improved**: Better visual hierarchy and workflow

### 5. Copy URL Feature
- **Replaced**: Individual file action dropdowns
- **Added**: Quick copy icon for each file's URL

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

## UI Layout (Current)

### File List Panel Header Structure
1. **Row 1**: Upload File button (standalone, top-left)
2. **Row 2**: [Refresh] "Files in [channel]" | Page size selector
3. **Row 3**: Search bar | [Clear] [Select Visible] [Select All] [Actions▼]
4. **Row 4**: "N files selected" (only visible when files selected)

### File Table Structure
- **Columns**: [✓] Name | Size | Created | [Copy]
- **Features**: Click row to select, sortable columns, copy URL icon

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

### Pagination Logic
```javascript
// Calculate pagination
const totalPages = Math.ceil(filteredAndSortedFiles.length / pageSize);
const startIndex = (currentPage - 1) * pageSize;
const endIndex = startIndex + pageSize;
const paginatedFiles = filteredAndSortedFiles.slice(startIndex, endIndex);
```

### Error Handling Pattern
```javascript
// Parse EntityTooLarge XML errors
const xmlMatch = error.message.match(/<ProposedSize>(\d+)<\/ProposedSize>.*<MaxSizeAllowed>(\d+)<\/MaxSizeAllowed>/);
if (xmlMatch) {
  const proposedSize = parseInt(xmlMatch[1]);
  const maxAllowed = parseInt(xmlMatch[2]);
  errorMessage = `File size (${formatFileSize(proposedSize)}) exceeds the maximum allowed size of ${formatFileSize(maxAllowed)}`;
}
```

## Testing Considerations
- **Large File Sets**: Test with channels containing 100+ files
- **Selection States**: Verify selection persists across pagination
- **Error Scenarios**: Test file size limits, network errors
- **Real-time Events**: Test file event notifications
- **Performance**: Monitor memory usage with many files

## Next Steps for Implementation

### High Priority
1. **Implement Bulk Delete**: Wire up the Delete Selected action
2. **Implement Bulk Download**: Create zip file of selected files
3. **Implement Export CSV**: Export file metadata to CSV

### Medium Priority
1. **Lazy Loading**: Consider virtual scrolling for very large file lists
2. **Progress Indicators**: Show progress for bulk operations
3. **Keyboard Shortcuts**: Add keyboard navigation and actions
4. **File Preview**: Quick preview for images and text files

### Low Priority
1. **Drag and Drop**: Multi-file upload support
2. **File Tags**: Add custom metadata/tags to files
3. **Advanced Search**: Search by size, date range, file type
4. **Batch Upload Progress**: Show individual progress for multiple uploads

## Related Files
- `/src/lib/storage.ts`: Settings storage
- `/src/contexts/config-context.tsx`: Page settings context
- `/src/index.css`: PubNub color utilities
- `/src/components/ui/*`: Shared UI components
- `tailwind.config.ts`: Color definitions
- `/utils/upload_test_files.py`: Python script for bulk file upload testing

## Important Notes
- Always check `pubnub` instance exists before API calls
- Use `mounted` state to prevent SSR issues
- File IDs and names are both required for most operations
- Channel names are case-sensitive
- Files are permanently deleted (no trash/recycle bin)
- Selection state clears when switching channels
- All files are loaded into memory for better search/sort performance