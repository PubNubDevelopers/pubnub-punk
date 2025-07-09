import { useState, useEffect, useMemo, useCallback, useRef, startTransition } from 'react';
import JSZip from 'jszip';
import { RefreshCw, AlertCircle, Grid3X3, List } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useConfig } from '@/contexts/config-context';
import { usePubNub } from '@/hooks/usePubNub';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { ChannelBrowser } from './ChannelBrowser';
import { FileUpload } from './FileUpload';
import { SearchAndFilters } from './SearchAndFilters';
import { BulkActions } from './BulkActions';
import { FileStats } from './FileStats';
import { FileList } from './FileList';
import { SelectAllWarningDialog } from './SelectAllWarningDialog';
import { BulkDeleteDialog } from './BulkDeleteDialog';
import { DeleteResultsDialog } from './DeleteResultsDialog';
import { DownloadProgressDialog } from './DownloadProgressDialog';

import { FileItem, ChannelStats, DeleteProgress, DownloadProgress, DeleteResults } from './types';
import { FIELD_DEFINITIONS, formatFileSize } from './utils';

export default function FileSharingPage() {
  const { toast } = useToast();
  const { pageSettings, setPageSettings, setConfigType } = useConfig();
  const deleteCancelledRef = useRef(false);
  
  // State for component mounting
  const [mounted, setMounted] = useState(false);
  
  // Use centralized PubNub connection
  const { pubnub, isReady: pubnubReady, connectionError, isConnected } = usePubNub({
    instanceId: 'file-sharing',
    userId: 'file-sharing-manager-user',
    onConnectionError: (error) => {
      toast({
        title: "PubNub Connection Failed",
        description: error,
        variant: "destructive",
      });
    },
    onConnectionSuccess: () => {
      console.log('File Sharing PubNub connection established');
    }
  });
  
  // Mount check
  useEffect(() => {
    setMounted(true);
  }, []);

  // Set config type for the config service
  useEffect(() => {
    setConfigType('FILES');
    
    // Initialize page settings with the expected files structure
    setPageSettings({
      files: {
        channels: FIELD_DEFINITIONS['files.channels'].default,
        selectedChannel: FIELD_DEFINITIONS['files.selectedChannel'].default,
        searchTerm: FIELD_DEFINITIONS['files.searchTerm'].default,
        sortBy: FIELD_DEFINITIONS['files.sortBy'].default,
        sortOrder: FIELD_DEFINITIONS['files.sortOrder'].default,
        viewMode: FIELD_DEFINITIONS['files.viewMode'].default,
        pageSize: FIELD_DEFINITIONS['files.pageSize'].default,
        currentPage: FIELD_DEFINITIONS['files.currentPage'].default,
      },
      configForSaving: {
        channels: FIELD_DEFINITIONS['files.channels'].default,
        timestamp: new Date().toISOString(),
      }
    });
  }, [setConfigType, setPageSettings]);
  
  // State management
  const [allFiles, setAllFiles] = useState<Record<string, FileItem[]>>({});
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [channelStats, setChannelStats] = useState<Record<string, ChannelStats>>({});
  
  // Dialog states
  const [showSelectAllWarning, setShowSelectAllWarning] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteResults, setShowDeleteResults] = useState(false);
  const [showDownloadProgress, setShowDownloadProgress] = useState(false);
  
  // Operation states
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [deleteCancelled, setDeleteCancelled] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState<DeleteProgress>({ current: 0, total: 0, currentFile: '' });
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress>({ current: 0, total: 0, currentFile: '', phase: 'downloading' });
  const [deleteResults, setDeleteResults] = useState<DeleteResults>({ successful: 0, failed: 0, cancelled: 0, errors: [], fullLog: '' });
  
  // Computed values from pageSettings (with null safety)
  const selectedChannel = pageSettings?.files?.selectedChannel || FIELD_DEFINITIONS['files.selectedChannel'].default;
  const channels = (pageSettings?.files?.channels || FIELD_DEFINITIONS['files.channels'].default) as string[];
  const searchTerm = pageSettings?.files?.searchTerm || FIELD_DEFINITIONS['files.searchTerm'].default;
  const sortBy = pageSettings?.files?.sortBy || FIELD_DEFINITIONS['files.sortBy'].default;
  const sortOrder = pageSettings?.files?.sortOrder || FIELD_DEFINITIONS['files.sortOrder'].default;
  const viewMode = pageSettings?.files?.viewMode || FIELD_DEFINITIONS['files.viewMode'].default;
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
      updateField('files.sortOrder', sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
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
      
      do {
        const result = await pubnub.listFiles({
          channel: channelName,
          limit: 100,
          next: nextToken
        });

        const files = result.data || [];
        
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
        
        if (pageCount % 5 === 0) {
          toast({
            title: "Loading files...",
            description: `Loaded ${allChannelFiles.length} files so far...`,
          });
        }
      } while (nextToken);

      setAllFiles(prev => ({
        ...prev,
        [channelName]: allChannelFiles
      }));

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

  // Get all files for current channel
  const channelFiles = useMemo(() => {
    return allFiles[selectedChannel] || [];
  }, [allFiles, selectedChannel]);

  // Filter and sort ALL files from memory
  const filteredAndSortedFiles = useMemo(() => {
    let filtered = [...channelFiles];

    if (searchTerm) {
      filtered = filtered.filter(file => 
        file.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

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
    const allFilteredFileIds = new Set(filteredAndSortedFiles.map(f => f.id));
    setSelectedFiles(allFilteredFileIds);
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

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !pubnub || !selectedChannel) return;

    const maxFileSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxFileSize) {
      toast({
        title: "File too large",
        description: `File size (${formatFileSize(file.size)}) exceeds the maximum allowed size of 5MB.`,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      await pubnub.sendFile({
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

      await loadFiles();
    } catch (error) {
      console.error('Error uploading file:', error);
      
      let errorMessage = "Failed to upload file";
      if (error instanceof Error) {
        if (error.message.includes('EntityTooLarge') || error.message.includes('413')) {
          errorMessage = `File size exceeds the maximum allowed size of 5MB.`;
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
  const addChannel = (channelName: string) => {
    const updatedChannels = [...channels, channelName];
    updateField('files.channels', updatedChannels);
    updateField('files.selectedChannel', channelName);
    
    setPageSettings(prev => ({
      ...prev,
      configForSaving: {
        channels: updatedChannels,
        timestamp: new Date().toISOString(),
      }
    }));

    toast({
      title: "Channel added",
      description: `Added channel: ${channelName}`,
    });
  };

  // Handle bulk delete with proper cancellation logic
  const handleBulkDelete = async () => {
    if (!pubnub || !selectedChannel || selectedFiles.size === 0) return;

    setDeleting(true);
    setDeleteCancelled(false);
    deleteCancelledRef.current = false;
    const selectedFilesList = channelFiles.filter(file => selectedFiles.has(file.id));
    
    // Initialize progress
    setDeleteProgress({
      current: 0,
      total: selectedFilesList.length,
      currentFile: ''
    });
    
    let successful = 0;
    let failed = 0;
    const errors: string[] = [];
    const fullLog: string[] = [];
    const successfulFiles: string[] = [];
    const failedFiles: string[] = [];
    
    fullLog.push(`Starting bulk delete operation for ${selectedFilesList.length} files on channel: ${selectedChannel}`);
    fullLog.push(`Operation started at: ${new Date().toISOString()}`);
    fullLog.push('');

    // Helper function to update file lists and stats efficiently
    const updateFileListsAndStats = (deletedFileIds: Set<string>, cancelledCount: number = 0) => {
      // Update in-memory structure - remove only successfully deleted files
      setAllFiles(prev => ({
        ...prev,
        [selectedChannel]: (prev[selectedChannel] || []).filter(f => !deletedFileIds.has(f.id))
      }));

      // Update channel stats
      const remainingFiles = (allFiles[selectedChannel] || []).filter(f => !deletedFileIds.has(f.id));
      const stats: ChannelStats = {
        totalFiles: remainingFiles.length,
        totalSize: remainingFiles.reduce((sum, f) => sum + f.size, 0),
        lastActivity: remainingFiles.length > 0 
          ? remainingFiles.reduce((latest, f) => {
              return new Date(f.created) > new Date(latest) ? f.created : latest;
            }, remainingFiles[0].created)
          : 'No files'
      };
      
      setChannelStats(prev => ({
        ...prev,
        [selectedChannel]: stats
      }));

      // Clear selection and show results
      setSelectedFiles(new Set());
      setShowDeleteResults(true);
      setShowDeleteConfirm(false);
    };

    try {
      for (let i = 0; i < selectedFilesList.length; i++) {
        // Check for cancellation before processing each file
        if (deleteCancelledRef.current) {
          const remainingCount = selectedFilesList.length - i;
          fullLog.push('');
          fullLog.push(`Operation cancelled by user at: ${new Date().toISOString()}`);
          fullLog.push(`Files processed before cancellation: ${i}`);
          fullLog.push(`Files cancelled (not processed): ${remainingCount}`);
          
          // Calculate cancelled count and break immediately
          const cancelled = remainingCount;
          
          // Create set of successfully deleted files
          const deletedFileIds = new Set<string>();
          for (let j = 0; j < successful; j++) {
            deletedFileIds.add(selectedFilesList[j].id);
          }

          // Show results immediately
          fullLog.push('');
          fullLog.push(`Operation cancelled at: ${new Date().toISOString()}`);
          fullLog.push(`Total files selected: ${selectedFilesList.length}`);
          fullLog.push(`Successfully deleted: ${successful}`);
          fullLog.push(`Failed to delete: ${failed}`);
          fullLog.push(`Cancelled (not processed): ${cancelled}`);

          setDeleteResults({
            successful,
            failed,
            cancelled,
            errors,
            fullLog: fullLog.join('\n')
          });
          
          // Update file lists and stats once
          updateFileListsAndStats(deletedFileIds, cancelled);
          return;
        }
        
        const file = selectedFilesList[i];
        
        // Update progress only every few files or on the last file to reduce React re-renders
        if (i % 3 === 0 || i === selectedFilesList.length - 1) {
          startTransition(() => {
            setDeleteProgress({
              current: i + 1,
              total: selectedFilesList.length,
              currentFile: file.name
            });
          });
        }

        try {
          await pubnub.deleteFile({
            channel: selectedChannel,
            id: file.id,
            name: file.name
          });
          
          successful++;
          successfulFiles.push(file.name);
          
          // Check for cancellation after each successful delete
          if (deleteCancelledRef.current) {
            const remainingCount = selectedFilesList.length - (i + 1);
            fullLog.push('');
            fullLog.push(`Operation cancelled by user at: ${new Date().toISOString()}`);
            fullLog.push(`Files processed before cancellation: ${i + 1}`);
            fullLog.push(`Files cancelled (not processed): ${remainingCount}`);
            
            // Calculate cancelled count and break immediately
            const cancelled = remainingCount;
            
            // Create set of successfully deleted files
            const deletedFileIds = new Set<string>();
            for (let j = 0; j < successful; j++) {
              deletedFileIds.add(selectedFilesList[j].id);
            }

            // Show results immediately
            fullLog.push('');
            fullLog.push(`Operation cancelled at: ${new Date().toISOString()}`);
            fullLog.push(`Total files selected: ${selectedFilesList.length}`);
            fullLog.push(`Successfully deleted: ${successful}`);
            fullLog.push(`Failed to delete: ${failed}`);
            fullLog.push(`Cancelled (not processed): ${cancelled}`);

            setDeleteResults({
              successful,
              failed,
              cancelled,
              errors,
              fullLog: fullLog.join('\n')
            });
            
            // Update file lists and stats once
            updateFileListsAndStats(deletedFileIds, cancelled);
            return;
          }
          
        } catch (error) {
          failed++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`${file.name}: ${errorMsg}`);
          failedFiles.push(file.name);
        }
      }

      // Operation completed without cancellation
      // Create set of successfully deleted files
      const deletedFileIds = new Set<string>();
      for (let i = 0; i < selectedFilesList.length; i++) {
        if (i < successful) { // Assuming successful deletions happened in order
          deletedFileIds.add(selectedFilesList[i].id);
        }
      }

      // Show results (only if not cancelled - cancellation handling is above)
      if (!deleteCancelledRef.current) {
        // Build final log with all successful and failed files
        fullLog.push('');
        
        // Add successful files
        if (successfulFiles.length > 0) {
          fullLog.push('Successfully deleted files:');
          successfulFiles.forEach(fileName => {
            fullLog.push(`✓ ${fileName}`);
          });
        }
        
        // Add failed files
        if (failedFiles.length > 0) {
          fullLog.push('');
          fullLog.push('Failed to delete files:');
          failedFiles.forEach(fileName => {
            fullLog.push(`✗ ${fileName}`);
          });
        }
        
        fullLog.push('');
        fullLog.push(`Operation completed at: ${new Date().toISOString()}`);
        fullLog.push(`Total files processed: ${successful + failed}`);
        fullLog.push(`Successfully deleted: ${successful}`);
        fullLog.push(`Failed to delete: ${failed}`);

        setDeleteResults({
          successful,
          failed,
          cancelled: 0,
          errors,
          fullLog: fullLog.join('\n')
        });
        
        // Update file lists and stats once
        updateFileListsAndStats(deletedFileIds);
      }

    } catch (error) {
      console.error('Bulk delete operation failed:', error);
      toast({
        title: "Bulk delete failed",
        description: error instanceof Error ? error.message : "Failed to complete bulk delete operation",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteCancelled(false);
      deleteCancelledRef.current = false;
    }
  };

  // Handle bulk download
  const handleBulkDownload = async () => {
    if (!pubnub || !selectedChannel || selectedFiles.size === 0) return;

    if (selectedFiles.size > 100) {
      toast({
        title: "Too many files selected",
        description: `Please select up to 100 files for bulk download.`,
        variant: "destructive",
      });
      return;
    }

    const selectedFilesList = channelFiles.filter(file => selectedFiles.has(file.id));
    
    if (selectedFilesList.length === 1) {
      const file = selectedFilesList[0];
      try {
        const downloadedFile = await pubnub.downloadFile({
          channel: selectedChannel,
          id: file.id,
          name: file.name
        });

        const blob = await (downloadedFile as any).toBlob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setSelectedFiles(new Set());
        
        toast({
          title: "Download started",
          description: `Downloading ${file.name}`,
        });
      } catch (error) {
        toast({
          title: "Download failed",
          description: "Failed to download file",
          variant: "destructive",
        });
      }
      return;
    }

    setDownloading(true);
    setShowDownloadProgress(true);
    
    setDownloadProgress({
      current: 0,
      total: selectedFilesList.length,
      currentFile: '',
      phase: 'downloading'
    });

    try {
      const zip = new JSZip();
      let successful = 0;

      for (let i = 0; i < selectedFilesList.length; i++) {
        const file = selectedFilesList[i];
        
        setDownloadProgress({
          current: i + 1,
          total: selectedFilesList.length,
          currentFile: file.name,
          phase: 'downloading'
        });

        try {
          const downloadedFile = await pubnub.downloadFile({
            channel: selectedChannel,
            id: file.id,
            name: file.name
          });

          const blob = await (downloadedFile as any).toBlob();
          zip.file(file.name, blob);
          successful++;
        } catch (error) {
          console.error(`Failed to download ${file.name}:`, error);
        }
      }

      if (successful === 0) {
        toast({
          title: "Download failed",
          description: "No files could be downloaded.",
          variant: "destructive",
        });
        return;
      }

      setDownloadProgress({
        current: selectedFilesList.length,
        total: selectedFilesList.length,
        currentFile: '',
        phase: 'zipping'
      });

      const zipBlob = await zip.generateAsync({type: "blob"});

      const now = new Date();
      const date = now.toISOString().split('T')[0];
      const time = now.toTimeString().split(' ')[0];
      const zipFileName = `PubNub_Files_${selectedChannel}_${date}_${time}.zip`;

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = zipFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download completed",
        description: `Successfully downloaded ${successful} files as ${zipFileName}`,
      });

      setSelectedFiles(new Set());

    } catch (error) {
      console.error('Bulk download operation failed:', error);
      toast({
        title: "Download failed",
        description: "Failed to create ZIP file",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
      setShowDownloadProgress(false);
    }
  };

  // Set up real-time file notifications
  useEffect(() => {
    if (!pubnub || !selectedChannel) return;

    const subscription = pubnub.channel(selectedChannel).subscription();
    
    subscription.onFile = (fileEvent: any) => {
      console.log('File event received:', fileEvent);
      
      toast({
        title: "New file shared",
        description: `${fileEvent.file?.name || 'A file'} was uploaded to ${fileEvent.channel}`,
      });
      
      if (fileEvent.channel === selectedChannel) {
        loadFiles(fileEvent.channel);
      }
    };

    subscription.subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [selectedChannel, pubnub, toast, loadFiles]);

  // Load files when channel changes
  useEffect(() => {
    if (selectedChannel) {
      loadFiles();
      clearSelection();
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
        {/* Main Layout */}
        <div className="flex-1 flex gap-6 min-h-0">
          {/* Left Sidebar - Channel Browser */}
          <ChannelBrowser
            channels={channels}
            selectedChannel={selectedChannel}
            channelStats={channelStats}
            onChannelSelect={(channel) => updateField('files.selectedChannel', channel)}
            onChannelAdd={addChannel}
          />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* File List */}
            <Card className="flex-1 flex flex-col">
              <CardHeader className="space-y-4">
                {/* Upload Button and View Mode Toggle */}
                <div className="flex items-center justify-between">
                  <FileUpload uploading={uploading} onFileUpload={handleFileUpload} />
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateField('files.viewMode', viewMode === 'list' ? 'gallery' : 'list')}
                    className="flex items-center gap-2"
                  >
                    {viewMode === 'list' ? (
                      <>
                        <Grid3X3 className="w-4 h-4" />
                        Gallery Mode
                      </>
                    ) : (
                      <>
                        <List className="w-4 h-4" />
                        List Mode
                      </>
                    )}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0 max-w-xs">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadFiles()}
                      disabled={loading}
                    >
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <CardTitle className="text-lg truncate">
                            Files in {selectedChannel}
                          </CardTitle>
                        </TooltipTrigger>
                        {selectedChannel.length > 5 && (
                          <TooltipContent>
                            <p>Files in {selectedChannel}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  
                  <SearchAndFilters
                    searchTerm={searchTerm}
                    onSearchChange={(value) => {
                      updateField('files.searchTerm', value);
                      updateField('files.currentPage', 1);
                    }}
                    pageSize={pageSize}
                    onPageSizeChange={(size) => {
                      updateField('files.pageSize', size);
                      updateField('files.currentPage', 1);
                    }}
                  />
                </div>

                {/* Search and Controls Row */}
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <div className="flex-1" />
                    <BulkActions
                      selectedFilesCount={selectedFiles.size}
                      totalFilesCount={filteredAndSortedFiles.length}
                      pageSize={pageSize}
                      onSelectAllVisible={selectAllVisible}
                      onSelectAll={selectAllFiles}
                      onClearSelection={clearSelection}
                      onBulkDelete={() => setShowDeleteConfirm(true)}
                      onBulkDownload={handleBulkDownload}
                      onShowSelectAllWarning={() => setShowSelectAllWarning(true)}
                    />
                  </div>
                  
                  {/* File and MB counters */}
                  {channelStats[selectedChannel] && (
                    <FileStats
                      channelStats={channelStats[selectedChannel]}
                      searchTerm={searchTerm}
                      filteredCount={filteredAndSortedFiles.length}
                      filteredSize={filteredAndSortedFiles.reduce((sum, file) => sum + file.size, 0)}
                      selectedChannel={selectedChannel}
                    />
                  )}
                  
                  {/* Selection count */}
                  {selectedFiles.size > 0 && (
                    <div className="text-sm text-gray-600 ml-auto text-right">
                      {selectedFiles.size} {selectedFiles.size === 1 ? 'file' : 'files'} selected
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <FileList
                files={paginatedFiles}
                selectedFiles={selectedFiles}
                onToggleSelection={toggleFileSelection}
                onCopyUrl={copyUrl}
                onSort={handleSort}
                sortBy={sortBy}
                sortOrder={sortOrder}
                viewMode={viewMode}
                loading={loading}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => updateField('files.currentPage', page)}
                allVisibleSelected={allVisibleSelected}
                onSelectAllVisible={selectAllVisible}
                onClearSelection={clearSelection}
                showPagination={filteredAndSortedFiles.length > pageSize}
              />
            </Card>
          </div>
        </div>
      </div>
      
      {/* Dialogs */}
      <SelectAllWarningDialog
        open={showSelectAllWarning}
        onOpenChange={setShowSelectAllWarning}
        onConfirm={selectAllFiles}
        totalCount={filteredAndSortedFiles.length}
        visibleCount={paginatedFiles.length}
        searchTerm={searchTerm}
        selectedChannel={selectedChannel}
      />

      <BulkDeleteDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleBulkDelete}
        onCancel={() => {
          if (deleting) {
            setDeleteCancelled(true);
            deleteCancelledRef.current = true;
          } else {
            setShowDeleteConfirm(false);
          }
        }}
        selectedCount={selectedFiles.size}
        selectedChannel={selectedChannel}
        deleting={deleting}
        deleteProgress={deleteProgress}
      />

      <DeleteResultsDialog
        open={showDeleteResults}
        onOpenChange={setShowDeleteResults}
        results={deleteResults}
        selectedChannel={selectedChannel}
        onCopyLog={async () => {
          try {
            await navigator.clipboard.writeText(deleteResults.fullLog);
            toast({
              title: "Copied to clipboard",
              description: "Full operation log copied to clipboard",
            });
          } catch (error) {
            toast({
              title: "Copy failed",
              description: "Failed to copy log to clipboard",
              variant: "destructive",
            });
          }
        }}
      />

      <DownloadProgressDialog
        open={showDownloadProgress}
        progress={downloadProgress}
        selectedFilesCount={selectedFiles.size}
      />
    </div>
  );
}