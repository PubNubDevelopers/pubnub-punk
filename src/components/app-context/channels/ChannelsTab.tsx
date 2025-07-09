import { Users } from 'lucide-react';
import { ChannelMetadata, AppContextPageSettings } from '@/types/app-context';
import { DataTable } from '../shared/DataTable';
import { SearchAndFilters } from '../shared/SearchAndFilters';
import { BulkActions } from '../shared/BulkActions';
import { LoadingProgressComponent } from '../shared/LoadingProgress';

interface ChannelsTabProps {
  channels: ChannelMetadata[];
  selectedItems: Set<string>;
  pageSettings: AppContextPageSettings;
  loading: boolean;
  loadingProgress: any;
  onUpdateField: (path: string, value: any) => void;
  onItemSelection: (itemId: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onSort: (column: string) => void;
  onCreateNew: () => void;
  onBulkDelete: () => void;
  onEdit: (channel: ChannelMetadata) => void;
  onDelete: (channel: ChannelMetadata) => void;
  onCopy: (text: string) => void;
  onViewMembers: (channel: ChannelMetadata) => void;
}

export function ChannelsTab({
  channels,
  selectedItems,
  pageSettings,
  loading,
  loadingProgress,
  onUpdateField,
  onItemSelection,
  onSelectAll,
  onClearSelection,
  onSort,
  onCreateNew,
  onBulkDelete,
  onEdit,
  onDelete,
  onCopy,
  onViewMembers
}: ChannelsTabProps) {
  const columns = [
    {
      key: 'id',
      label: 'Channel ID',
      sortable: true,
      width: '200px'
    },
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      width: '200px',
      render: (channel: ChannelMetadata) => (
        <div>
          <div className="font-medium">{channel.name || '-'}</div>
          {channel.type && (
            <div className="text-xs text-gray-500">
              Type: {channel.type}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'description',
      label: 'Description',
      sortable: false,
      width: '300px',
      render: (channel: ChannelMetadata) => (
        <div>
          <div className="truncate">{channel.description || '-'}</div>
          {channel.status && (
            <div className="text-xs text-gray-500">
              Status: {channel.status}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'updated',
      label: 'Updated',
      sortable: true,
      width: '150px'
    }
  ];

  const handlePageChange = (page: number) => {
    onUpdateField('appContext.currentPage', page);
  };

  const handlePageSizeChange = (size: number) => {
    onUpdateField('appContext.pageSize', size);
    onUpdateField('appContext.currentPage', 1);
  };

  const handleSearchChange = (value: string) => {
    onUpdateField('appContext.searchTerm', value);
    onUpdateField('appContext.currentPage', 1);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        {loadingProgress ? (
          <LoadingProgressComponent progress={loadingProgress} />
        ) : (
          <div className="text-center py-8">
            <p>Loading channels...</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Controls */}
      <div className="p-6 border-b space-y-4">
        <SearchAndFilters
          searchTerm={pageSettings.appContext.searchTerm}
          pageSize={pageSettings.appContext.pageSize}
          selectedTab="channels"
          onSearchChange={handleSearchChange}
          onPageSizeChange={handlePageSizeChange}
        />

        <BulkActions
          selectedTab="channels"
          selectedCount={selectedItems.size}
          onCreateNew={onCreateNew}
          onClearSelection={onClearSelection}
          onBulkDelete={onBulkDelete}
        />
      </div>

      {/* Data Table */}
      <DataTable
        data={channels}
        columns={columns}
        selectedItems={selectedItems}
        sortBy={pageSettings.appContext.sortBy}
        sortOrder={pageSettings.appContext.sortOrder}
        currentPage={pageSettings.appContext.currentPage}
        pageSize={pageSettings.appContext.pageSize}
        tab="channels"
        onItemSelection={onItemSelection}
        onSelectAll={onSelectAll}
        onClearSelection={onClearSelection}
        onSort={onSort}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onEdit={onEdit}
        onDelete={onDelete}
        onCopy={onCopy}
        onSpecialAction={onViewMembers}
        specialActionIcon={<Users className="w-4 h-4" />}
        specialActionLabel="Members"
      />
    </div>
  );
}