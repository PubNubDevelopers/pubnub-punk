import { File, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { FileItem } from './FileItem';
import { FileListHeader } from './FileListHeader';
import { Pagination } from './Pagination';
import { FileItem as FileItemType } from './types';

interface FileListProps {
  files: FileItemType[];
  selectedFiles: Set<string>;
  onToggleSelection: (fileId: string) => void;
  onCopyUrl: (file: FileItemType) => void;
  onSort: (column: string) => void;
  sortBy: string;
  sortOrder: string;
  viewMode: string;
  loading: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  allVisibleSelected: boolean;
  onSelectAllVisible: () => void;
  onClearSelection: () => void;
  showPagination: boolean;
}

export function FileList({
  files,
  selectedFiles,
  onToggleSelection,
  onCopyUrl,
  onSort,
  sortBy,
  sortOrder,
  viewMode,
  loading,
  currentPage,
  totalPages,
  onPageChange,
  allVisibleSelected,
  onSelectAllVisible,
  onClearSelection,
  showPagination
}: FileListProps) {
  if (loading) {
    return (
      <Card className="flex-1 flex flex-col">
        <CardContent className="p-8 text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading files...</p>
        </CardContent>
      </Card>
    );
  }

  if (files.length === 0) {
    return (
      <Card className="flex-1 flex flex-col">
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="p-8 text-center">
            <File className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No files found</h3>
            <p className="text-gray-500">Upload files to get started</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (viewMode === 'list') {
    return (
      <Card className="flex-1 flex flex-col">
        <CardContent className="p-0 flex-1 flex flex-col">
          <FileListHeader
            allVisibleSelected={allVisibleSelected}
            onSelectAllVisible={onSelectAllVisible}
            onClearSelection={onClearSelection}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={onSort}
          />
          
          {showPagination && (
            <div className="border-b p-4">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={onPageChange}
              />
            </div>
          )}
          
          <div className="flex-1 divide-y overflow-y-auto">
            {files.map((file) => (
              <FileItem
                key={file.id}
                file={file}
                selected={selectedFiles.has(file.id)}
                onToggleSelection={onToggleSelection}
                onCopyUrl={onCopyUrl}
                isGalleryMode={false}
              />
            ))}
          </div>
        </CardContent>
        
        {showPagination && (
          <div className="border-t p-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={onPageChange}
            />
          </div>
        )}
      </Card>
    );
  }

  // Gallery View
  return (
    <Card className="flex-1 flex flex-col">
      <CardContent className="p-0 flex-1 flex flex-col">
        {/* Gallery Header */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
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
              <span className="text-sm font-medium text-gray-600">
                {selectedFiles.size > 0 ? `${selectedFiles.size} selected` : 'Select All'}
              </span>
            </div>
            
            {/* Sort controls for gallery */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Sort by:</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSort('name')}
                className={`text-xs ${sortBy === 'name' ? 'text-pubnub-blue' : 'text-gray-600'}`}
              >
                Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSort('created')}
                className={`text-xs ${sortBy === 'created' ? 'text-pubnub-blue' : 'text-gray-600'}`}
              >
                Date {sortBy === 'created' && (sortOrder === 'asc' ? '↑' : '↓')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSort('size')}
                className={`text-xs ${sortBy === 'size' ? 'text-pubnub-blue' : 'text-gray-600'}`}
              >
                Size {sortBy === 'size' && (sortOrder === 'asc' ? '↑' : '↓')}
              </Button>
            </div>
          </div>
        </div>

        {showPagination && (
          <div className="border-b p-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={onPageChange}
            />
          </div>
        )}

        {/* Gallery Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {files.map((file) => (
              <FileItem
                key={file.id}
                file={file}
                selected={selectedFiles.has(file.id)}
                onToggleSelection={onToggleSelection}
                onCopyUrl={onCopyUrl}
                isGalleryMode={true}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}