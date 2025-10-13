import { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, MoreVertical, Edit, Copy, Trash2, Users, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserMetadata, ChannelMetadata, AppContextTab, SortOrder } from '@/types/app-context';
import { formatDate, getItemKey } from '@/utils/app-context';

interface ColumnConfig {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  render?: (item: any, index: number) => React.ReactNode;
  className?: string;
}

interface DataTableProps {
  data: (UserMetadata | ChannelMetadata)[];
  columns: ColumnConfig[];
  selectedItems: Set<string>;
  sortBy: string;
  sortOrder: SortOrder;
  currentPage: number;
  pageSize: number;
  tab: AppContextTab;
  onItemSelection: (itemId: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onSort: (column: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onEdit: (item: UserMetadata | ChannelMetadata) => void;
  onDelete: (item: UserMetadata | ChannelMetadata) => void;
  onCopy: (text: string) => void;
  onSpecialAction?: (item: UserMetadata | ChannelMetadata) => void;
  specialActionIcon?: React.ReactNode;
  specialActionLabel?: string;
}

export function DataTable({
  data,
  columns,
  selectedItems,
  sortBy,
  sortOrder,
  currentPage,
  pageSize,
  tab,
  onItemSelection,
  onSelectAll,
  onClearSelection,
  onSort,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onDelete,
  onCopy,
  onSpecialAction,
  specialActionIcon,
  specialActionLabel
}: DataTableProps) {
  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = data.slice(startIndex, endIndex);

  // Use exact grid layout from original
  const gridCols = tab === 'users' 
    ? 'auto 200px 200px 200px 150px 100px auto'
    : 'auto 200px 200px 300px 150px 100px auto';

  const renderSortButton = (column: ColumnConfig) => {
    if (!column.sortable) return <div className={`${column.className} truncate`}>{column.label}</div>;

    return (
      <button
        className="flex items-center gap-1 hover:text-gray-900 transition-colors text-left min-w-0"
        onClick={() => onSort(column.key)}
      >
        <span className="truncate">{column.label}</span>
        {column.key === 'id' && (
          <>
            <Edit className="w-3 h-3 opacity-50 flex-shrink-0" aria-hidden="true" />
            <span className="sr-only">ID column is sortable</span>
          </>
        )}
        {sortBy === column.key && (
          sortOrder === 'asc' ? <ChevronUp className="w-4 h-4 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 flex-shrink-0" />
        )}
        {sortBy !== column.key && <ChevronsUpDown className="w-4 h-4 opacity-50 flex-shrink-0" />}
      </button>
    );
  };

  const renderCell = (item: UserMetadata | ChannelMetadata, column: ColumnConfig, index: number) => {
    if (column.render) {
      return column.render(item, index);
    }

    const value = (item as any)[column.key];
    
    if (column.key === 'updated') {
      return <div className="text-sm text-gray-600 min-w-0 pr-2 truncate" title={formatDate(value)}>{formatDate(value)}</div>;
    }

    if (column.key === 'id') {
      return (
        <div className="min-w-0 pr-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(item);
            }}
            className="text-blue-600 hover:text-blue-800 transition-colors text-left font-medium truncate block w-full"
            title={value}
          >
            {value}
          </button>
        </div>
      );
    }

    if (column.key === 'name') {
      if (tab === 'users') {
        const user = item as UserMetadata;
        return (
          <div className="min-w-0 pr-2">
            <div className="font-medium truncate" title={user.name || '-'}>{user.name || '-'}</div>
            {user.externalId && (
              <div className="text-xs text-gray-500 truncate" title={`External ID: ${user.externalId}`}>
                External ID: {user.externalId}
              </div>
            )}
          </div>
        );
      } else {
        const channel = item as ChannelMetadata;
        return (
          <div className="min-w-0 pr-2">
            <div className="font-medium truncate" title={channel.name || '-'}>{channel.name || '-'}</div>
            {channel.type && (
              <div className="text-xs text-gray-500 truncate" title={`Type: ${channel.type}`}>
                Type: {channel.type}
              </div>
            )}
          </div>
        );
      }
    }

    if (column.key === 'email') {
      const user = item as UserMetadata;
      return (
        <div className="min-w-0 pr-2">
          <div className="truncate" title={user.email || '-'}>{user.email || '-'}</div>
          {user.profileUrl && (
            <div className="text-xs text-gray-500">
              <a href={user.profileUrl} target="_blank" rel="noopener noreferrer" className="hover:underline truncate block">
                Profile URL
              </a>
            </div>
          )}
        </div>
      );
    }

    if (column.key === 'description') {
      const channel = item as ChannelMetadata;
      return (
        <div className="min-w-0 pr-2">
          <div className="truncate" title={channel.description || '-'}>{channel.description || '-'}</div>
          {channel.status && (
            <div className="text-xs text-gray-500 truncate" title={`Status: ${channel.status}`}>
              Status: {channel.status}
            </div>
          )}
        </div>
      );
    }

    return <div className="min-w-0 pr-2 truncate" title={value || '-'}>{value || '-'}</div>;
  };

