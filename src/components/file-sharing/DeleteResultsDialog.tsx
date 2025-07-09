import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { DeleteResults } from './types';

interface DeleteResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  results: DeleteResults;
  selectedChannel: string;
  onCopyLog: () => void;
}

export function DeleteResultsDialog({
  open,
  onOpenChange,
  results,
  selectedChannel,
  onCopyLog
}: DeleteResultsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            results.cancelled > 0 ? 'grid-cols-4' : 'grid-cols-3'
          }`}>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{results.successful}</div>
              <div className="text-sm text-gray-600">Successful</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{results.failed}</div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
            {results.cancelled > 0 && (
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{results.cancelled}</div>
                <div className="text-sm text-gray-600">Cancelled</div>
              </div>
            )}
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{results.successful + results.failed + results.cancelled}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
          </div>

          {/* Error Details */}
          {results.errors.length > 0 && (
            <div>
              <h4 className="font-medium mb-2 text-red-600">Failed Deletions:</h4>
              <div className="max-h-32 overflow-y-auto bg-red-50 p-3 rounded border">
                {results.errors.map((error, index) => (
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
                onClick={onCopyLog}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Log
              </Button>
            </div>
            <textarea
              value={results.fullLog}
              readOnly
              className="w-full h-64 p-3 text-sm font-mono bg-gray-50 border rounded resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}