import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppContextTab } from '@/types/app-context';

interface SearchAndFiltersProps {
  searchTerm: string;
  pageSize: number;
  selectedTab: AppContextTab;
  onSearchChange: (value: string) => void;
  onPageSizeChange: (value: number) => void;
}

export function SearchAndFilters({
  searchTerm,
  pageSize,
  selectedTab,
  onSearchChange,
  onPageSizeChange
}: SearchAndFiltersProps) {
  return (
    <div className="flex items-center gap-4">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <Input
          placeholder={`Search ${selectedTab}...`}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Page Size Selector */}
      <div className="flex flex-col items-center">
        <Select
          value={pageSize.toString()}
          onValueChange={(value) => onPageSizeChange(parseInt(value))}
        >
          <SelectTrigger className="w-[70px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-gray-500 mt-1">per page</span>
      </div>
    </div>
  );
}