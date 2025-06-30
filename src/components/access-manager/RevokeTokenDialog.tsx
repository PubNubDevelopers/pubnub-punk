import { RefreshCw, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DialogFooter } from '@/components/ui/dialog';

interface RevokeTokenDialogProps {
  revokeTokenInput: string;
  setRevokeTokenInput: (value: string) => void;
  onRevoke: () => void;
  isRevoking: boolean;
}

export function RevokeTokenDialog({
  revokeTokenInput,
  setRevokeTokenInput,
  onRevoke,
  isRevoking
}: RevokeTokenDialogProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="revokeToken">Token to Revoke</Label>
        <Textarea
          id="revokeToken"
          placeholder="Paste the token you want to revoke..."
          value={revokeTokenInput}
          onChange={(e) => setRevokeTokenInput(e.target.value)}
          rows={3}
        />
      </div>
      
      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
        <div className="flex items-center gap-2 text-red-800">
          <AlertCircle className="h-4 w-4" />
          <span className="font-medium">Warning</span>
        </div>
        <p className="text-sm text-red-700 mt-1">
          Revoking a token will immediately remove all permissions. This action cannot be undone.
        </p>
      </div>
      
      <DialogFooter>
        <Button variant="outline" onClick={() => setRevokeTokenInput('')}>
          Cancel
        </Button>
        <Button 
          variant="destructive" 
          onClick={onRevoke} 
          disabled={isRevoking || !revokeTokenInput.trim()}
        >
          {isRevoking ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Revoking...
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4 mr-2" />
              Revoke Token
            </>
          )}
        </Button>
      </DialogFooter>
    </div>
  );
}