  if (data.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="p-8 text-center">
          {tab === 'users' ? (
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          ) : (
            <Hash className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          )}
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No {tab} found
          </h3>
          <p className="text-gray-500">
            No {tab} have been created yet
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Column Headers */}
      <div 
        className={`grid gap-4 p-4 border-b bg-gray-50 text-sm font-medium text-gray-600`}
        style={{ gridTemplateColumns: gridCols }}
      >
        <div className="flex items-center">
          <Checkbox
            checked={paginatedData.length > 0 && paginatedData.every(item => selectedItems.has(getItemKey(item)))}
            onCheckedChange={(checked) => {
              if (checked) {
                onSelectAll();
              } else {
                onClearSelection();
              }
            }}
            className="data-[state=checked]:bg-pubnub-blue data-[state=checked]:border-pubnub-blue"
          />
        </div>
        
        {columns.map((column) => (
          <div key={column.key} className={`${column.className} min-w-0`}>
            {renderSortButton(column)}
          </div>
        ))}
        
        {onSpecialAction && (
          <div className="text-center">
            {specialActionLabel || 'Actions'}
          </div>
        )}
        
        <div className="w-10"></div>
      </div>

      {/* Data Rows */}
      <div className="flex-1 divide-y overflow-y-auto">
        {paginatedData.map((item, index) => {
          const itemKey = getItemKey(item);
          return (
            <div
              key={itemKey}
              className={`grid gap-4 p-4 items-center transition-colors cursor-pointer ${
                selectedItems.has(itemKey) 
                  ? 'bg-blue-50 hover:bg-blue-100' 
                  : 'bg-white hover:bg-gray-50'
              }`}
              style={{ gridTemplateColumns: gridCols }}
              onClick={() => onItemSelection(itemKey)}
            >
              <div 
                className="flex items-center"
                onClick={(e) => {
                  e.stopPropagation();
                  onItemSelection(itemKey);
                }}
              >
                <Checkbox
                  checked={selectedItems.has(itemKey)}
                  onCheckedChange={() => onItemSelection(itemKey)}
                  className="data-[state=checked]:bg-pubnub-blue data-[state=checked]:border-pubnub-blue"
                />
              </div>
              
              {columns.map((column) => (
                <div key={column.key} className={`${column.className} min-w-0`}>
                  {renderCell(item, column, index)}
                </div>
              ))}
              
              {onSpecialAction && (
                <div className="text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSpecialAction(item);
                    }}
                  >
                    {specialActionIcon}
                  </Button>
                </div>
              )}
              
              <div className="flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(item)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onCopy(item.id)}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy ID
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onDelete(item)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              Showing {startIndex + 1} to {Math.min(endIndex, data.length)} of {data.length} entries
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
            
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => onPageSizeChange(parseInt(value))}
            >
              <SelectTrigger className="w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="200">200</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}
