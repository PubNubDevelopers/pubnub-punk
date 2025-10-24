import { useState } from 'react';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface DeleteAllConfigDialogProps {
  isOpen: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isDeleting: boolean;
}

export function DeleteAllConfigDialog({
  isOpen,
  onConfirm,
  onCancel,
  isDeleting
}: DeleteAllConfigDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const [acknowledgeWarnings, setAcknowledgeWarnings] = useState(false);
  
  const canProceed = confirmText === 'DELETE ALL' && acknowledgeWarnings && !isDeleting;

  const handleConfirm = async () => {
    if (canProceed) {
      await onConfirm();
      // Reset form after completion
      setConfirmText('');
      setAcknowledgeWarnings(false);
    }
  };

  const handleCancel = () => {
    setConfirmText('');
    setAcknowledgeWarnings(false);
    onCancel();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <span>Delete All Configuration Data</span>
          </DialogTitle>
          <DialogDescription>
            This action will permanently delete ALL configuration data from this application.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning List */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-medium text-red-800 mb-2">This will permanently delete:</h4>
            <ul className="text-sm text-red-700 space-y-1">
              <li>• All local configuration data and preferences</li>
              <li>• All version history from PubNub Persistence</li>
              <li>• All App Context metadata</li>
              <li>• Settings for all pages (Settings, Pub/Sub, Presence, etc.)</li>
            </ul>
          </div>

          {/* Critical Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-amber-800 font-medium">Cannot be undone!</p>
                <p className="text-amber-700 mt-1">
                  This will reset the entire application to a vanilla state. 
                  You will need to reconfigure all settings from scratch.
                </p>
              </div>
            </div>
          </div>

          {/* Acknowledgment Checkbox */}
          <div className="flex items-start space-x-2">
            <Checkbox 
              id="acknowledge"
              checked={acknowledgeWarnings}
              onCheckedChange={(checked) => setAcknowledgeWarnings(checked === true)}
              disabled={isDeleting}
            />
            <Label 
              htmlFor="acknowledge" 
              className="text-sm text-gray-700 leading-relaxed cursor-pointer"
            >
              I understand this action is permanent and cannot be undone. 
              I want to delete ALL configuration data.
            </Label>
          </div>

          {/* Confirmation Input */}
          <div className="space-y-2">
            <Label htmlFor="confirm-text" className="text-sm font-medium">
              Type <code className="bg-gray-100 px-1 rounded">DELETE ALL</code> to confirm:
            </Label>
            <Input
              id="confirm-text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE ALL"
              disabled={isDeleting}
              className="font-mono"
            />
          </div>

          <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
            <strong>Note:</strong> This tool clears locally stored configuration data. 
            Remote PubNub cleanup steps are currently disabled for safety.
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            disabled={isDeleting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!canProceed}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete All Data
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
