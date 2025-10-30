import { 
  Trash2, 
  AlertCircle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { MessageDeleteRequest, FetchProgress } from '@/types/persistence';
import { formatTimetoken } from '@/lib/persistence/utils';

interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedMessage: MessageDeleteRequest | null;
  onConfirmDelete: () => void;
}

export function DeleteMessageDialog({
  open,
  onOpenChange,
  selectedMessage,
  onConfirmDelete,
}: DeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Message from History</DialogTitle>
          <DialogDescription>
            This will permanently delete the selected message from PubNub Message Persistence. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <div><strong>Channel:</strong> {selectedMessage?.channel}</div>
            <div><strong>Timetoken:</strong> {selectedMessage?.timetoken}</div>
            <div><strong>Timestamp:</strong> {selectedMessage?.timetoken && formatTimetoken(selectedMessage.timetoken)}</div>
          </div>
          
          <div className="bg-orange-50 border border-orange-200 rounded p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-orange-800">Requirements:</p>
                <p className="text-orange-700">This operation requires <strong>Delete-From-History</strong> to be enabled in your PubNub Dashboard.</p>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirmDelete} className="bg-red-600 hover:bg-red-700">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface MessageCountsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageCounts: Record<string, number>;
  range?: {
    start?: string;
    end?: string;
    startTimetoken?: string;
    endTimetoken?: string;
  };
}

export function MessageCountsDialog({
  open,
  onOpenChange,
  messageCounts,
  range,
}: MessageCountsDialogProps) {
  const formatDate = (value?: string) => {
    if (!value) return null;
    try {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toLocaleString();
      }
    } catch {
      // ignore parse errors
    }
    return value;
  };

  const startDisplay = formatDate(range?.start);
  const endDisplay = formatDate(range?.end);

  const startLabel = startDisplay ?? range?.startTimetoken ?? 'the first date found';
  const endLabel = endDisplay ?? range?.endTimetoken ?? 'the last date found';
  const hasAdvancedRange = Boolean(startDisplay || endDisplay || range?.startTimetoken || range?.endTimetoken);

  const description = hasAdvancedRange
    ? `Number of messages stored in each channel between ${startLabel} and ${endLabel} as specified in the Advanced Options panel.`
    : 'Number of messages stored in each channel between the first date found and the last date found.';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Message Counts</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {Object.entries(messageCounts).map(([channel, count]) => (
            <div key={channel} className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="font-mono">#{channel}</span>
              <span className="font-semibold">{count.toLocaleString()} messages</span>
            </div>
          ))}
          {Object.keys(messageCounts).length === 0 && (
            <div className="text-center text-gray-500 py-4">
              No message count data available
            </div>
          )}
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

interface FetchProgressDialogProps {
  open: boolean;
  progress: FetchProgress;
  selectedChannels: string;
  count: number;
}

export function FetchProgressDialog({
  open,
  progress,
  selectedChannels,
  count,
}: FetchProgressDialogProps) {
  const channelCount = selectedChannels.split(',').length;
  
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fetching Message History</DialogTitle>
          <DialogDescription>
            Retrieving {count} messages from {channelCount} channel{channelCount !== 1 ? 's' : ''}...
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{progress.current} of {progress.total} messages</span>
            </div>
            <Progress 
              value={(progress.current / progress.total) * 100} 
              className="w-full"
            />
          </div>
          
          {progress.currentChannel && (
            <div className="space-y-2">
              <div className="space-y-1">
                <div className="text-sm font-medium">Current Channel:</div>
                <div className="text-sm text-gray-600 font-mono">#{progress.currentChannel}</div>
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Batch Progress</span>
                  <span>{progress.currentBatch} of {progress.totalBatches} batches</span>
                </div>
                <Progress 
                  value={(progress.currentBatch / progress.totalBatches) * 100} 
                  className="w-full h-2"
                />
              </div>
            </div>
          )}
          
          <div className="text-xs text-gray-500">
            Each batch fetches up to 100 messages due to API limitations.
          </div>
        </div>
        
        <DialogFooter>
          <div className="text-sm text-gray-500">
            Please do not close this window during the fetch operation.
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
