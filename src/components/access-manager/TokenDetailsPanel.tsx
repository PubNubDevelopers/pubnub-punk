import { Key, Shield, Hash, Layers, Users, FileText, Copy, CheckCircle2, Lock, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { TokenData } from '@/types/access-manager';

interface TokenDetailsPanelProps {
  token: TokenData;
  onCopy: (text: string, description: string) => void;
  isExpired: boolean;
  formatTimestamp: (timestamp: string) => string;
}

export function TokenDetailsPanel({
  token,
  onCopy,
  isExpired,
  formatTimestamp
}: TokenDetailsPanelProps) {
  return (
    <div className="space-y-4">
      {/* Token Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              {token.description || `Token ${token.id.slice(-4)}`}
            </div>
            <div className="flex items-center gap-2">
              {token.status === 'active' && !isExpired && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                  <CheckCircle2 className="h-3 w-3" />
                  Active
                </span>
              )}
              {token.status === 'revoked' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                  <Lock className="h-3 w-3" />
                  Revoked
                </span>
              )}
              {isExpired && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full">
                  <Clock className="h-3 w-3" />
                  Expired
                </span>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">Created</Label>
              <p className="text-sm text-gray-900">{formatTimestamp(token.createdAt)}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Expires</Label>
              <p className="text-sm text-gray-900">{formatTimestamp(token.expiresAt)}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">TTL</Label>
              <p className="text-sm text-gray-900">{token.ttl} minutes</p>
            </div>
            {token.authorizedUserId && (
              <div>
                <Label className="text-sm font-medium text-gray-700">Authorized User</Label>
                <p className="text-sm text-gray-900">{token.authorizedUserId}</p>
              </div>
            )}
          </div>
          
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium text-gray-700">Token</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCopy(token.token, 'Token')}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs break-all">
              {token.token}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permissions */}
      {(token.permissions.channels || token.permissions.channelGroups || token.permissions.uuids) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Resource Permissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {token.permissions.channels && Object.keys(token.permissions.channels).length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Channels
                  </Label>
                  <div className="mt-2 space-y-2">
                    {Object.entries(token.permissions.channels).map(([channel, perms]) => (
                      <div key={channel} className="border rounded-lg p-3">
                        <div className="font-medium text-sm mb-2">{channel}</div>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(perms).map(([perm, granted]) => (
                            granted && (
                              <span key={perm} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                {perm}
                              </span>
                            )
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {token.permissions.channelGroups && Object.keys(token.permissions.channelGroups).length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Channel Groups
                  </Label>
                  <div className="mt-2 space-y-2">
                    {Object.entries(token.permissions.channelGroups).map(([group, perms]) => (
                      <div key={group} className="border rounded-lg p-3">
                        <div className="font-medium text-sm mb-2">{group}</div>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(perms).map(([perm, granted]) => (
                            granted && (
                              <span key={perm} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                {perm}
                              </span>
                            )
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {token.permissions.uuids && Object.keys(token.permissions.uuids).length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    UUIDs
                  </Label>
                  <div className="mt-2 space-y-2">
                    {Object.entries(token.permissions.uuids).map(([uuid, perms]) => (
                      <div key={uuid} className="border rounded-lg p-3">
                        <div className="font-medium text-sm mb-2">{uuid}</div>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(perms).map(([perm, granted]) => (
                            granted && (
                              <span key={perm} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                                {perm}
                              </span>
                            )
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pattern Permissions */}
      {token.patterns && (token.patterns.channels || token.patterns.channelGroups || token.patterns.uuids) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Pattern Permissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {token.patterns.channels && Object.keys(token.patterns.channels).length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-700">Channel Patterns</Label>
                  <div className="mt-2 space-y-2">
                    {Object.entries(token.patterns.channels).map(([pattern, perms]) => (
                      <div key={pattern} className="border rounded-lg p-3">
                        <div className="font-mono text-sm mb-2 bg-gray-100 px-2 py-1 rounded">{pattern}</div>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(perms).map(([perm, granted]) => (
                            granted && (
                              <span key={perm} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                {perm}
                              </span>
                            )
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      {token.meta && Object.keys(token.meta).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Metadata
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-gray-50 p-3 rounded border overflow-auto">
              {JSON.stringify(token.meta, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}