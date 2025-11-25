import React from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Zap, RefreshCw } from 'lucide-react';
import type { SubscribeFormData } from '../types';

interface AdvancedTabProps {
  cursor: SubscribeFormData['cursor'];
  withPresence: boolean;
  restoreOnReconnect: boolean;
  heartbeat: number;
  onCursorChange: (field: 'timetoken' | 'region', value: string) => void;
  onWithPresenceChange: (value: boolean) => void;
  onRestoreOnReconnectChange: (value: boolean) => void;
  onHeartbeatChange: (value: number) => void;
}

export default function AdvancedTab({
  cursor,
  withPresence,
  restoreOnReconnect,
  heartbeat,
  onCursorChange,
  onWithPresenceChange,
  onRestoreOnReconnectChange,
  onHeartbeatChange,
}: AdvancedTabProps) {
  return (
    <TabsContent value="advanced" className="mt-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Cursor Timetoken</Label>
          <Input 
            value={cursor.timetoken}
            onChange={(e) => onCursorChange('timetoken', e.target.value)}
            placeholder="15123456789012345"
            className="mt-1 font-mono"
          />
        </div>
        <div>
          <Label>Cursor Region</Label>
          <Input 
            value={cursor.region}
            onChange={(e) => onCursorChange('region', e.target.value)}
            placeholder="1"
            type="number"
            className="mt-1"
          />
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="flex items-center">
              <Zap className="h-4 w-4 mr-1" />
              Enable Heartbeat
            </Label>
            <p className="text-sm text-gray-500">Send periodic heartbeat messages</p>
          </div>
          <Switch 
            checked={withPresence}
            onCheckedChange={onWithPresenceChange}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <Label className="flex items-center">
              <RefreshCw className="h-4 w-4 mr-1" />
              Restore on Reconnect
            </Label>
            <p className="text-sm text-gray-500">Auto-restore subscription after disconnect</p>
          </div>
          <Switch 
            checked={restoreOnReconnect}
            onCheckedChange={onRestoreOnReconnectChange}
          />
        </div>
        
        <div>
          <Label>Heartbeat Interval (seconds)</Label>
          <Input
            value={heartbeat}
            onChange={(e) => onHeartbeatChange(parseInt(e.target.value) || 300)}
            type="number"
            className="mt-1 w-24"
          />
        </div>
      </div>
    </TabsContent>
  );
}
