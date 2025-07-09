import { useState } from 'react';
import { Users, Trash2, Edit, MoreVertical, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChannelMemberData } from '@/types/app-context';
import { formatDate } from '@/utils/app-context';

interface ChannelMembersViewProps {
  channelMembers: ChannelMemberData[];
  selectedMembers: Set<string>;
  channelId: string;
  channelName?: string;
  loading: boolean;
  onToggleSelection: (userId: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkDelete: () => void;
  onEdit: (member: ChannelMemberData) => void;
  onDeleteSingle: (userId: string) => void;
  onClose: () => void;
}

export function ChannelMembersView({
  channelMembers,
  selectedMembers,
  channelId,
  channelName,
  loading,
  onToggleSelection,
  onSelectAll,
  onClearSelection,
  onBulkDelete,
  onEdit,
  onDeleteSingle,
  onClose
}: ChannelMembersViewProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            Channel Members: {channelName || channelId}
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
        {!loading && channelMembers.length > 0 && (
          <div className="px-4 py-2 bg-gray-50 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              {selectedMembers.size > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearSelection}
                >
                  Clear
                </Button>
              )}

              {selectedMembers.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onBulkDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove Selected ({selectedMembers.size})
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={onSelectAll}
                disabled={channelMembers.length === 0}
              >
                Select All
              </Button>

              {selectedMembers.size > 0 && (
                <div className="text-sm text-gray-600">
                  {selectedMembers.size} selected
                </div>
              )}
            </div>

            <div className="text-sm text-gray-600">
              {channelMembers.length} member{channelMembers.length === 1 ? '' : 's'}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 p-4">
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p>Loading channel members...</p>
            </div>
          ) : channelMembers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Channel has no members</p>
            </div>
          ) : (
            <div className="space-y-2">
              {channelMembers.map((member, index) => {
                const userId = member.uuid.id;
                return (
                  <div
                    key={`member-${userId}-${index}`}
                    className="flex items-center gap-3 p-3 bg-white border rounded-lg hover:bg-gray-50"
                  >
                    <Checkbox
                      checked={selectedMembers.has(userId)}
                      onCheckedChange={() => onToggleSelection(userId)}
                      className="data-[state=checked]:bg-pubnub-blue data-[state=checked]:border-pubnub-blue"
                    />
                    
                    <div className="flex-1">
                      <div className="font-medium text-pubnub-blue">{userId}</div>
                      <div className="text-sm text-gray-600">{member.uuid.name || 'No name'}</div>
                      {member.uuid.email && (
                        <div className="text-xs text-gray-500 mt-1">{member.uuid.email}</div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-gray-400">
                        {formatDate(member.updated)}
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(member)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Member
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => onDeleteSingle(userId)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remove Member
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