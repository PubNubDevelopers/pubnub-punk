import { useState } from 'react';
import { UserPlus, Trash2, Edit, MoreVertical, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MembershipData } from '@/types/app-context';
import { formatDate } from '@/utils/app-context';

interface MembershipsViewProps {
  memberships: MembershipData[];
  selectedMemberships: Set<string>;
  userId: string;
  userName?: string;
  loading: boolean;
  onToggleSelection: (channelId: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkDelete: () => void;
  onEdit: (membership: MembershipData) => void;
  onDeleteSingle: (channelId: string) => void;
  onClose: () => void;
}

export function MembershipsView({
  memberships,
  selectedMemberships,
  userId,
  userName,
  loading,
  onToggleSelection,
  onSelectAll,
  onClearSelection,
  onBulkDelete,
  onEdit,
  onDeleteSingle,
  onClose
}: MembershipsViewProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            User Memberships: {userName || userId}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 flex flex-col">
        {/* Selection Controls */}
        {!loading && memberships.length > 0 && (
          <div className="px-4 py-2 bg-gray-50 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              {selectedMemberships.size > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearSelection}
                >
                  Clear
                </Button>
              )}

              {selectedMemberships.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onBulkDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected ({selectedMemberships.size})
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={onSelectAll}
                disabled={memberships.length === 0}
              >
                Select All
              </Button>

              {selectedMemberships.size > 0 && (
                <div className="text-sm text-gray-600">
                  {selectedMemberships.size} selected
                </div>
              )}
            </div>

            <div className="text-sm text-gray-600">
              {memberships.length} membership{memberships.length === 1 ? '' : 's'}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 p-4">
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p>Loading memberships...</p>
            </div>
          ) : memberships.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <UserPlus className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>User has no channel memberships</p>
            </div>
          ) : (
            <div className="space-y-2">
              {memberships.map((membership, index) => {
                const channelId = membership.channel.id;
                return (
                  <div
                    key={`membership-${channelId}-${index}`}
                    className="flex items-center gap-3 p-3 bg-white border rounded-lg hover:bg-gray-50"
                  >
                    <Checkbox
                      checked={selectedMemberships.has(channelId)}
                      onCheckedChange={() => onToggleSelection(channelId)}
                      className="data-[state=checked]:bg-pubnub-blue data-[state=checked]:border-pubnub-blue"
                    />
                    
                    <div className="flex-1">
                      <div className="font-medium text-pubnub-blue">{channelId}</div>
                      <div className="text-sm text-gray-600">{membership.channel.name || 'No name'}</div>
                      {membership.channel.description && (
                        <div className="text-xs text-gray-500 mt-1">{membership.channel.description}</div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-gray-400">
                        {formatDate(membership.updated)}
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(membership)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Membership
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => onDeleteSingle(channelId)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remove Membership
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}