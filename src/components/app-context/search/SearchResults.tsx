import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserMetadata, ChannelMetadata } from '@/types/app-context';
import { formatDate } from '@/utils/app-context';
import { Copy, Edit, Eye, Trash2, Users, Hash } from 'lucide-react';

interface SearchResultsProps {
  type: 'users' | 'channels';
  results: (UserMetadata | ChannelMetadata)[];
  totalCount?: number;
  searchQuery?: string;
  hasMore?: boolean;
  onEdit?: (item: UserMetadata | ChannelMetadata) => void;
  onDelete?: (item: UserMetadata | ChannelMetadata) => void;
  onCopy?: (text: string) => void;
  onViewMemberships?: (user: UserMetadata) => void;
  onViewMembers?: (channel: ChannelMetadata) => void;
}

export function SearchResults({
  type,
  results,
  totalCount,
  searchQuery,
  hasMore,
  onEdit,
  onDelete,
  onCopy,
  onViewMemberships,
  onViewMembers
}: SearchResultsProps) {
  if (results.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="text-gray-500">
            <div className="text-lg mb-2">No results found</div>
            <div className="text-sm">
              Try adjusting your search criteria or check the filter syntax.
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {type === 'users' ? <Users className="w-5 h-5" /> : <Hash className="w-5 h-5" />}
          Search Results
          <Badge variant="outline">
            {results.length} {results.length === 1 ? 'result' : 'results'}
            {totalCount && totalCount > results.length && ` of ${totalCount.toLocaleString()}`}
          </Badge>
          {hasMore && (
            <Badge variant="secondary">
              Limited to {results.length.toLocaleString()}
            </Badge>
          )}
        </CardTitle>
        {searchQuery && (
          <CardDescription>
            Results for: <code className="bg-gray-100 px-1 rounded">{searchQuery}</code>
          </CardDescription>
        )}
        {hasMore && (
          <CardDescription className="text-amber-600">
            Showing first {results.length.toLocaleString()} of {totalCount?.toLocaleString()} results. 
            Use more specific search parameters to see complete results.
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {results.map((item) => (
            <div key={item.id} className="border rounded-lg p-4 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-lg">{item.name || item.id}</h3>
                    {item.name && item.name !== item.id && (
                      <Badge variant="secondary" className="text-xs">
                        {item.id}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                    {type === 'users' ? (
                      <>
                        {(item as UserMetadata).email && (
                          <div>
                            <strong>Email:</strong> {(item as UserMetadata).email}
                          </div>
                        )}
                        {(item as UserMetadata).externalId && (
                          <div>
                            <strong>External ID:</strong> {(item as UserMetadata).externalId}
                          </div>
                        )}
                        {(item as UserMetadata).status && (
                          <div>
                            <strong>Status:</strong> {(item as UserMetadata).status}
                          </div>
                        )}
                        {(item as UserMetadata).type && (
                          <div>
                            <strong>Type:</strong> {(item as UserMetadata).type}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {(item as ChannelMetadata).description && (
                          <div className="md:col-span-2">
                            <strong>Description:</strong> {(item as ChannelMetadata).description}
                          </div>
                        )}
                        {(item as ChannelMetadata).status && (
                          <div>
                            <strong>Status:</strong> {(item as ChannelMetadata).status}
                          </div>
                        )}
                        {(item as ChannelMetadata).type && (
                          <div>
                            <strong>Type:</strong> {(item as ChannelMetadata).type}
                          </div>
                        )}
                      </>
                    )}
                    <div>
                      <strong>Updated:</strong> {formatDate(item.updated)}
                    </div>
                  </div>

                  {item.custom && Object.keys(item.custom).length > 0 && (
                    <div className="text-sm">
                      <strong>Custom Fields:</strong>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(item.custom).map(([key, value]) => (
                          <Badge key={key} variant="outline" className="text-xs">
                            {key}: {String(value)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCopy?.(item.id)}
                    title="Copy ID"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  
                  {type === 'users' && onViewMemberships && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewMemberships(item as UserMetadata)}
                      title="View Memberships"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  )}
                  
                  {type === 'channels' && onViewMembers && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewMembers(item as ChannelMetadata)}
                      title="View Members"
                    >
                      <Users className="w-4 h-4" />
                    </Button>
                  )}
                  
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(item)}
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                  
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(item)}
                      title="Delete"
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}