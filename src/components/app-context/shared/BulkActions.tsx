import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppContextTab } from '@/types/app-context';

interface BulkActionsProps {
  selectedTab: AppContextTab;
  selectedCount: number;
  onCreateNew: () => void;
  onClearSelection: () => void;
  onBulkDelete: () => void;
}

export function BulkActions({
  selectedTab,
  selectedCount,
  onCreateNew,
  onClearSelection,
  onBulkDelete
}: BulkActionsProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {selectedCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearSelection}
          >
            Clear
          </Button>
        )}

        {selectedCount > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onBulkDelete}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Selected ({selectedCount})
          </Button>
        )}
      </div>

      <Button
        onClick={onCreateNew}
        className="bg-blue-600 hover:bg-blue-700"
        size="sm"
      >
        <Plus className="w-4 h-4 mr-2" />
        New {selectedTab === 'users' ? 'User' : 'Channel'}
      </Button>
    </div>
  );
}