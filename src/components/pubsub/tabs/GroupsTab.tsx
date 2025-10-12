import React from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface GroupsTabProps {
  channelGroups: string;
  onChannelGroupsChange: (value: string) => void;
}

export default function GroupsTab({ 
  channelGroups, 
  onChannelGroupsChange 
}: GroupsTabProps) {
  return (
    <TabsContent value="groups" className="mt-4 space-y-4">
      <div>
        <Label>Channel Group Names (comma-separated)</Label>
        <Input 
          value={channelGroups}
          onChange={(e) => onChannelGroupsChange(e.target.value)}
          placeholder="group1, group2, sensors-group"
          className="mt-1"
        />
        <p className="text-sm text-gray-500 mt-1">
          Subscribe to channel groups containing multiple channels.
        </p>
      </div>
    </TabsContent>
  );
}