# PubNub File Sharing Page Documentation

## Overview
The File Sharing page (`/src/pages/file-sharing.tsx`) is a comprehensive file management interface for PubNub developers to administer files stored in PubNub channels. It provides a familiar file manager UX similar to traditional file explorers.

## Purpose
- **Target Users**: PubNub developers who use the Files API
- **Main Goal**: Provide a GUI administration tool for managing files across PubNub channels
- **Key Value**: Eliminates need for API calls to manage files; provides visual file organization

## Architecture

### Component Structure
```
FileSharingPage
├── State Management (useState, useCallback)
├── PubNub Instance (created from storage settings)
├── Channel Sidebar (left panel)
├── Main Content Area (right panel)
│   ├── Toolbar (upload, search)
│   ├── Stats Bar (file count, storage, last activity)
│   └── File List (sortable table)
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
}
```

### Local State
- `mounted`: Boolean to prevent SSR issues
- `pubnubReady`: Boolean for SDK loading state
- `pubnub`: PubNub instance
- `files`: Array of FileItem objects
- `loading`: File loading state
- `uploading`: Upload in progress
- `channelStats`: Per-channel statistics
- `newChannelName`: Input for adding channels
- `showNewChannelDialog`: Dialog visibility

## Key Features

### 1. Channel Management
- **Channel List**: Left sidebar shows all channels
- **Add Channel**: Plus button opens dialog to add new channels
- **Channel Selection**: Click to switch between channels
- **Visual Indicators**: Selected channel highlighted in blue
- **File Counts**: Shows number of files per channel

### 2. File Operations
- **Upload**: Click button or drag-drop (5MB limit)
- **Download**: Downloads file to device
- **Delete**: Removes file from PubNub storage
- **Copy URL**: Copies direct file URL to clipboard
- **Open**: Opens file in new browser tab

### 3. File List Features
- **Sortable Columns**: Click headers to sort by Name, Size, or Created date
- **Search**: Real-time filtering by filename
- **Metadata Display**: Shows name, size, creation date
- **Actions Menu**: Dropdown with file operations

### 4. Real-time Updates
- **File Events**: Listens for new file uploads via subscription
- **Toast Notifications**: Shows when files are uploaded/deleted
- **Auto-refresh**: Updates file list on events

## PubNub Files API Integration

### Key API Methods Used
```javascript
// List files in channel
pubnub.listFiles({ channel, limit: 100 })

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

## Recent Bug Fixes

### 1. Shift-Reload White Screen (Fixed)
- **Issue**: Page crashed on hard refresh due to PubNub SDK not loaded
- **Solution**: Added mounted state and loading checks before accessing `window.PubNub`

### 2. CSS Color Variables (Fixed)
- **Issue**: Selected channel invisible due to double `hsl()` wrapping
- **Solution**: Fixed CSS utilities in `/src/index.css` to use `var()` directly

### 3. Last Activity Timestamp (Fixed)
- **Issue**: Showed wrong file's timestamp
- **Solution**: Added proper timestamp comparison using `reduce()` to find most recent

### 4. Column Header Sorting (Enhanced)
- **Issue**: Separate dropdown controls were cumbersome
- **Solution**: Made column headers clickable with sort indicators

## Known Limitations

### PubNub API Constraints
- **No Channel Discovery**: Cannot list channels with files
- **No File Search**: API doesn't support server-side search
- **No Bulk Operations**: Must delete files individually
- **No File Updates**: Files are immutable once uploaded
- **5MB Size Limit**: Maximum file size restriction

### Current Implementation Limits
- **Manual Channel Addition**: Users must know channel names
- **Client-side Search**: Only filters loaded files
- **No Pagination**: Limited to 100 files per channel
- **No Folder Hierarchy**: Flat structure within channels

## Future Enhancement Ideas

### High Priority
1. **Channel Suggestions**: Pre-populate common channel patterns
2. **Bulk Operations**: Select multiple files for deletion
3. **Pagination**: Handle channels with >100 files
4. **File Preview**: Show thumbnails for images
5. **Drag-and-Drop Upload**: Direct file dropping

### Medium Priority
1. **Export File List**: CSV export of file metadata
2. **Storage Analytics**: Charts showing usage over time
3. **File Type Icons**: Different icons based on file extension
4. **Advanced Filters**: Filter by size, date range, type
5. **Keyboard Shortcuts**: Delete, download via keyboard

### Low Priority
1. **Grid View**: Alternative to list view
2. **File Sharing**: Generate shareable links
3. **Upload Progress**: Show percentage during upload
4. **Batch Upload**: Upload multiple files at once
5. **File Versioning**: Track file history (would need custom implementation)

## Code Patterns

### Adding New Features
1. **State**: Add to FIELD_DEFINITIONS for persistence
2. **UI Updates**: Use `updateField()` helper for settings
3. **API Calls**: Wrap in try-catch with toast notifications
4. **Loading States**: Show spinners during async operations
5. **Error Handling**: User-friendly error messages

### Common Functions
```javascript
// Update settings
updateField('files.sortBy', 'name')

// Handle async operations
try {
  setLoading(true)
  const result = await pubnub.someMethod()
  toast({ title: "Success" })
} catch (error) {
  toast({ title: "Error", variant: "destructive" })
} finally {
  setLoading(false)
}
```

## Testing Considerations
- **No PubNub Keys**: Show configuration required message
- **Empty Channels**: Show helpful empty state
- **Failed Operations**: Graceful error handling
- **Large File Lists**: Performance with many files
- **Real-time Events**: Test file event notifications

## Related Files
- `/src/lib/storage.ts`: Settings storage
- `/src/contexts/config-context.tsx`: Page settings context
- `/src/index.css`: PubNub color utilities
- `/src/components/ui/*`: Shared UI components
- `tailwind.config.ts`: Color definitions

## Important Notes
- Always check `pubnub` instance exists before API calls
- Use `mounted` state to prevent SSR issues
- File IDs and names are both required for most operations
- Channel names are case-sensitive
- Files are permanently deleted (no trash/recycle bin)