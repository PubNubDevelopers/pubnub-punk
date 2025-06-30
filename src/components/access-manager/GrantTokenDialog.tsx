import { useState } from 'react';
import {
  Plus,
  X,
  Hash,
  Layers,
  Users,
  FileText,
  Settings,
  Key,
  RefreshCw,
  AlertCircle,
  Copy,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface GrantForm {
  ttl: number;
  authorizedUserId: string;
  description: string;
  channels: Array<{ name: string; permissions: Record<string, boolean> }>;
  channelGroups: Array<{ name: string; permissions: Record<string, boolean> }>;
  uuids: Array<{ name: string; permissions: Record<string, boolean> }>;
  channelPatterns: Array<{ pattern: string; permissions: Record<string, boolean> }>;
  channelGroupPatterns: Array<{ pattern: string; permissions: Record<string, boolean> }>;
  uuidPatterns: Array<{ pattern: string; permissions: Record<string, boolean> }>;
  meta: Record<string, string>;
}

interface GrantTokenDialogProps {
  grantForm: GrantForm;
  setGrantForm: (form: GrantForm | ((prev: GrantForm) => GrantForm)) => void;
  onGrant: () => void;
  isGranting: boolean;
  onCancel: () => void;
  curlCommand?: string;
  onCreateAnother: () => void;
}

export function GrantTokenDialog({ 
  grantForm, 
  setGrantForm, 
  onGrant, 
  isGranting,
  onCancel,
  curlCommand,
  onCreateAnother
}: GrantTokenDialogProps) {
  const [activeTab, setActiveTab] = useState<'channels' | 'groups' | 'uuids' | 'patterns' | 'meta'>('channels');
  const { toast } = useToast();

  // Copy curl command to clipboard
  const copyCurlCommand = () => {
    if (curlCommand) {
      navigator.clipboard.writeText(curlCommand);
      toast({
        title: 'Copied to clipboard',
        description: 'Curl command has been copied to your clipboard',
      });
    }
  };

  // Channel functions
  const addChannel = () => {
    setGrantForm(prev => ({
      ...prev,
      channels: [...prev.channels, { name: '', permissions: { read: false, write: false } }]
    }));
  };

  const removeChannel = (index: number) => {
    setGrantForm(prev => ({
      ...prev,
      channels: prev.channels.filter((_, i) => i !== index)
    }));
  };

  const updateChannel = (index: number, field: string, value: any) => {
    setGrantForm(prev => ({
      ...prev,
      channels: prev.channels.map((channel, i) => 
        i === index ? { ...channel, [field]: value } : channel
      )
    }));
  };

  // Channel Group functions
  const addChannelGroup = () => {
    setGrantForm(prev => ({
      ...prev,
      channelGroups: [...prev.channelGroups, { name: '', permissions: { read: false, manage: false } }]
    }));
  };

  const removeChannelGroup = (index: number) => {
    setGrantForm(prev => ({
      ...prev,
      channelGroups: prev.channelGroups.filter((_, i) => i !== index)
    }));
  };

  const updateChannelGroup = (index: number, field: string, value: any) => {
    setGrantForm(prev => ({
      ...prev,
      channelGroups: prev.channelGroups.map((group, i) => 
        i === index ? { ...group, [field]: value } : group
      )
    }));
  };

  // UUID functions
  const addUuid = () => {
    setGrantForm(prev => ({
      ...prev,
      uuids: [...prev.uuids, { name: '', permissions: { get: false, update: false, delete: false } }]
    }));
  };

  const removeUuid = (index: number) => {
    setGrantForm(prev => ({
      ...prev,
      uuids: prev.uuids.filter((_, i) => i !== index)
    }));
  };

  const updateUuid = (index: number, field: string, value: any) => {
    setGrantForm(prev => ({
      ...prev,
      uuids: prev.uuids.map((uuid, i) => 
        i === index ? { ...uuid, [field]: value } : uuid
      )
    }));
  };

  // Channel Pattern functions
  const addChannelPattern = () => {
    setGrantForm(prev => ({
      ...prev,
      channelPatterns: [...prev.channelPatterns, { pattern: '', permissions: { read: false, write: false } }]
    }));
  };

  const removeChannelPattern = (index: number) => {
    setGrantForm(prev => ({
      ...prev,
      channelPatterns: prev.channelPatterns.filter((_, i) => i !== index)
    }));
  };

  const updateChannelPattern = (index: number, field: string, value: any) => {
    setGrantForm(prev => ({
      ...prev,
      channelPatterns: prev.channelPatterns.map((pattern, i) => 
        i === index ? { ...pattern, [field]: value } : pattern
      )
    }));
  };

  // Channel Group Pattern functions
  const addChannelGroupPattern = () => {
    setGrantForm(prev => ({
      ...prev,
      channelGroupPatterns: [...prev.channelGroupPatterns, { pattern: '', permissions: { read: false, manage: false } }]
    }));
  };

  const removeChannelGroupPattern = (index: number) => {
    setGrantForm(prev => ({
      ...prev,
      channelGroupPatterns: prev.channelGroupPatterns.filter((_, i) => i !== index)
    }));
  };

  const updateChannelGroupPattern = (index: number, field: string, value: any) => {
    setGrantForm(prev => ({
      ...prev,
      channelGroupPatterns: prev.channelGroupPatterns.map((pattern, i) => 
        i === index ? { ...pattern, [field]: value } : pattern
      )
    }));
  };

  // UUID Pattern functions
  const addUuidPattern = () => {
    setGrantForm(prev => ({
      ...prev,
      uuidPatterns: [...prev.uuidPatterns, { pattern: '', permissions: { get: false, update: false, delete: false } }]
    }));
  };

  const removeUuidPattern = (index: number) => {
    setGrantForm(prev => ({
      ...prev,
      uuidPatterns: prev.uuidPatterns.filter((_, i) => i !== index)
    }));
  };

  const updateUuidPattern = (index: number, field: string, value: any) => {
    setGrantForm(prev => ({
      ...prev,
      uuidPatterns: prev.uuidPatterns.map((pattern, i) => 
        i === index ? { ...pattern, [field]: value } : pattern
      )
    }));
  };

  // Metadata functions
  const addMetadata = () => {
    const key = `key${Object.keys(grantForm.meta).length + 1}`;
    setGrantForm(prev => ({
      ...prev,
      meta: { ...prev.meta, [key]: '' }
    }));
  };

  const removeMetadata = (key: string) => {
    setGrantForm(prev => {
      const newMeta = { ...prev.meta };
      delete newMeta[key];
      return { ...prev, meta: newMeta };
    });
  };

  const updateMetadata = (oldKey: string, newKey: string, value: string) => {
    setGrantForm(prev => {
      const newMeta = { ...prev.meta };
      if (oldKey !== newKey) {
        delete newMeta[oldKey];
      }
      newMeta[newKey] = value;
      return { ...prev, meta: newMeta };
    });
  };

  const validateForm = () => {
    const hasResources = grantForm.channels.length > 0 || 
                        grantForm.channelGroups.length > 0 || 
                        grantForm.uuids.length > 0;
    const hasPatterns = grantForm.channelPatterns.length > 0 || 
                       grantForm.channelGroupPatterns.length > 0 || 
                       grantForm.uuidPatterns.length > 0;
    
    return hasResources || hasPatterns;
  };

  return (
    <div className="space-y-6">
      {/* Basic Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="ttl">TTL (minutes) *</Label>
          <Input
            id="ttl"
            type="number"
            min="1"
            max="43200"
            value={grantForm.ttl}
            onChange={(e) => setGrantForm(prev => ({ ...prev, ttl: parseInt(e.target.value) || 60 }))}
          />
          <p className="text-xs text-gray-500 mt-1">Min: 1, Max: 43,200 (30 days)</p>
        </div>
        <div>
          <Label htmlFor="authorizedUserId">Authorized User ID (optional)</Label>
          <Input
            id="authorizedUserId"
            value={grantForm.authorizedUserId}
            onChange={(e) => setGrantForm(prev => ({ ...prev, authorizedUserId: e.target.value }))}
            placeholder="user-123"
          />
          <p className="text-xs text-gray-500 mt-1">Restricts token to specific user</p>
        </div>
      </div>
      
      <div>
        <Label htmlFor="description">Description (optional)</Label>
        <Input
          id="description"
          value={grantForm.description}
          onChange={(e) => setGrantForm(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Token description"
        />
      </div>

      {/* Tabs for different permission types */}
      <div>
        <div className="flex border-b border-gray-200 mb-4">
          {[
            { id: 'channels', label: 'Channels', icon: Hash, count: grantForm.channels.length },
            { id: 'groups', label: 'Channel Groups', icon: Layers, count: grantForm.channelGroups.length },
            { id: 'uuids', label: 'UUIDs', icon: Users, count: grantForm.uuids.length },
            { id: 'patterns', label: 'Patterns', icon: FileText, count: grantForm.channelPatterns.length + grantForm.channelGroupPatterns.length + grantForm.uuidPatterns.length },
            { id: 'meta', label: 'Metadata', icon: Settings, count: Object.keys(grantForm.meta).length },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-pubnub-blue text-pubnub-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab(tab.id as any)}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.count > 0 && (
                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Channel Permissions Tab */}
        {activeTab === 'channels' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-semibold">Channel Permissions</Label>
              <Button onClick={addChannel} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Channel
              </Button>
            </div>
            <div className="space-y-3">
              {grantForm.channels.map((channel, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <Input
                      placeholder="Channel name (e.g., chat-room-1)"
                      value={channel.name}
                      onChange={(e) => updateChannel(index, 'name', e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      onClick={() => removeChannel(index)}
                      size="sm"
                      variant="outline"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {(['read', 'write', 'get', 'manage', 'update', 'join', 'delete'] as const).map(permission => (
                      <div key={permission} className="flex items-center space-x-2">
                        <Checkbox
                          id={`channel-${index}-${permission}`}
                          checked={channel.permissions[permission] || false}
                          onCheckedChange={(checked) => 
                            updateChannel(index, 'permissions', {
                              ...channel.permissions,
                              [permission]: checked
                            })
                          }
                        />
                        <Label htmlFor={`channel-${index}-${permission}`} className="text-sm">
                          {permission}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {grantForm.channels.length === 0 && (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                  <Hash className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No channels added yet</p>
                  <p className="text-sm">Add channels to grant specific permissions</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Channel Groups Tab */}
        {activeTab === 'groups' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-semibold">Channel Group Permissions</Label>
              <Button onClick={addChannelGroup} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Channel Group
              </Button>
            </div>
            <div className="space-y-3">
              {grantForm.channelGroups.map((group, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <Input
                      placeholder="Channel group name (e.g., family-channels)"
                      value={group.name}
                      onChange={(e) => updateChannelGroup(index, 'name', e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      onClick={() => removeChannelGroup(index)}
                      size="sm"
                      variant="outline"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {(['read', 'manage'] as const).map(permission => (
                      <div key={permission} className="flex items-center space-x-2">
                        <Checkbox
                          id={`group-${index}-${permission}`}
                          checked={group.permissions[permission] || false}
                          onCheckedChange={(checked) => 
                            updateChannelGroup(index, 'permissions', {
                              ...group.permissions,
                              [permission]: checked
                            })
                          }
                        />
                        <Label htmlFor={`group-${index}-${permission}`} className="text-sm">
                          {permission}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {grantForm.channelGroups.length === 0 && (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                  <Layers className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No channel groups added yet</p>
                  <p className="text-sm">Add channel groups to grant permissions</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* UUIDs Tab */}
        {activeTab === 'uuids' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-semibold">UUID Permissions</Label>
              <Button onClick={addUuid} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add UUID
              </Button>
            </div>
            <div className="space-y-3">
              {grantForm.uuids.map((uuid, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <Input
                      placeholder="UUID (e.g., user-123)"
                      value={uuid.name}
                      onChange={(e) => updateUuid(index, 'name', e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      onClick={() => removeUuid(index)}
                      size="sm"
                      variant="outline"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {(['get', 'update', 'delete'] as const).map(permission => (
                      <div key={permission} className="flex items-center space-x-2">
                        <Checkbox
                          id={`uuid-${index}-${permission}`}
                          checked={uuid.permissions[permission] || false}
                          onCheckedChange={(checked) => 
                            updateUuid(index, 'permissions', {
                              ...uuid.permissions,
                              [permission]: checked
                            })
                          }
                        />
                        <Label htmlFor={`uuid-${index}-${permission}`} className="text-sm">
                          {permission}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {grantForm.uuids.length === 0 && (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                  <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No UUIDs added yet</p>
                  <p className="text-sm">Add UUIDs to grant permissions for user metadata</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Patterns Tab */}
        {activeTab === 'patterns' && (
          <div className="space-y-6">
            {/* Channel Patterns */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">Channel Patterns</Label>
                <Button onClick={addChannelPattern} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Pattern
                </Button>
              </div>
              <div className="space-y-3">
                {grantForm.channelPatterns.map((pattern, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-3">
                      <Input
                        placeholder="RegEx pattern (e.g., ^channel-[A-Za-z0-9]+$)"
                        value={pattern.pattern}
                        onChange={(e) => updateChannelPattern(index, 'pattern', e.target.value)}
                        className="flex-1 font-mono text-sm"
                      />
                      <Button
                        onClick={() => removeChannelPattern(index)}
                        size="sm"
                        variant="outline"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {(['read', 'write', 'get', 'manage', 'update', 'join', 'delete'] as const).map(permission => (
                        <div key={permission} className="flex items-center space-x-2">
                          <Checkbox
                            id={`pattern-channel-${index}-${permission}`}
                            checked={pattern.permissions[permission] || false}
                            onCheckedChange={(checked) => 
                              updateChannelPattern(index, 'permissions', {
                                ...pattern.permissions,
                                [permission]: checked
                              })
                            }
                          />
                          <Label htmlFor={`pattern-channel-${index}-${permission}`} className="text-sm">
                            {permission}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Channel Group Patterns */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">Channel Group Patterns</Label>
                <Button onClick={addChannelGroupPattern} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Pattern
                </Button>
              </div>
              <div className="space-y-3">
                {grantForm.channelGroupPatterns.map((pattern, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-3">
                      <Input
                        placeholder="RegEx pattern (e.g., ^group-[A-Za-z0-9]+$)"
                        value={pattern.pattern}
                        onChange={(e) => updateChannelGroupPattern(index, 'pattern', e.target.value)}
                        className="flex-1 font-mono text-sm"
                      />
                      <Button
                        onClick={() => removeChannelGroupPattern(index)}
                        size="sm"
                        variant="outline"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {(['read', 'manage'] as const).map(permission => (
                        <div key={permission} className="flex items-center space-x-2">
                          <Checkbox
                            id={`pattern-group-${index}-${permission}`}
                            checked={pattern.permissions[permission] || false}
                            onCheckedChange={(checked) => 
                              updateChannelGroupPattern(index, 'permissions', {
                                ...pattern.permissions,
                                [permission]: checked
                              })
                            }
                          />
                          <Label htmlFor={`pattern-group-${index}-${permission}`} className="text-sm">
                            {permission}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* UUID Patterns */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">UUID Patterns</Label>
                <Button onClick={addUuidPattern} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Pattern
                </Button>
              </div>
              <div className="space-y-3">
                {grantForm.uuidPatterns.map((pattern, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-3">
                      <Input
                        placeholder="RegEx pattern (e.g., ^user-[A-Za-z0-9]+$)"
                        value={pattern.pattern}
                        onChange={(e) => updateUuidPattern(index, 'pattern', e.target.value)}
                        className="flex-1 font-mono text-sm"
                      />
                      <Button
                        onClick={() => removeUuidPattern(index)}
                        size="sm"
                        variant="outline"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {(['get', 'update', 'delete'] as const).map(permission => (
                        <div key={permission} className="flex items-center space-x-2">
                          <Checkbox
                            id={`pattern-uuid-${index}-${permission}`}
                            checked={pattern.permissions[permission] || false}
                            onCheckedChange={(checked) => 
                              updateUuidPattern(index, 'permissions', {
                                ...pattern.permissions,
                                [permission]: checked
                              })
                            }
                          />
                          <Label htmlFor={`pattern-uuid-${index}-${permission}`} className="text-sm">
                            {permission}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {(grantForm.channelPatterns.length === 0 && grantForm.channelGroupPatterns.length === 0 && grantForm.uuidPatterns.length === 0) && (
              <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>No patterns added yet</p>
                <p className="text-sm">Use RegEx patterns to grant permissions to multiple resources</p>
              </div>
            )}
          </div>
        )}

        {/* Metadata Tab */}
        {activeTab === 'meta' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-semibold">Metadata</Label>
              <Button onClick={addMetadata} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Metadata
              </Button>
            </div>
            <div className="space-y-3">
              {Object.entries(grantForm.meta).map(([key, value]) => (
                <div key={key} className="border rounded-lg p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Key"
                      value={key}
                      onChange={(e) => updateMetadata(key, e.target.value, value)}
                    />
                    <div className="flex gap-2">
                      <Input
                        placeholder="Value"
                        value={value}
                        onChange={(e) => updateMetadata(key, key, e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        onClick={() => removeMetadata(key)}
                        size="sm"
                        variant="outline"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {Object.keys(grantForm.meta).length === 0 && (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                  <Settings className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No metadata added yet</p>
                  <p className="text-sm">Add custom metadata to include with the token</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Validation Warning */}
      {!validateForm() && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-orange-800">
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium">Validation Required</span>
          </div>
          <p className="text-sm text-orange-700 mt-1">
            You must specify permissions for at least one resource (channels, channel groups, or UUIDs) or pattern.
          </p>
        </div>
      )}

      {/* Curl Command Display */}
      {curlCommand && (
        <Card className="mt-4 border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800 flex items-center gap-2">
              <Key className="h-5 w-5" />
              Token Creation Command
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-orange-700 mb-3">
              Execute this curl command in your terminal to create the token:
            </p>
            <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-xs overflow-auto">
              {curlCommand}
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={copyCurlCommand}
                className="border-orange-300 text-orange-700 hover:bg-orange-100"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Command
              </Button>
            </div>
            <p className="text-xs text-orange-600 mt-2">
              After running the command, you can manually add the returned token to your token list.
            </p>
          </CardContent>
        </Card>
      )}

      <DialogFooter>
        {curlCommand ? (
          <>
            <Button variant="outline" onClick={onCancel}>
              Close
            </Button>
            <Button onClick={onCreateAnother} variant="outline">
              <RotateCcw className="h-4 w-4 mr-2" />
              Create Another
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={onGrant} disabled={isGranting || !validateForm()}>
              {isGranting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Key className="h-4 w-4 mr-2" />
                  Create Token
                </>
              )}
            </Button>
          </>
        )}
      </DialogFooter>
    </div>
  );
}