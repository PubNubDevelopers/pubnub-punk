import { UserCheck } from 'lucide-react';
import { UserMetadata, AppContextPageSettings } from '@/types/app-context';
import { DataTable } from '../shared/DataTable';
import { SearchAndFilters } from '../shared/SearchAndFilters';
import { BulkActions } from '../shared/BulkActions';
import { LoadingProgressComponent } from '../shared/LoadingProgress';
import { formatDate } from '@/utils/app-context';

interface UsersTabProps {
  users: UserMetadata[];
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
  onEdit: (user: UserMetadata) => void;
  onDelete: (user: UserMetadata) => void;
  onCopy: (text: string) => void;
  onViewMemberships: (user: UserMetadata) => void;
}

export function UsersTab({
  users,
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
  onViewMemberships
}: UsersTabProps) {
  const columns = [
    {
      key: 'id',
      label: 'User ID',
      sortable: true,
      className: 'flex items-center gap-1 hover:text-gray-900 transition-colors text-left'
    },
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      className: 'flex items-center gap-1 hover:text-gray-900 transition-colors text-left'
    },
    {
      key: 'email',
      label: 'Email',
      sortable: false,
      className: ''
    },
    {
      key: 'updated',
      label: 'Updated',
      sortable: true,
      className: 'flex items-center gap-1 hover:text-gray-900 transition-colors text-left'
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
            <p>Loading users...</p>
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
          selectedTab="users"
          onSearchChange={handleSearchChange}
          onPageSizeChange={handlePageSizeChange}
        />

        <BulkActions
          selectedTab="users"
          selectedCount={selectedItems.size}
          onCreateNew={onCreateNew}
          onClearSelection={onClearSelection}
          onBulkDelete={onBulkDelete}
        />
      </div>

      {/* Data Table */}
      <DataTable
        data={users}
        columns={columns}
        selectedItems={selectedItems}
        sortBy={pageSettings.appContext.sortBy}
        sortOrder={pageSettings.appContext.sortOrder}
        currentPage={pageSettings.appContext.currentPage}
        pageSize={pageSettings.appContext.pageSize}
        tab="users"
        onItemSelection={onItemSelection}
        onSelectAll={onSelectAll}
        onClearSelection={onClearSelection}
        onSort={onSort}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onEdit={onEdit}
        onDelete={onDelete}
        onCopy={onCopy}
        onSpecialAction={onViewMemberships}
        specialActionIcon={<UserCheck className="w-4 h-4" />}
        specialActionLabel="Memberships"
      />
    </div>
  );
}