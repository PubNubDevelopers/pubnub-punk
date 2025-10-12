import React from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface ChannelsTabProps {
  channels: string;
  onChannelsChange: (value: string) => void;
}

export default function ChannelsTab({ 
  channels, 
  onChannelsChange 
}: ChannelsTabProps) {
  return (
    <TabsContent value="channels" className="mt-4 space-y-4">
      <div>
        <Label>Channel Names (comma-separated)</Label>
        <Input 
          value={channels}
          onChange={(e) => onChannelsChange(e.target.value)}
          placeholder="hello_world, sensors-*, alerts"
          className="mt-1"
        />
        <p className="text-sm text-gray-500 mt-1">
          Subscribe to individual channels. Use wildcards (*) for pattern matching.
        </p>
      </div>
    </TabsContent>
  );
}