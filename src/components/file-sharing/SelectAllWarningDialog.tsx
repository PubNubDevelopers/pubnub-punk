import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface SelectAllWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  totalCount: number;
  visibleCount: number;
  searchTerm: string;
  selectedChannel: string;
}

export function SelectAllWarningDialog({
  open,
  onOpenChange,
  onConfirm,
  totalCount,
  visibleCount,
  searchTerm,
  selectedChannel
}: SelectAllWarningDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select All {searchTerm ? 'Filtered ' : ''}Files?</DialogTitle>
          <DialogDescription>
            This will select all {totalCount} {searchTerm ? 'filtered ' : ''}files{searchTerm ? ` matching "${searchTerm}"` : ` in the "${selectedChannel}" channel`}, not just the {visibleCount} files displayed on this page.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm} className="bg-pubnub-red hover:bg-pubnub-red/90">
            Select All {totalCount} Files
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}