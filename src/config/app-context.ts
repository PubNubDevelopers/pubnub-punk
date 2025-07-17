// Configuration constants for App Context functionality

export const APP_CONTEXT_CONFIG = {
  // Maximum number of records to load locally to prevent browser crashes
  // This limit can be adjusted based on performance requirements
  MAX_LOCAL_RECORDS: 40, // Lowered threshold to force server-side search for datasets > 40 records
  
  // Default pagination size for API calls
  DEFAULT_PAGE_SIZE: 100,
  
  // Maximum number of pages to fetch (safety limit)
  MAX_PAGES: 1000,
  
  // Default search result limit
  DEFAULT_SEARCH_LIMIT: 100,
  
  // Search result pagination settings
  SEARCH_PAGINATION_THRESHOLD: 100, // When to start paginating search results
  MAX_SEARCH_RESULTS_LOCAL: 2000,   // Maximum search results to download locally
  SEARCH_PAGE_SIZE: 100,            // Page size for search result pagination
} as const;

export type AppContextConfig = typeof APP_CONTEXT_CONFIG;