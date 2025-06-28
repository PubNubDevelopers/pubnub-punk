import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import JSZip from 'jszip';
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
  ChevronsUpDown,
  Grid3X3,
  List
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  const { pageSettings, setPageSettings, setConfigType } = useConfig();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const deleteCancelledRef = useRef(false);
  
  // State for PubNub availability and instance
  const [mounted, setMounted] = useState(false);
  const [pubnubReady, setPubnubReady] = useState(false);
  const [pubnub, setPubnub] = useState<any>(null);
  
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
      // Add simplified config for saving (only channels)
      configForSaving: {
        channels: FIELD_DEFINITIONS['files.channels'].default,
        timestamp: new Date().toISOString(),
      }
    });
  }, [setConfigType, setPageSettings]);
  
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
            const pubnubConfig: any = {
              publishKey: settings.credentials.publishKey,
              subscribeKey: settings.credentials.subscribeKey,
              userId: settings.credentials.userId || 'file-manager-user'
            };
            
            // Add PAM token if available
            if (settings.credentials.pamToken) {
              pubnubConfig.authKey = settings.credentials.pamToken;
            }
            
            const instance = new window.PubNub(pubnubConfig);
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteResults, setShowDeleteResults] = useState(false);
  const [showDownloadProgress, setShowDownloadProgress] = useState(false);
  const [deleteResults, setDeleteResults] = useState<{
    successful: number;
    failed: number;
    cancelled: number;
    errors: string[];
    fullLog: string;
  }>({ successful: 0, failed: 0, cancelled: 0, errors: [], fullLog: '' });
  const [deleting, setDeleting] = useState(false);
  const [deleteCancelled, setDeleteCancelled] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState<{
    current: number;
    total: number;
    currentFile: string;
  }>({ current: 0, total: 0, currentFile: '' });
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{
    current: number;
    total: number;
    currentFile: string;
    phase: string; // 'downloading' or 'zipping'
  }>({ current: 0, total: 0, currentFile: '', phase: 'downloading' });

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

  // Handle bulk delete with confirmation and detailed results
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
    
    fullLog.push(`Starting bulk delete operation for ${selectedFilesList.length} files on channel: ${selectedChannel}`);
    fullLog.push(`Operation started at: ${new Date().toISOString()}`);
    fullLog.push('');

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
          
          // Update in-memory structure - remove only successfully deleted files
          const deletedFileIds = new Set<string>();
          for (let j = 0; j < successful; j++) {
            deletedFileIds.add(selectedFilesList[j].id);
          }

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
          
          // Clear selection and show results
          setSelectedFiles(new Set());
          setShowDeleteResults(true);
          setShowDeleteConfirm(false);
          return;
        }
        
        const file = selectedFilesList[i];
        
        // Update progress
        setDeleteProgress({
          current: i + 1,
          total: selectedFilesList.length,
          currentFile: file.name
        });
        try {
          fullLog.push(`Attempting to delete: ${file.name} (ID: ${file.id})`);
          
          await pubnub.deleteFile({
            channel: selectedChannel,
            id: file.id,
            name: file.name
          });
          
          successful++;
          fullLog.push(`✓ Successfully deleted: ${file.name}`);
          
          // Check for cancellation after each successful delete
          if (deleteCancelledRef.current) {
            const remainingCount = selectedFilesList.length - (i + 1);
            fullLog.push('');
            fullLog.push(`Operation cancelled by user at: ${new Date().toISOString()}`);
            fullLog.push(`Files processed before cancellation: ${i + 1}`);
            fullLog.push(`Files cancelled (not processed): ${remainingCount}`);
            
            // Calculate cancelled count and break immediately
            const cancelled = remainingCount;
            
            // Update in-memory structure - remove only successfully deleted files
            const deletedFileIds = new Set<string>();
            for (let j = 0; j < successful; j++) {
              deletedFileIds.add(selectedFilesList[j].id);
            }

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
            
            // Clear selection and show results
            setSelectedFiles(new Set());
            setShowDeleteResults(true);
            setShowDeleteConfirm(false);
            return;
          }
          
        } catch (error) {
          failed++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`${file.name}: ${errorMsg}`);
          fullLog.push(`✗ Failed to delete ${file.name}: ${errorMsg}`);
        }
      }

      // Update in-memory structure - remove only successfully deleted files
      const deletedFileIds = new Set<string>();
      for (let i = 0; i < selectedFilesList.length; i++) {
        if (i < successful) { // Assuming successful deletions happened in order
          deletedFileIds.add(selectedFilesList[i].id);
        }
      }

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

      // Clear selection
      setSelectedFiles(new Set());

      // Show results (only if not cancelled - cancellation handling is above)
      if (!deleteCancelledRef.current) {
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
        
        setShowDeleteResults(true);
        setShowDeleteConfirm(false);
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

  // Handle bulk download with ZIP creation
  const handleBulkDownload = async () => {
    if (!pubnub || !selectedChannel || selectedFiles.size === 0) return;

    // Validate 100-file limit
    if (selectedFiles.size > 100) {
      toast({
        title: "Too many files selected",
        description: `Please select up to 100 files for bulk download. You have ${selectedFiles.size} files selected.`,
        variant: "destructive",
      });
      return;
    }

    const selectedFilesList = channelFiles.filter(file => selectedFiles.has(file.id));
    
    // If only one file selected, download it directly (no ZIP needed)
    if (selectedFilesList.length === 1) {
      const file = selectedFilesList[0];
      await downloadFile(file);
      
      // Clear selection
      setSelectedFiles(new Set());
      
      toast({
        title: "Download started",
        description: `Downloading ${file.name}`,
      });
      return;
    }

    setDownloading(true);
    setShowDownloadProgress(true);
    
    // Initialize progress
    setDownloadProgress({
      current: 0,
      total: selectedFilesList.length,
      currentFile: '',
      phase: 'downloading'
    });

    try {
      const zip = new JSZip();
      let successful = 0;
      let failed = 0;
      const errors: string[] = [];

      // Download all files and add to ZIP
      for (let i = 0; i < selectedFilesList.length; i++) {
        const file = selectedFilesList[i];
        
        // Update progress
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

          const blob = await downloadedFile.toBlob();
          zip.file(file.name, blob);
          successful++;
        } catch (error) {
          failed++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`${file.name}: ${errorMsg}`);
          console.error(`Failed to download ${file.name}:`, error);
        }
      }

      if (successful === 0) {
        toast({
          title: "Download failed",
          description: "No files could be downloaded. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Create ZIP file
      setDownloadProgress({
        current: selectedFilesList.length,
        total: selectedFilesList.length,
        currentFile: '',
        phase: 'zipping'
      });

      const zipBlob = await zip.generateAsync({type: "blob"});

      // Generate filename: PubNub_Files_[channel]_[YYYY-MM-DD_HH:MM:SS].zip
      const now = new Date();
      const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const time = now.toTimeString().split(' ')[0]; // HH:MM:SS in military time
      const zipFileName = `PubNub_Files_${selectedChannel}_${date}_${time}.zip`;

      // Download the ZIP file
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = zipFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Show success message
      if (failed === 0) {
        toast({
          title: "Download completed",
          description: `Successfully downloaded ${successful} files as ${zipFileName}`,
        });
      } else {
        toast({
          title: "Download completed with errors",
          description: `Downloaded ${successful} files, ${failed} failed. Check console for details.`,
          variant: "destructive",
        });
      }

      // Clear selection
      setSelectedFiles(new Set());

    } catch (error) {
      console.error('Bulk download operation failed:', error);
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Failed to create ZIP file",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
      setShowDownloadProgress(false);
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
    
    // Also update the simplified config for saving
    setPageSettings(prev => ({
      ...prev,
      configForSaving: {
        channels: updatedChannels,
        timestamp: new Date().toISOString(),
      }
    }));
    
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
                        <DialogDescription>
                          Enter a channel name to add to your file management list.
                        </DialogDescription>
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
                <TooltipProvider>
                  {channels.map((channel) => (
                    <Tooltip key={channel}>
                      <TooltipTrigger asChild>
                        <div
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
                      </TooltipTrigger>
                      {channel.length > 20 && (
                        <TooltipContent side="right">
                          <p>{channel}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  ))}
                </TooltipProvider>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0">


            {/* File List */}
            <Card className="flex-1 flex flex-col">
              <CardHeader className="space-y-4">
                {/* Upload Button and View Mode Toggle */}
                <div className="flex items-center justify-between">
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
                  
                  {/* View Mode Toggle */}
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
                    {/* Refresh Button */}
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
                  
                  <div className="flex items-center gap-6">
                    {/* Last Activity */}
                    {channelStats[selectedChannel] && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>Last activity: {formatDate(channelStats[selectedChannel].lastActivity)}</span>
                      </div>
                    )}
                    
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
                        onClick={() => {
                          if (filteredAndSortedFiles.length > pageSize) {
                            setShowSelectAllWarning(true);
                          } else {
                            selectAllFiles();
                          }
                        }}
                        disabled={filteredAndSortedFiles.length === 0}
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
                            onClick={() => setShowDeleteConfirm(true)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Selected ({selectedFiles.size})
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={selectedFiles.size === 0}
                            onClick={handleBulkDownload}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download Selected ({selectedFiles.size})
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  {/* File and MB counters */}
                  {channelStats[selectedChannel] && (
                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <File className={`w-4 h-4 ${searchTerm ? 'text-pubnub-blue' : ''}`} />
                        <span className={searchTerm ? 'text-pubnub-blue font-medium' : ''}>
                          {searchTerm ? 
                            `${filteredAndSortedFiles.length} of ${channelStats[selectedChannel].totalFiles} files` :
                            `${channelStats[selectedChannel].totalFiles} files`
                          }
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <HardDrive className={`w-4 h-4 ${searchTerm ? 'text-pubnub-blue' : ''}`} />
                        <span className={searchTerm ? 'text-pubnub-blue font-medium' : ''}>
                          {searchTerm ? 
                            `${formatFileSize(filteredAndSortedFiles.reduce((sum, file) => sum + file.size, 0))} of ${formatFileSize(channelStats[selectedChannel].totalSize)}` :
                            formatFileSize(channelStats[selectedChannel].totalSize)
                          }
                        </span>
                      </div>
                    </div>
                  )}
                  
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
                ) : viewMode === 'list' ? (
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
                            // Only toggle if not clicking on copy button or file name link
                            const target = e.target as HTMLElement;
                            const copyButton = target.closest('button[title="Copy file URL"]');
                            const fileNameLink = target.closest('a[data-file-link]');
                            if (!copyButton && !fileNameLink) {
                              toggleFileSelection(file.id);
                            }
                          }}
                        >
                          <div 
                            className="flex items-center"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFileSelection(file.id);
                            }}
                          >
                            <Checkbox
                              checked={selectedFiles.has(file.id)}
                              className="data-[state=checked]:bg-pubnub-blue data-[state=checked]:border-pubnub-blue"
                            />
                          </div>
                          <div className="flex items-center gap-3 min-w-0">
                            <File className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <a 
                              href={file.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              data-file-link
                              className="truncate font-medium text-pubnub-blue hover:text-pubnub-blue/80 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {file.name}
                            </a>
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
                ) : (
                  // Gallery View
                  <div className="flex-1 flex flex-col">
                    {/* Gallery Header with selection controls */}
                    <div className="p-4 border-b bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
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
                          <span className="text-sm font-medium text-gray-600">
                            {selectedFiles.size > 0 ? `${selectedFiles.size} selected` : 'Select All'}
                          </span>
                        </div>
                        
                        {/* Sort controls for gallery */}
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500">Sort by:</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort('name')}
                            className={`text-xs ${sortBy === 'name' ? 'text-pubnub-blue' : 'text-gray-600'}`}
                          >
                            Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort('created')}
                            className={`text-xs ${sortBy === 'created' ? 'text-pubnub-blue' : 'text-gray-600'}`}
                          >
                            Date {sortBy === 'created' && (sortOrder === 'asc' ? '↑' : '↓')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort('size')}
                            className={`text-xs ${sortBy === 'size' ? 'text-pubnub-blue' : 'text-gray-600'}`}
                          >
                            Size {sortBy === 'size' && (sortOrder === 'asc' ? '↑' : '↓')}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Top Pagination Controls for Gallery */}
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

                    {/* Gallery Grid */}
                    <div className="flex-1 overflow-y-auto p-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {paginatedFiles.map((file) => (
                          <div
                            key={file.id}
                            className={`relative group border rounded-lg p-3 transition-all duration-200 cursor-pointer ${
                              selectedFiles.has(file.id)
                                ? 'border-pubnub-blue bg-blue-50 shadow-md'
                                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                            }`}
                            onClick={(e) => {
                              // Only toggle if not clicking on file name link or copy button
                              const target = e.target as HTMLElement;
                              const fileNameLink = target.closest('a[data-file-link]');
                              const copyButton = target.closest('button[title="Copy file URL"]');
                              if (!fileNameLink && !copyButton) {
                                toggleFileSelection(file.id);
                              }
                            }}
                          >
                            {/* Selection Checkbox */}
                            <div className="absolute top-2 left-2 z-10">
                              <Checkbox
                                checked={selectedFiles.has(file.id)}
                                onCheckedChange={() => toggleFileSelection(file.id)}
                                className="data-[state=checked]:bg-pubnub-blue data-[state=checked]:border-pubnub-blue bg-white/90 border-gray-300"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>

                            {/* Copy Button */}
                            <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyUrl(file);
                                }}
                                title="Copy file URL"
                                className="h-6 w-6 p-0 bg-white/90 hover:bg-white border border-gray-200"
                              >
                                <Copy className="w-3 h-3 text-gray-500 hover:text-gray-700" />
                              </Button>
                            </div>

                            {/* File Preview/Icon */}
                            <div className="aspect-square mb-2 flex items-center justify-center bg-gray-50 rounded border overflow-hidden">
                              {file.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ? (
                                <img
                                  src={file.url}
                                  alt={file.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    // Fallback to file icon if image fails to load
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    target.nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                              ) : null}
                              <div className={`flex items-center justify-center w-full h-full ${file.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ? 'hidden' : ''}`}>
                                <File className="w-8 h-8 text-gray-400" />
                              </div>
                            </div>

                            {/* File Info */}
                            <div className="space-y-1">
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                data-file-link
                                className="block text-sm font-medium text-pubnub-blue hover:text-pubnub-blue/80 hover:underline truncate"
                                onClick={(e) => e.stopPropagation()}
                                title={file.name}
                              >
                                {file.name}
                              </a>
                              <div className="text-xs text-gray-500">
                                {formatFileSize(file.size)}
                              </div>
                              <div className="text-xs text-gray-400">
                                {formatDate(file.created)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
              
              {/* Pagination Controls - List Mode Only */}
              {viewMode === 'list' && filteredAndSortedFiles.length > pageSize && (
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
            <DialogTitle>Select All {searchTerm ? 'Filtered ' : ''}Files?</DialogTitle>
            <DialogDescription>
              This will select all {filteredAndSortedFiles.length} {searchTerm ? 'filtered ' : ''}files{searchTerm ? ` matching "${searchTerm}"` : ` in the "${selectedChannel}" channel`}, not just the {paginatedFiles.length} files displayed on this page.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSelectAllWarning(false)}>
              Cancel
            </Button>
            <Button onClick={selectAllFiles} className="bg-pubnub-red hover:bg-pubnub-red/90">
              Select All {filteredAndSortedFiles.length} Files
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Selected Files?</DialogTitle>
            <DialogDescription>
              This will permanently delete {selectedFiles.size} selected file{selectedFiles.size === 1 ? '' : 's'} from the "{selectedChannel}" channel. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {/* Progress Section - Only show when deleting */}
          {deleting && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{deleteProgress.current} of {deleteProgress.total}</span>
                </div>
                <Progress 
                  value={(deleteProgress.current / deleteProgress.total) * 100} 
                  className="w-full"
                />
              </div>
              
              {deleteProgress.currentFile && (
                <div className="space-y-1">
                  <div className="text-sm font-medium">Currently deleting:</div>
                  <div className="text-sm text-gray-600 truncate">{deleteProgress.currentFile}</div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              if (deleting) {
                setDeleteCancelled(true);
                deleteCancelledRef.current = true;
              } else {
                setShowDeleteConfirm(false);
              }
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleBulkDelete} 
              className="bg-red-600 hover:bg-red-700" 
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Deleting... ({deleteProgress.current}/{deleteProgress.total})
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete {selectedFiles.size} File{selectedFiles.size === 1 ? '' : 's'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Results Modal */}
      <Dialog open={showDeleteResults} onOpenChange={setShowDeleteResults}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Delete Operation Results</DialogTitle>
            <DialogDescription>
              Results of bulk delete operation on "{selectedChannel}" channel
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Summary */}
            <div className={`grid gap-4 p-4 bg-gray-50 rounded-lg ${
              deleteResults.cancelled > 0 ? 'grid-cols-4' : 'grid-cols-3'
            }`}>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{deleteResults.successful}</div>
                <div className="text-sm text-gray-600">Successful</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{deleteResults.failed}</div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
              {deleteResults.cancelled > 0 && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{deleteResults.cancelled}</div>
                  <div className="text-sm text-gray-600">Cancelled</div>
                </div>
              )}
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{deleteResults.successful + deleteResults.failed + deleteResults.cancelled}</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
            </div>

            {/* Error Details */}
            {deleteResults.errors.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 text-red-600">Failed Deletions:</h4>
                <div className="max-h-32 overflow-y-auto bg-red-50 p-3 rounded border">
                  {deleteResults.errors.map((error, index) => (
                    <div key={index} className="text-sm text-red-700 mb-1">
                      • {error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Full Log */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Full Operation Log:</h4>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
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
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Log
                </Button>
              </div>
              <textarea
                value={deleteResults.fullLog}
                readOnly
                className="w-full h-64 p-3 text-sm font-mono bg-gray-50 border rounded resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowDeleteResults(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Download Progress Dialog */}
      <Dialog open={showDownloadProgress} onOpenChange={() => {}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Downloading Files</DialogTitle>
            <DialogDescription>
              {downloadProgress.phase === 'downloading' 
                ? `Downloading ${selectedFiles.size} files and creating ZIP archive...`
                : 'Creating ZIP archive...'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>
                  {downloadProgress.phase === 'downloading' ? 'Download Progress' : 'Creating ZIP'}
                </span>
                <span>{downloadProgress.current} of {downloadProgress.total}</span>
              </div>
              <Progress 
                value={(downloadProgress.current / downloadProgress.total) * 100} 
                className="w-full"
              />
            </div>
            
            {downloadProgress.currentFile && downloadProgress.phase === 'downloading' && (
              <div className="space-y-1">
                <div className="text-sm font-medium">Currently downloading:</div>
                <div className="text-sm text-gray-600 truncate">{downloadProgress.currentFile}</div>
              </div>
            )}

            {downloadProgress.phase === 'zipping' && (
              <div className="space-y-1">
                <div className="text-sm font-medium">Creating ZIP archive...</div>
                <div className="text-sm text-gray-600">Please wait while we package your files.</div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <div className="text-sm text-gray-500">
              Please do not close this window during download.
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
