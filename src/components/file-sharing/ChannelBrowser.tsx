import { useState } from 'react';
import { Plus, Folder, FolderOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AddChannelDialog } from './AddChannelDialog';
import { ChannelStats } from './types';

interface ChannelBrowserProps {
  channels: string[];
  selectedChannel: string;
  channelStats: Record<string, ChannelStats>;
  onChannelSelect: (channel: string) => void;
  onChannelAdd: (channelName: string) => void;
}

export function ChannelBrowser({ 
  channels, 
  selectedChannel, 
  channelStats, 
  onChannelSelect, 
  onChannelAdd 
}: ChannelBrowserProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);

  return (
    <div className="w-64 flex-shrink-0">
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Channels</CardTitle>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => setShowAddDialog(true)}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          <TooltipProvider>
            {channels.map((channel) => (
              <Tooltip key={channel}>
                <TooltipTrigger asChild>
                  <div
                    className={`p-2 rounded cursor-pointer flex items-center justify-between group ${
                      selectedChannel === channel 
                        ? 'bg-pubnub-blue text-white hover:bg-pubnub-blue/90' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => onChannelSelect(channel)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {selectedChannel === channel ? (
                        <FolderOpen className="w-4 h-4 flex-shrink-0" />
                      ) : (
                        <Folder className="w-4 h-4 flex-shrink-0" />
                      )}
                      <span className="text-sm truncate">{channel}</span>
                    </div>
                    {channelStats[channel] && (
                      <span className={`text-xs ${selectedChannel === channel ? 'text-blue-200' : 'text-gray-500'}`}>
                        {channelStats[channel].totalFiles}
                      </span>
                    )}
                  </div>
                </TooltipTrigger>
                {channel.length > 20 && (
                  <TooltipContent side="right">
                    <p>{channel}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            ))}
          </TooltipProvider>
        </CardContent>
      </Card>
      
      <AddChannelDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onChannelAdd={onChannelAdd}
      />
    </div>
  );
}