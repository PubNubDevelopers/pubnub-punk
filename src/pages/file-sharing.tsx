import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Upload, 
  Folder, 
  File, 
  Download, 
  Trash2, 
  ExternalLink, 
  RefreshCw, 
  Plus,
  Search,
  Filter,
  MoreVertical,
  FolderOpen,
  Calendar,
  Users,
  HardDrive,
  AlertCircle,
  CheckCircle2,
  Copy,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useConfig } from '@/contexts/config-context';
import { storage } from '@/lib/storage';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';

interface FileItem {
  id: string;
  name: string;
  size: number;
  created: string;
  url?: string;
}

interface ChannelStats {
  totalFiles: number;
  totalSize: number;
  lastActivity: string;
}

// Field definitions for config management
const FIELD_DEFINITIONS = {
  'files.selectedChannel': { section: 'files', field: 'selectedChannel', type: 'string', default: 'file-uploads' },
  'files.channels': { section: 'files', field: 'channels', type: 'array', default: ['file-uploads'] },
  'files.searchTerm': { section: 'files', field: 'searchTerm', type: 'string', default: '' },
  'files.sortBy': { section: 'files', field: 'sortBy', type: 'string', default: 'created' },
  'files.sortOrder': { section: 'files', field: 'sortOrder', type: 'string', default: 'desc' },
  'files.viewMode': { section: 'files', field: 'viewMode', type: 'string', default: 'list' },
  'files.pageSize': { section: 'files', field: 'pageSize', type: 'number', default: 50 },
  'files.currentPage': { section: 'files', field: 'currentPage', type: 'number', default: 1 },
} as const;

// Declare PubNub as a global variable from the CDN
declare global {
  interface Window {
    PubNub: any;
  }
}

