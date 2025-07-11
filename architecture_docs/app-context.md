# App Context Architecture

## Overview

The App Context page provides a comprehensive interface for managing PubNub User and Channel objects with intelligent handling of large datasets to prevent browser performance issues.

## Smart Loading Architecture

### Configurable Thresholds

```typescript
// src/config/app-context.ts
export const APP_CONTEXT_CONFIG = {
  MAX_LOCAL_RECORDS: 5000,  // Configurable limit
  DEFAULT_PAGE_SIZE: 100,
  DEFAULT_SEARCH_LIMIT: 100,
} as const;
```

### Three-Mode Operation

1. **Count Check Mode**: On page load, performs lightweight API calls to get total object counts
2. **Local Data Mode**: For datasets ≤ threshold, loads all data locally with full table functionality
3. **Search Mode**: For datasets > threshold, shows search interface instead of loading all data

## Search Architecture

### Dual Search Interface

#### 1. Guided Search
- Visual form builder with dropdowns
- Field selection (id, name, email, etc.)
- Operator selection (equals, contains, comparisons)
- Logical operators (AND, OR)
- Real-time filter preview

#### 2. Raw Filter
- Direct PubNub filter expression input
- Syntax examples and validation
- Full PubNub filtering language support

### Server-Side Filtering

All searches use PubNub's native filtering capabilities:

```typescript
// Example API call
const result = await pubnub.objects.getAllUUIDMetadata({
  filter: 'name LIKE "admin*" && status == "active"',
  sort: { updated: 'desc' },
  limit: 100,
  include: { customFields: true, totalCount: true }
});
```

## Component Architecture

### Core Components

```
src/pages/app-context.tsx           # Main page with smart mode switching
src/hooks/useAppContextData.ts      # Data management and API calls
src/components/app-context/search/
  ├── AppContextSearchPanel.tsx     # Search interface
  └── SearchResults.tsx             # Results display
src/config/app-context.ts           # Configuration constants
```

### Data Flow

1. **Initialization**: `checkTotalCounts()` gets object counts with minimal API calls
2. **Mode Decision**: Compare counts against `MAX_LOCAL_RECORDS` threshold
3. **Smart Loading**: 
   - Small datasets: Load all data locally
   - Large datasets: Show search interface
4. **Search Execution**: Server-side filtering with pagination
5. **Results Display**: Rich cards with actions (Edit, Delete, Copy, View Relations)

## Supported Search Parameters

### User Fields
- `id` - Unique user identifier
- `name` - User's display name
- `email` - User's email address
- `externalId` - External system identifier
- `profileUrl` - Profile picture URL
- `status` - User status (active, inactive, etc.)
- `type` - User type classification
- `updated` - Last modification timestamp

### Channel Fields
- `id` - Unique channel identifier
- `name` - Channel display name
- `description` - Channel description
- `status` - Channel status
- `type` - Channel type classification
- `updated` - Last modification timestamp

### Filter Operators
- `==` - Exact match
- `!=` - Not equal
- `LIKE` - Pattern match with wildcards (`*pattern*`)
- `>`, `<`, `>=`, `<=` - Comparisons (for dates, numbers)
- `&&`, `||` - Logical AND/OR

### Example Filters
```javascript
// Exact match
id == "user-123"

// Pattern matching
name LIKE "*admin*"

// Date comparisons
updated >= "2023-01-01T00:00:00Z"

// Complex conditions
status == "active" && type == "admin"
```

## Performance Considerations

### Optimizations
- **Lazy loading**: Only loads data when needed
- **Efficient pagination**: Uses PubNub's native pagination
- **Minimal API calls**: Count checks use `limit: 1`
- **Server-side filtering**: Reduces data transfer
- **Configurable limits**: Prevents browser memory issues

### Scalability
- **Handles millions of objects**: Through server-side filtering
- **No local memory limits**: Search results are paginated
- **Fast exact matches**: Uses database indexes
- **Efficient pattern matching**: Leverages PubNub's filtering engine

## State Management

### Search State
```typescript
interface SearchState {
  searchMode: boolean;           // Currently in search mode
  searchResults: UserMetadata[]; // Current search results
  searchQuery: string;          // Active filter string
  searchResultCount: number;    // Total matching records
}
```

### Loading States
- `loading`: API call in progress
- `loadingProgress`: Progress tracking with counts
- `countChecked`: Initial count check completed
- `totalUserCount`, `totalChannelCount`: Cached totals

## Error Handling

### Graceful Degradation
- **API failures**: Show error messages, don't crash
- **Invalid filters**: Provide syntax guidance
- **Network issues**: Retry mechanisms and fallbacks
- **Large responses**: Pagination and limits

### User Feedback
- **Toast notifications**: Search completion status
- **Loading indicators**: Progress bars and spinners
- **Error messages**: Clear, actionable guidance
- **Help text**: Inline examples and documentation

## Future Enhancements

### Planned Features
- **Saved searches**: Store frequently used filters
- **Advanced filtering**: Date pickers, multi-select
- **Bulk operations**: Mass edit/delete from search results
- **Export functionality**: CSV/JSON export of results
- **Real-time updates**: Live search results

### Performance Improvements
- **Caching**: Client-side result caching
- **Background loading**: Prefetch common searches
- **Debounced search**: Reduce API calls during typing
- **Virtual scrolling**: Handle very large result sets

## Testing Strategy

### Test Coverage
- **Unit tests**: Individual component functionality
- **Integration tests**: API call workflows
- **Performance tests**: Large dataset handling
- **E2E tests**: Complete user workflows

### Test Scenarios
- Small datasets (< threshold)
- Large datasets (> threshold)
- Search functionality (guided + raw)
- Error conditions
- Edge cases (empty results, API failures)