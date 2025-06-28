import { useState } from 'react';
import { Save } from 'lucide-react';
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

interface SaveConfigDialogProps {
  isOpen: boolean;
  onConfirm: (configName: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function SaveConfigDialog({
  isOpen,
  onConfirm,
  onCancel,
  isLoading = false
}: SaveConfigDialogProps) {
  const [configName, setConfigName] = useState('');
  
  // Generate default name in HH:MM YYYY-MM-DD format
  const generateDefaultName = () => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    
    return `${hours}:${minutes} ${year}-${month}-${day}`;
  };

  const handleConfirm = () => {
    const finalName = configName.trim() || generateDefaultName();
    onConfirm(finalName);
    setConfigName(''); // Reset for next time
  };

  const handleCancel = () => {
    setConfigName(''); // Reset on cancel
    onCancel();
  };

  const defaultName = generateDefaultName();

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Save className="h-5 w-5 text-blue-600" />
            <span>Save Configuration</span>
          </DialogTitle>
          <DialogDescription>
            Give this configuration a name to help you identify it later. Leave blank to use the current timestamp.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="config-name">Configuration Name</Label>
            <Input
              id="config-name"
              value={configName}
              onChange={(e) => setConfigName(e.target.value)}
              placeholder={`Default: ${defaultName}`}
              maxLength={100}
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500">
              {configName.trim() ? 
                `Will save as: "${configName.trim()}"` : 
                `Will save as: "${defaultName}"`
              }
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? 'Saving...' : 'Save Configuration'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}