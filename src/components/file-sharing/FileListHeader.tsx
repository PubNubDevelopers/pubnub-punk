import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface FileListHeaderProps {
  allVisibleSelected: boolean;
  onSelectAllVisible: () => void;
  onClearSelection: () => void;
  sortBy: string;
  sortOrder: string;
  onSort: (column: string) => void;
}

export function FileListHeader({
  allVisibleSelected,
  onSelectAllVisible,
  onClearSelection,
  sortBy,
  sortOrder,
  onSort
}: FileListHeaderProps) {
  const renderSortIcon = (column: string) => {
    if (sortBy === column) {
      return sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
    }
    return <ChevronsUpDown className="w-4 h-4 opacity-50" />;
  };

  return (
    <div className="grid grid-cols-[auto,1fr,100px,150px,auto] gap-4 p-4 border-b bg-gray-50 text-sm font-medium text-gray-600">
      <div className="flex items-center">
        <Checkbox
          checked={allVisibleSelected}
          onCheckedChange={(checked) => {
            if (checked) {
              onSelectAllVisible();
            } else {
              onClearSelection();
            }
          }}
          className="data-[state=checked]:bg-pubnub-blue data-[state=checked]:border-pubnub-blue"
        />
      </div>
      
      <button
        className="flex items-center gap-1 hover:text-gray-900 transition-colors text-left"
        onClick={() => onSort('name')}
      >
        Name
        {renderSortIcon('name')}
      </button>
      
      <button
        className="flex items-center gap-1 hover:text-gray-900 transition-colors text-left"
        onClick={() => onSort('size')}
      >
        Size
        {renderSortIcon('size')}
      </button>
      
      <button
        className="flex items-center gap-1 hover:text-gray-900 transition-colors text-left"
        onClick={() => onSort('created')}
      >
        Created
        {renderSortIcon('created')}
      </button>
      
      <div className="w-10"></div>
    </div>
  );
}