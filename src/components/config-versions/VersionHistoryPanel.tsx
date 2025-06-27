import { useState, useEffect } from 'react';
import { History, ChevronDown, ChevronUp, RefreshCw, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { configService, ConfigVersion } from '@/lib/config-service';
import { useToast } from '@/hooks/use-toast';
import { VersionListItem } from './VersionListItem';
import { VersionRestoreDialog } from './VersionRestoreDialog';

interface VersionHistoryPanelProps {
  configType: string;
  currentConfig: any;
  onConfigRestore: (config: any) => void;
  className?: string;
}

export function VersionHistoryPanel({
  configType,
  currentConfig,
  onConfigRestore,
  className = ''
}: VersionHistoryPanelProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [versions, setVersions] = useState<ConfigVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVersion, setSelectedVersion] = useState<ConfigVersion | null>(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);

  // Get configuration stats
  const stats = configService.getConfigStats(configType);

  useEffect(() => {
    if (isExpanded) {
      loadVersionHistory();
    }
  }, [isExpanded, configType]);

  const loadVersionHistory = async () => {
    setLoading(true);
    try {
      const result = await configService.getConfigHistory(configType, 25);
      setVersions(result.versions);
      setHasMore(result.hasMore);
    } catch (error) {
      toast({
        title: "Failed to Load History",
        description: "Could not load configuration version history.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!hasMore || loading) return;

    setLoading(true);
    try {
      const lastTimetoken = versions[versions.length - 1]?.timetoken;
      const result = await configService.getConfigHistory(configType, 25, lastTimetoken);
      setVersions(prev => [...prev, ...result.versions]);
      setHasMore(result.hasMore);
    } catch (error) {
      toast({
        title: "Failed to Load More",
        description: "Could not load additional versions.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreVersion = (version: ConfigVersion) => {
    setSelectedVersion(version);
    setShowRestoreDialog(true);
  };

  const confirmRestore = async () => {
    if (!selectedVersion) return;

    try {
      const result = await configService.restoreConfigVersion(configType, selectedVersion.timetoken);
      
      if (result.success && result.restoredConfig) {
        onConfigRestore(result.restoredConfig);
        await loadVersionHistory(); // Refresh the list
        
        toast({
          title: "Configuration Restored",
          description: `Successfully restored version ${selectedVersion.version} from ${new Date(selectedVersion.timestamp).toLocaleDateString()}.`,
        });
      } else {
        throw new Error(result.error || 'Restore failed');
      }
    } catch (error) {
      toast({
        title: "Restore Failed",
        description: error instanceof Error ? error.message : "Failed to restore configuration.",
        variant: "destructive",
      });
    } finally {
      setShowRestoreDialog(false);
      setSelectedVersion(null);
    }
  };

  const handleDeleteVersion = async (version: ConfigVersion) => {
    try {
      const result = await configService.deleteConfigVersion(configType, version.timetoken);
      
      if (result.success) {
        setVersions(prev => prev.filter(v => v.timetoken !== version.timetoken));
        toast({
          title: "Version Deleted",
          description: `Version ${version.version} has been removed from history.`,
        });
      } else {
        throw new Error(result.error || 'Delete failed');
      }
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete version.",
        variant: "destructive",
      });
    }
  };

  const exportConfig = (version: ConfigVersion) => {
    const exportData = {
      configType,
      version: version.version,
      timestamp: version.timestamp,
      data: version.data,
      description: version.description
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${configType.toLowerCase()}-config-v${version.version}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Configuration Exported",
      description: `Version ${version.version} has been exported to your downloads.`,
    });
  };

  // Filter versions based on search term
  const filteredVersions = versions.filter(version => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      version.description?.toLowerCase().includes(searchLower) ||
      version.version.toString().includes(searchLower) ||
      new Date(version.timestamp).toLocaleDateString().includes(searchLower) ||
      version.publisher.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
              <History className="text-white h-5 w-5" />
            </div>
            <div>
              <CardTitle>Configuration History</CardTitle>
              <div className="flex items-center space-x-4 mt-1">
                <Badge variant="secondary">{stats.totalVersions} versions</Badge>
                {stats.latestVersion && (
                  <Badge variant="outline">v{stats.latestVersion}</Badge>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-2"
          >
            <span>{isExpanded ? 'Hide' : 'Show'} History</span>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Search and Controls */}
          <div className="flex items-center space-x-3">
            <div className="flex-1">
              <Label htmlFor="version-search" className="sr-only">Search versions</Label>
              <Input
                id="version-search"
                placeholder="Search versions by description, date, or author..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadVersionHistory}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Version List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {loading && versions.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-500">Loading version history...</span>
              </div>
            ) : filteredVersions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? 'No versions match your search.' : 'No version history found.'}
              </div>
            ) : (
              <>
                {filteredVersions.map((version) => (
                  <VersionListItem
                    key={version.timetoken}
                    version={version}
                    onRestore={() => handleRestoreVersion(version)}
                    onDelete={() => handleDeleteVersion(version)}
                    onExport={() => exportConfig(version)}
                  />
                ))}
                
                {hasMore && !searchTerm && (
                  <div className="flex justify-center pt-4">
                    <Button
                      variant="outline"
                      onClick={handleLoadMore}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                          Loading...
                        </>
                      ) : (
                        'Load More Versions'
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      )}

      {/* Restore Confirmation Dialog */}
      {showRestoreDialog && selectedVersion && (
        <VersionRestoreDialog
          version={selectedVersion}
          onConfirm={confirmRestore}
          onCancel={() => {
            setShowRestoreDialog(false);
            setSelectedVersion(null);
          }}
        />
      )}
    </Card>
  );
}