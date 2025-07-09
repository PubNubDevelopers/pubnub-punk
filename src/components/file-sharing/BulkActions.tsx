import { ChevronDown, Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface BulkActionsProps {
  selectedFilesCount: number;
  totalFilesCount: number;
  pageSize: number;
  onSelectAllVisible: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkDelete: () => void;
  onBulkDownload: () => void;
  onShowSelectAllWarning: () => void;
}

export function BulkActions({
  selectedFilesCount,
  totalFilesCount,
  pageSize,
  onSelectAllVisible,
  onSelectAll,
  onClearSelection,
  onBulkDelete,
  onBulkDownload,
  onShowSelectAllWarning
}: BulkActionsProps) {
  return (
    <div className="flex items-center gap-2">
      {selectedFilesCount > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={onClearSelection}
        >
          Clear
        </Button>
      )}
      
      <Button
        variant="outline"
        size="sm"
        onClick={onSelectAllVisible}
        disabled={totalFilesCount === 0}
      >
        Select Visible
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          if (totalFilesCount > pageSize) {
            onShowSelectAllWarning();
          } else {
            onSelectAll();
          }
        }}
        disabled={totalFilesCount === 0}
      >
        Select All
      </Button>

      {/* Actions Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={selectedFilesCount === 0}
          >
            Actions
            <ChevronDown className="w-4 h-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            disabled={selectedFilesCount === 0}
            className="text-red-600"
            onClick={onBulkDelete}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Selected ({selectedFilesCount})
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={selectedFilesCount === 0}
            onClick={onBulkDownload}
          >
            <Download className="w-4 h-4 mr-2" />
            Download Selected ({selectedFilesCount})
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}