export default function FileSharingPage() {
  const { toast } = useToast();
  const { pageSettings, setPageSettings } = useConfig();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State for PubNub availability and instance
  const [mounted, setMounted] = useState(false);
  const [pubnubReady, setPubnubReady] = useState(false);
  const [pubnub, setPubnub] = useState<any>(null);
  
  // Mount check
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Check for PubNub availability on mount and create instance
  useEffect(() => {
    if (!mounted) return;
    
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max
    
    const checkPubNub = () => {
      if (typeof window !== 'undefined' && window.PubNub) {
        setPubnubReady(true);
        
        // Create PubNub instance now that SDK is loaded
        try {
          const settings = storage.getSettings();
          if (settings?.credentials?.publishKey && settings?.credentials?.subscribeKey) {
            const instance = new window.PubNub({
              publishKey: settings.credentials.publishKey,
              subscribeKey: settings.credentials.subscribeKey,
              userId: settings.credentials.userId || 'file-manager-user'
            });
            setPubnub(instance);
          }
        } catch (error) {
          console.error('Failed to create PubNub instance:', error);
          // Continue anyway - user will see configuration required message
        }
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(checkPubNub, 100);
      } else {
        // Timeout - show as ready but PubNub will be null
        console.warn('PubNub SDK failed to load after 5 seconds');
        setPubnubReady(true);
      }
    };
    
    checkPubNub();
  }, [mounted]);
  
  // State management
  const [files, setFiles] = useState<FileItem[]>([]);
  const [allFiles, setAllFiles] = useState<Record<string, FileItem[]>>({}); // All files by channel
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set()); // Selected file IDs
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [channelStats, setChannelStats] = useState<Record<string, ChannelStats>>({});
  const [newChannelName, setNewChannelName] = useState('');
  const [showNewChannelDialog, setShowNewChannelDialog] = useState(false);
  const [showSelectAllWarning, setShowSelectAllWarning] = useState(false);

  // Computed values from pageSettings (with null safety)
  const selectedChannel = pageSettings?.files?.selectedChannel || FIELD_DEFINITIONS['files.selectedChannel'].default;
  const channels = (pageSettings?.files?.channels || FIELD_DEFINITIONS['files.channels'].default) as string[];
  const searchTerm = pageSettings?.files?.searchTerm || FIELD_DEFINITIONS['files.searchTerm'].default;
  const sortBy = pageSettings?.files?.sortBy || FIELD_DEFINITIONS['files.sortBy'].default;
  const sortOrder = pageSettings?.files?.sortOrder || FIELD_DEFINITIONS['files.sortOrder'].default;
  const pageSize = pageSettings?.files?.pageSize || FIELD_DEFINITIONS['files.pageSize'].default;
  const currentPage = pageSettings?.files?.currentPage || FIELD_DEFINITIONS['files.currentPage'].default;

  // Update page settings helper
  const updateField = (path: string, value: any) => {
    const def = FIELD_DEFINITIONS[path as keyof typeof FIELD_DEFINITIONS];
    if (def) {
      setPageSettings(prev => ({
        ...prev,
        [def.section]: {
          ...prev?.[def.section],
          [def.field]: value
        }
      }));
    }
  };

  // Handle column header click for sorting
  const handleSort = (column: string) => {
    if (sortBy === column) {
      // Toggle sort order if same column
      updateField('files.sortOrder', sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to descending
      updateField('files.sortBy', column);
      updateField('files.sortOrder', 'desc');
    }
  };

  // Load all files for selected channel using pagination
  const loadFiles = useCallback(async (channelName: string = selectedChannel) => {
    if (!pubnub || !channelName) return;

    setLoading(true);
    try {
      const allChannelFiles: FileItem[] = [];
      let nextToken: string | undefined = undefined;
      let pageCount = 0;
      
      // Fetch all files using pagination
      do {
        const result = await pubnub.listFiles({
          channel: channelName,
          limit: 100,
          next: nextToken
        });

        const files = result.data || [];
        
        // Add URL to each file
        const filesWithUrls = files.map(file => ({
          ...file,
          url: pubnub?.getFileUrl({
            channel: channelName,
            id: file.id,
            name: file.name
          }) || ''
        }));
        
        allChannelFiles.push(...filesWithUrls);
        nextToken = result.next;
        pageCount++;
        
        // Show progress for large file lists
        if (pageCount % 5 === 0) {
          toast({
            title: "Loading files...",
            description: `Loaded ${allChannelFiles.length} files so far...`,
          });
        }
      } while (nextToken);

      // Store all files in memory
      setAllFiles(prev => ({
        ...prev,
        [channelName]: allChannelFiles
      }));

      // Update channel stats based on ALL files
      const stats: ChannelStats = {
        totalFiles: allChannelFiles.length,
        totalSize: allChannelFiles.reduce((sum, file) => sum + file.size, 0),
        lastActivity: allChannelFiles.length > 0 
          ? allChannelFiles.reduce((latest, file) => {
              return new Date(file.created) > new Date(latest) ? file.created : latest;
            }, allChannelFiles[0].created)
          : 'No files'
      };
      
      setChannelStats(prev => ({
        ...prev,
        [channelName]: stats
      }));
      
      // Reset to first page when loading new channel
      updateField('files.currentPage', 1);

    } catch (error) {
      console.error('Error loading files:', error);
      toast({
        title: "Error loading files",
        description: error instanceof Error ? error.message : "Failed to load files",
        variant: "destructive",
      });
      setAllFiles(prev => ({
        ...prev,
        [channelName]: []
      }));
    } finally {
      setLoading(false);
    }
  }, [pubnub, selectedChannel, toast]);

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !pubnub || !selectedChannel) return;

    // Check file size before upload (5MB limit)
    const maxFileSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxFileSize) {
      toast({
        title: "File too large",
        description: `File size (${formatFileSize(file.size)}) exceeds the maximum allowed size of 5MB. Please choose a smaller file.`,
        variant: "destructive",
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setUploading(true);
    try {
      const result = await pubnub.sendFile({
        channel: selectedChannel,
        file: file,
        message: {
          description: `Uploaded ${file.name}`,
          uploadedAt: new Date().toISOString(),
          size: file.size
        }
      });

      toast({
        title: "File uploaded successfully",
        description: `${file.name} uploaded to ${selectedChannel}`,
      });

      // Reload files
      await loadFiles();
    } catch (error) {
      console.error('Error uploading file:', error);
      
      // Check if it's an EntityTooLarge error
      let errorMessage = "Failed to upload file";
      
      if (error instanceof Error) {
        // Try to parse XML error response
        if (error.message.includes('EntityTooLarge') || error.message.includes('413')) {
          // Parse XML error if present
          const xmlMatch = error.message.match(/<ProposedSize>(\d+)<\/ProposedSize>.*<MaxSizeAllowed>(\d+)<\/MaxSizeAllowed>/);
          if (xmlMatch) {
            const proposedSize = parseInt(xmlMatch[1]);
            const maxAllowed = parseInt(xmlMatch[2]);
            errorMessage = `File size (${formatFileSize(proposedSize)}) exceeds the maximum allowed size of ${formatFileSize(maxAllowed)}. Please choose a smaller file.`;
          } else {
            errorMessage = `File size exceeds the maximum allowed size of 5MB. Please choose a smaller file.`;
          }
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle file deletion
  const deleteFile = async (file: FileItem) => {
    if (!pubnub || !selectedChannel) return;

    try {
      await pubnub.deleteFile({
        channel: selectedChannel,
        id: file.id,
        name: file.name
      });

      toast({
        title: "File deleted",
        description: `${file.name} has been deleted`,
      });

      // Remove file from in-memory structure
      setAllFiles(prev => ({
        ...prev,
        [selectedChannel]: (prev[selectedChannel] || []).filter(f => f.id !== file.id)
      }));

      // Update channel stats
      const updatedFiles = (allFiles[selectedChannel] || []).filter(f => f.id !== file.id);
      const stats: ChannelStats = {
        totalFiles: updatedFiles.length,
        totalSize: updatedFiles.reduce((sum, f) => sum + f.size, 0),
        lastActivity: updatedFiles.length > 0 
          ? updatedFiles.reduce((latest, f) => {
              return new Date(f.created) > new Date(latest) ? f.created : latest;
            }, updatedFiles[0].created)
          : 'No files'
      };
      
      setChannelStats(prev => ({
        ...prev,
        [selectedChannel]: stats
      }));
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  // Handle file download
  const downloadFile = async (file: FileItem) => {
    if (!pubnub || !selectedChannel) return;

    try {
      const downloadedFile = await pubnub.downloadFile({
        channel: selectedChannel,
        id: file.id,
        name: file.name
      });

      // Create download link
      const blob = await (downloadedFile as any).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download started",
        description: `Downloading ${file.name}`,
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Failed to download file",
        variant: "destructive",
      });
    }
  };

  // Copy URL to clipboard
  const copyUrl = async (file: FileItem) => {
    try {
      await navigator.clipboard.writeText(file.url || '');
      toast({
        title: "URL copied",
        description: "File URL copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy URL to clipboard",
        variant: "destructive",
      });
    }
  };

  // Add new channel
  const addChannel = () => {
    if (!newChannelName.trim()) return;

    const updatedChannels = [...channels, newChannelName.trim()];
    updateField('files.channels', updatedChannels);
    updateField('files.selectedChannel', newChannelName.trim());
    setNewChannelName('');
    setShowNewChannelDialog(false);

    toast({
      title: "Channel added",
      description: `Added channel: ${newChannelName.trim()}`,
    });
  };

  // Get all files for current channel
  const channelFiles = useMemo(() => {
    return allFiles[selectedChannel] || [];
  }, [allFiles, selectedChannel]);

  // Filter and sort ALL files from memory
  const filteredAndSortedFiles = useMemo(() => {
    let filtered = [...channelFiles];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(file => 
        file.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'size':
          aValue = a.size;
          bValue = b.size;
          break;
        case 'created':
        default:
          aValue = new Date(a.created).getTime();
          bValue = new Date(b.created).getTime();
          break;
      }

      if (sortOrder === 'desc') {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      } else {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [channelFiles, searchTerm, sortBy, sortOrder]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredAndSortedFiles.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedFiles = filteredAndSortedFiles.slice(startIndex, endIndex);

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Selection handlers
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

  const selectAllVisible = () => {
    const visibleFileIds = new Set(paginatedFiles.map(f => f.id));
    setSelectedFiles(visibleFileIds);
  };

  const selectAllFiles = () => {
    const allFileIds = new Set(channelFiles.map(f => f.id));
    setSelectedFiles(allFileIds);
    setShowSelectAllWarning(false);
  };

  const clearSelection = () => {
    setSelectedFiles(new Set());
  };

  // Check if all visible files are selected
  const allVisibleSelected = useMemo(() => {
    if (paginatedFiles.length === 0) return false;
    return paginatedFiles.every(file => selectedFiles.has(file.id));
  }, [paginatedFiles, selectedFiles]);

  // Check if some visible files are selected
  const someVisibleSelected = useMemo(() => {
    return paginatedFiles.some(file => selectedFiles.has(file.id));
  }, [paginatedFiles, selectedFiles]);

  // Set up real-time file notifications
  useEffect(() => {
    if (!pubnub || !selectedChannel) return;

    const subscription = pubnub.channel(selectedChannel).subscription();
    
    // Listen for file events
    subscription.onFile = (fileEvent: any) => {
      console.log('File event received:', fileEvent);
      
      // Show notification
      toast({
        title: "New file shared",
        description: `${fileEvent.file?.name || 'A file'} was uploaded to ${fileEvent.channel}`,
      });
      
      // Reload files to show the new file
      if (fileEvent.channel === selectedChannel) {
        loadFiles(fileEvent.channel);
      }
    };

    // Subscribe to the channel
    subscription.subscribe();

    // Cleanup on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [selectedChannel, pubnub, toast, loadFiles]);

  // Load files when channel changes
  useEffect(() => {
    if (selectedChannel) {
      loadFiles();
      clearSelection(); // Clear selection when changing channels
    }
  }, [selectedChannel, pubnub]);

  // Show loading while mounting or PubNub is initializing
  if (!mounted || !pubnubReady) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <RefreshCw className="w-16 h-16 text-pubnub-blue mx-auto mb-4 animate-spin" />
            <h3 className="text-xl font-semibold mb-2">Loading File Manager</h3>
            <p className="text-gray-600">
              {!mounted ? 'Starting up...' : 'Initializing PubNub SDK...'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // PubNub connection check
  if (!pubnub) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">PubNub Configuration Required</h3>
            <p className="text-gray-600">Please configure your PubNub keys in Settings to use the File Manager</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 h-full">
      <div className="max-w-7xl mx-auto h-full flex flex-col">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-pubnub-text mb-2">PubNub Files Manager</h1>
          <p className="text-gray-600">Administer and monitor files in your PubNub channels</p>
        </div>

        {/* Main Layout */}
        <div className="flex-1 flex gap-6 min-h-0">
          {/* Left Sidebar - Channel Browser */}
          <div className="w-64 flex-shrink-0">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Channels</CardTitle>
                  <Dialog open={showNewChannelDialog} onOpenChange={setShowNewChannelDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="ghost">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Channel</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Channel Name</Label>
                          <Input
                            value={newChannelName}
                            onChange={(e) => setNewChannelName(e.target.value)}
                            placeholder="Enter channel name"
                            onKeyDown={(e) => e.key === 'Enter' && addChannel()}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setShowNewChannelDialog(false)}>
                            Cancel
                          </Button>
                          <Button onClick={addChannel}>Add Channel</Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                {channels.map((channel) => (
                  <div
                    key={channel}
                    className={`p-2 rounded cursor-pointer flex items-center justify-between group ${
                      selectedChannel === channel 
                        ? 'bg-pubnub-blue text-white hover:bg-pubnub-blue/90' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => updateField('files.selectedChannel', channel)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {selectedChannel === channel ? (
                        <FolderOpen className="w-4 h-4 flex-shrink-0" />
                      ) : (
                        <Folder className="w-4 h-4 flex-shrink-0" />
                      )}
                      <span className="text-sm truncate">{channel}</span>
                    </div>
                    {channelStats[channel] && (
                      <span className={`text-xs ${selectedChannel === channel ? 'text-blue-200' : 'text-gray-500'}`}>
                        {channelStats[channel].totalFiles}
                      </span>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0">

            {/* Stats Bar */}
            {channelStats[selectedChannel] && (
              <Card className="mb-4">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <File className="w-4 h-4" />
                        <span>
                          {searchTerm ? 
                            `${filteredAndSortedFiles.length} of ${channelStats[selectedChannel].totalFiles} files` :
                            `${channelStats[selectedChannel].totalFiles} files`
                          }
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <HardDrive className="w-4 h-4" />
                        <span>{formatFileSize(channelStats[selectedChannel].totalSize)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Last activity: {formatDate(channelStats[selectedChannel].lastActivity)}</span>
                      </div>
                    </div>
                    {filteredAndSortedFiles.length > pageSize && (
                      <div className="text-sm text-gray-600">
                        Showing {startIndex + 1}-{Math.min(endIndex, filteredAndSortedFiles.length)} of {filteredAndSortedFiles.length}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* File List */}
            <Card className="flex-1 flex flex-col">
              <CardHeader className="space-y-4">
                {/* Upload Button */}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="bg-pubnub-red hover:bg-pubnub-red/90"
                    size="sm"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? 'Uploading...' : 'Upload File'}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* Refresh Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadFiles()}
                      disabled={loading}
                    >
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                    
                    <CardTitle className="text-lg">Files in {selectedChannel}</CardTitle>
                  </div>
                  
                  {/* Page Size Selector */}
                  <div className="flex flex-col items-center">
                    <Select
                      value={pageSize.toString()}
                      onValueChange={(value) => {
                        updateField('files.pageSize', parseInt(value));
                        updateField('files.currentPage', 1); // Reset to first page
                      }}
                    >
                      <SelectTrigger className="w-[70px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-gray-500 mt-1">files per page</span>
                  </div>
                </div>

                {/* Search and Controls Row */}
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    {/* Search */}
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input
                        placeholder="Search files..."
                        value={searchTerm}
                        onChange={(e) => {
                          updateField('files.searchTerm', e.target.value);
                          updateField('files.currentPage', 1); // Reset to first page on search
                        }}
                        className="pl-10"
                      />
                    </div>

                    {/* Selection buttons and actions */}
                    <div className="flex items-center gap-2">
                      {selectedFiles.size > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={clearSelection}
                        >
                          Clear
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={selectAllVisible}
                        disabled={filteredAndSortedFiles.length === 0}
                      >
                        Select Visible
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowSelectAllWarning(true)}
                        disabled={channelFiles.length === 0}
                      >
                        Select All
                      </Button>

                      {/* Actions Dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={selectedFiles.size === 0}
                          >
                            Actions
                            <ChevronDown className="w-4 h-4 ml-2" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            disabled={selectedFiles.size === 0}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Selected ({selectedFiles.size})
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={selectedFiles.size === 0}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download Selected ({selectedFiles.size})
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <File className="w-4 h-4 mr-2" />
                            Export CSV
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  {/* Selection count */}
                  {selectedFiles.size > 0 && (
                    <div className="text-sm text-gray-600 ml-auto text-right">
                      {selectedFiles.size} {selectedFiles.size === 1 ? 'file' : 'files'} selected
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1 flex flex-col">
                {loading ? (
                  <div className="p-8 text-center">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
                    <p>Loading files...</p>
                  </div>
                ) : filteredAndSortedFiles.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="p-8 text-center">
                      <File className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No files found</h3>
                      <p className="text-gray-500">
                        {searchTerm ? 'No files match your search criteria' : 'Upload files to get started'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col">
                    <div className="grid grid-cols-[auto,1fr,100px,150px,auto] gap-4 p-4 border-b bg-gray-50 text-sm font-medium text-gray-600">
                      <div className="flex items-center">
                        <Checkbox
                          checked={allVisibleSelected}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              selectAllVisible();
                            } else {
                              clearSelection();
                            }
                          }}
                          className="data-[state=checked]:bg-pubnub-blue data-[state=checked]:border-pubnub-blue"
                        />
                      </div>
                      <button
                        className="flex items-center gap-1 hover:text-gray-900 transition-colors text-left"
                        onClick={() => handleSort('name')}
                      >
                        Name
                        {sortBy === 'name' && (
                          sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                        )}
                        {sortBy !== 'name' && <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                      </button>
                      <button
                        className="flex items-center gap-1 hover:text-gray-900 transition-colors text-left"
                        onClick={() => handleSort('size')}
                      >
                        Size
                        {sortBy === 'size' && (
                          sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                        )}
                        {sortBy !== 'size' && <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                      </button>
                      <button
                        className="flex items-center gap-1 hover:text-gray-900 transition-colors text-left"
                        onClick={() => handleSort('created')}
                      >
                        Created
                        {sortBy === 'created' && (
                          sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                        )}
                        {sortBy !== 'created' && <ChevronsUpDown className="w-4 h-4 opacity-50" />}
                      </button>
                      <div className="w-10"></div>
                    </div>
                    
                    {/* Top Pagination Controls */}
                    {filteredAndSortedFiles.length > pageSize && (
                      <div className="border-b p-4">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-500">
                            Page {currentPage} of {totalPages}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateField('files.currentPage', Math.max(1, currentPage - 1))}
                              disabled={currentPage === 1}
                            >
                              <ChevronDown className="w-4 h-4 rotate-90" />
                              Previous
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateField('files.currentPage', Math.min(totalPages, currentPage + 1))}
                              disabled={currentPage === totalPages}
                            >
                              Next
                              <ChevronDown className="w-4 h-4 -rotate-90" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex-1 divide-y overflow-y-auto">
                      {paginatedFiles.map((file) => (
                        <div 
                          key={file.id} 
                          className={`grid grid-cols-[auto,1fr,100px,150px,auto] gap-4 p-4 items-center transition-colors cursor-pointer ${
                            selectedFiles.has(file.id) 
                              ? 'bg-blue-50 hover:bg-blue-100' 
                              : 'bg-white hover:bg-gray-50'
                          }`}
                          onClick={(e) => {
                            // Don't toggle if clicking on the copy button
                            const target = e.target as HTMLElement;
                            if (!target.closest('button') || target.closest('[role="checkbox"]')) {
                              toggleFileSelection(file.id);
                            }
                          }}
                        >
                          <div className="flex items-center">
                            <Checkbox
                              checked={selectedFiles.has(file.id)}
                              onCheckedChange={() => toggleFileSelection(file.id)}
                              className="data-[state=checked]:bg-pubnub-blue data-[state=checked]:border-pubnub-blue"
                            />
                          </div>
                          <div className="flex items-center gap-3 min-w-0">
                            <File className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="truncate font-medium">{file.name}</span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {formatFileSize(file.size)}
                          </div>
                          <div className="text-sm text-gray-600">
                            {formatDate(file.created)}
                          </div>
                          <div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyUrl(file);
                              }}
                              title="Copy file URL"
                            >
                              <Copy className="w-4 h-4 text-gray-500 hover:text-gray-700" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
              
              {/* Pagination Controls */}
              {filteredAndSortedFiles.length > pageSize && (
                <div className="border-t p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateField('files.currentPage', Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronDown className="w-4 h-4 rotate-90" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateField('files.currentPage', Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronDown className="w-4 h-4 -rotate-90" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
      
      {/* Select All Warning Dialog */}
      <Dialog open={showSelectAllWarning} onOpenChange={setShowSelectAllWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select All Files?</DialogTitle>
            <DialogDescription>
              This will select all {channelFiles.length} files in the "{selectedChannel}" channel, not just the {paginatedFiles.length} files displayed on this page.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSelectAllWarning(false)}>
              Cancel
            </Button>
            <Button onClick={selectAllFiles} className="bg-pubnub-red hover:bg-pubnub-red/90">
              Select All {channelFiles.length} Files
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
