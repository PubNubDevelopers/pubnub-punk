import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ConfigVersion } from '@/lib/config-service';

interface VersionRestoreDialogProps {
  version: ConfigVersion;
  onConfirm: () => void;
  onCancel: () => void;
}

export function VersionRestoreDialog({
  version,
  onConfirm,
  onCancel
}: VersionRestoreDialogProps) {
  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <RotateCcw className="h-5 w-5 text-green-600" />
            <span>Restore Configuration Version</span>
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to restore this configuration version? This will create a new version with the restored settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Version Details */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center space-x-2">
              <Badge variant="default">Version {version.version}</Badge>
              <span className="text-sm text-gray-600">
                {formatDate(version.timestamp)}
              </span>
            </div>
            
            {version.description && (
              <div>
                <h4 className="text-sm font-medium text-gray-700">Description</h4>
                <p className="text-sm text-gray-600 mt-1">{version.description}</p>
              </div>
            )}
            
            <div>
              <h4 className="text-sm font-medium text-gray-700">Publisher</h4>
              <p className="text-sm text-gray-600 mt-1">{version.publisher}</p>
            </div>
          </div>

          {/* Configuration Preview */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Configuration Preview</h4>
            <div className="bg-gray-100 rounded p-3 max-h-48 overflow-y-auto">
              <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                {JSON.stringify(version.data, null, 2)}
              </pre>
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start space-x-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-amber-800 font-medium">Important</p>
              <p className="text-amber-700 mt-1">
                Restoring this version will:
              </p>
              <ul className="text-amber-700 mt-1 ml-4 list-disc">
                <li>Replace your current configuration</li>
                <li>Create a new version entry in history</li>
                <li>Apply these settings immediately</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm} className="bg-green-600 hover:bg-green-700">
            <RotateCcw className="h-4 w-4 mr-2" />
            Restore Version
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}