import { RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { DeleteProgress } from './types';

interface BulkDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  selectedCount: number;
  selectedChannel: string;
  deleting: boolean;
  deleteProgress: DeleteProgress;
}

export function BulkDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  selectedCount,
  selectedChannel,
  deleting,
  deleteProgress
}: BulkDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Selected Files?</DialogTitle>
          <DialogDescription>
            This will permanently delete {selectedCount} selected file{selectedCount === 1 ? '' : 's'} from the "{selectedChannel}" channel. This action cannot be undone.
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
          <Button 
            variant="outline" 
            onClick={onCancel}
          >
            {deleting ? 'Cancel' : 'Cancel'}
          </Button>
          <Button 
            onClick={onConfirm} 
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
                Delete {selectedCount} File{selectedCount === 1 ? '' : 's'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}