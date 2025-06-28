import { useState, useEffect } from 'react';
import { RefreshCw, Download, RotateCcw, Trash2, Calendar, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { configService, ConfigVersion } from '@/lib/config-service';
import { useToast } from '@/hooks/use-toast';
import { VersionRestoreDialog } from '@/components/config-versions/VersionRestoreDialog';

interface ConfigHistoryListProps {
  configType: string;
  onConfigRestore?: (config: any) => void;
}

export function ConfigHistoryList({ configType, onConfigRestore }: ConfigHistoryListProps) {
  const { toast } = useToast();
  const [versions, setVersions] = useState<ConfigVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<ConfigVersion | null>(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);

  useEffect(() => {
    loadVersionHistory();
  }, [configType]);

  const loadVersionHistory = async () => {
    setLoading(true);
    try {
      const result = await configService.getConfigHistory(configType, 10);
      setVersions(result.versions.reverse());
    } catch (error) {
      toast({
        title: "Failed to Load History",
        description: "Could not load configuration history.",
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
        onConfigRestore?.(result.restoredConfig);
        await loadVersionHistory();
        
        toast({
          title: "Configuration Restored",
          description: `Successfully restored "${selectedVersion.metadata?.name || `v${selectedVersion.version}`}".`,
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
          title: "Configuration Deleted",
          description: `"${version.metadata?.name || `v${version.version}`}" has been removed.`,
        });
      } else {
        throw new Error(result.error || 'Delete failed');
      }
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete configuration.",
        variant: "destructive",
      });
    }
  };

  const exportConfig = (version: ConfigVersion) => {
    const exportData = {
      configType,
      name: version.metadata?.name || `v${version.version}`,
      version: version.version,
      timestamp: version.timestamp,
      data: version.data,
      description: version.description
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${version.metadata?.name || `${configType.toLowerCase()}-v${version.version}`}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Configuration Exported",
      description: `"${version.metadata?.name || `v${version.version}`}" has been exported.`,
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-4 w-4 animate-spin text-gray-400 mr-2" />
        <span className="text-sm text-gray-500">Loading history...</span>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-sm">No saved configurations found.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {versions.map((version) => {
          const { date, time } = formatDate(version.timestamp);
          const displayName = version.metadata?.name || `Version ${version.version}`;
          
          return (
            <div key={version.timetoken} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    v{version.version}
                  </Badge>
                  <span className="font-medium text-sm truncate">{displayName}</span>
                </div>
                
                <div className="flex items-center space-x-3 text-xs text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>{date} {time}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <User className="h-3 w-3" />
                    <span className="truncate max-w-20">{version.publisher}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-1 ml-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => exportConfig(version)}
                  className="h-7 w-7 p-0 text-blue-600 hover:text-blue-800"
                  title="Download"
                >
                  <Download className="h-3 w-3" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRestoreVersion(version)}
                  className="h-7 w-7 p-0 text-green-600 hover:text-green-800"
                  title="Restore"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteVersion(version)}
                  className="h-7 w-7 p-0 text-red-600 hover:text-red-800"
                  title="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

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
    </>
  );
}