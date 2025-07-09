export interface FileItem {
  id: string;
  name: string;
  size: number;
  created: string;
  url?: string;
}

export interface ChannelStats {
  totalFiles: number;
  totalSize: number;
  lastActivity: string;
}

export interface DeleteProgress {
  current: number;
  total: number;
  currentFile: string;
}

export interface DownloadProgress {
  current: number;
  total: number;
  currentFile: string;
  phase: string;
}

export interface DeleteResults {
  successful: number;
  failed: number;
  cancelled: number;
  errors: string[];
  fullLog: string;
}

export interface FileSharingPageSettings {
  files: {
    channels: string[];
    selectedChannel: string;
    searchTerm: string;
    sortBy: string;
    sortOrder: string;
    viewMode: string;
    pageSize: number;
    currentPage: number;
  };
  configForSaving: {
    channels: string[];
    timestamp: string;
  };
}