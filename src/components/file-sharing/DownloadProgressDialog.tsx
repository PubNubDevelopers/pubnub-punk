import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { DownloadProgress } from './types';

interface DownloadProgressDialogProps {
  open: boolean;
  progress: DownloadProgress;
  selectedFilesCount: number;
}

export function DownloadProgressDialog({
  open,
  progress,
  selectedFilesCount
}: DownloadProgressDialogProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Downloading Files</DialogTitle>
          <DialogDescription>
            {progress.phase === 'downloading' 
              ? `Downloading ${selectedFilesCount} files and creating ZIP archive...`
              : 'Creating ZIP archive...'
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>
                {progress.phase === 'downloading' ? 'Download Progress' : 'Creating ZIP'}
              </span>
              <span>{progress.current} of {progress.total}</span>
            </div>
            <Progress 
              value={(progress.current / progress.total) * 100} 
              className="w-full"
            />
          </div>
          
          {progress.currentFile && progress.phase === 'downloading' && (
            <div className="space-y-1">
              <div className="text-sm font-medium">Currently downloading:</div>
              <div className="text-sm text-gray-600 truncate">{progress.currentFile}</div>
            </div>
          )}

          {progress.phase === 'zipping' && (
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
  );
}