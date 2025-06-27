import { useState } from 'react';
import { RotateCcw, Download, Trash2, ChevronDown, ChevronUp, User, Calendar, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfigVersion } from '@/lib/config-service';

interface VersionListItemProps {
  version: ConfigVersion;
  onRestore: () => void;
  onDelete: () => void;
  onExport: () => void;
}

export function VersionListItem({
  version,
  onRestore,
  onDelete,
  onExport
}: VersionListItemProps) {
  const [showDetails, setShowDetails] = useState(false);

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const { date, time } = formatDate(version.timestamp);

  // Determine if this is a restored version
  const isRestored = version.description?.startsWith('Restored from');

  return (
    <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1">
          <div className="flex items-center space-x-2">
            <Badge variant={isRestored ? "secondary" : "default"}>
              v{version.version}
            </Badge>
            {isRestored && (
              <Badge variant="outline" className="text-xs">
                Restored
              </Badge>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <span>{date}</span>
                <span className="text-gray-400">{time}</span>
              </div>
              
              <div className="flex items-center space-x-1">
                <User className="h-3 w-3" />
                <span className="truncate max-w-24">{version.publisher}</span>
              </div>
              
              <div className="flex items-center space-x-1">
                <Hash className="h-3 w-3" />
                <span className="font-mono text-xs">
                  {version.timetoken.slice(-8)}
                </span>
              </div>
            </div>
            
            {version.description && (
              <p className="text-sm text-gray-800 mt-1 truncate">
                {version.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="text-gray-500 hover:text-gray-700"
          >
            {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onExport}
            className="text-blue-600 hover:text-blue-800"
            title="Export this version"
          >
            <Download className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onRestore}
            className="text-green-600 hover:text-green-800"
            title="Restore this version"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-red-600 hover:text-red-800"
            title="Delete this version"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {showDetails && (
        <div className="mt-4 pt-4 border-t">
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Configuration Preview</h4>
              <div className="bg-gray-100 rounded p-3 max-h-40 overflow-y-auto">
                <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                  {JSON.stringify(version.data, null, 2)}
                </pre>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Timetoken: {version.timetoken}</span>
              <span>Published: {new Date(version.timestamp).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}