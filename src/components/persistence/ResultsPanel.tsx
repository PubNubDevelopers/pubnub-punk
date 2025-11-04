import { useMemo } from 'react';
import { 
  MessageSquare, 
  Archive, 
  Copy, 
  Search, 
  Clock, 
  Hash, 
  MoreVertical, 
  Trash2, 
  Info 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChannelHistory, HistoryMessage, MessageDeleteRequest } from '@/types/persistence';
import { formatTimetoken } from '@/lib/persistence/utils';

interface ResultsPanelProps {
  channelHistories: ChannelHistory[];
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  showRawData: boolean;
  onShowRawDataChange: (show: boolean) => void;
  onCopyToClipboard: (text: string, description: string) => void;
  onDeleteMessage: (request: MessageDeleteRequest) => void;
}

export function ResultsPanel({
  channelHistories,
  searchTerm,
  onSearchTermChange,
  showRawData,
  onShowRawDataChange,
  onCopyToClipboard,
  onDeleteMessage,
}: ResultsPanelProps) {
  // Filter messages based on search term
  const filteredHistories = useMemo(() => {
    if (!searchTerm) return channelHistories;
    
    return channelHistories.map(history => ({
      ...history,
      messages: history.messages.filter(msg => {
        const messageStr = JSON.stringify(msg.message).toLowerCase();
        const uuidStr = (msg.uuid || '').toLowerCase();
        const metaStr = msg.meta ? JSON.stringify(msg.meta).toLowerCase() : '';
        const search = searchTerm.toLowerCase();
        
        return messageStr.includes(search) || 
               uuidStr.includes(search) || 
               metaStr.includes(search) ||
               msg.timetoken.includes(search);
      })
    }));
  }, [channelHistories, searchTerm]);

  const MessageItem = ({ msg, channelName, index }: { msg: HistoryMessage; channelName: string; index: number }) => (
    <div key={`${msg.timetoken}-${index}`} className="bg-gray-50 rounded-lg p-4 border">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="mb-2 flex items-center gap-4 pr-6">
            <span className="flex-1 min-w-0 font-mono text-xs text-gray-500 truncate">
              {msg.timetoken}
            </span>
            <span className="font-mono text-xs text-gray-500 whitespace-nowrap text-right w-36">
              {formatTimetoken(msg.timetoken)}
            </span>
          </div>
          
          {showRawData ? (
            <pre className="font-mono text-sm bg-white p-3 rounded border overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify({
                message: msg.message,
                timetoken: msg.timetoken,
                uuid: msg.uuid,
                meta: msg.meta,
                messageType: msg.messageType,
              }, null, 2)}
            </pre>
          ) : (
            <div className="space-y-2">
              <div className="bg-white p-3 rounded border">
                <div className="text-sm font-medium text-gray-700 mb-1">Message:</div>
                <pre className="font-mono text-sm overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(msg.message, null, 2)}
                </pre>
              </div>
              
              {msg.meta && (
                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                  <div className="text-sm font-medium text-blue-700 mb-1">Metadata:</div>
                  <pre className="font-mono text-sm text-blue-600 overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(msg.meta, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="flex flex-col items-end justify-end flex-shrink-0 ml-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="mt-6">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => onCopyToClipboard(JSON.stringify(msg, null, 2), 'Message')}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Message
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onCopyToClipboard(msg.timetoken, 'Timetoken')}
              >
                <Clock className="w-4 h-4 mr-2" />
                Copy Timetoken
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDeleteMessage({
                  channel: channelName,
                  timetoken: msg.timetoken
                })}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Message
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );

  return (
    <Card className="flex-1 flex flex-col min-h-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Message History Results
        </CardTitle>

        {filteredHistories.length > 0 && (
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <span className="text-sm font-normal text-gray-500">
              {(() => {
                const totalMessages = filteredHistories.reduce((sum, h) => sum + h.messages.length, 0);
                return `(${totalMessages} message${totalMessages === 1 ? '' : 's'} returned)`;
              })()}
            </span>

            <div className="flex items-center gap-2">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={showRawData}
                  onCheckedChange={onShowRawDataChange}
                />
                <Label className="text-sm font-normal text-gray-600">Raw Data View</Label>
              </div>
            
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const allMessages = filteredHistories.flatMap(h => h.messages);
                  onCopyToClipboard(JSON.stringify(allMessages, null, 2), 'All messages');
                }}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy All
              </Button>
            </div>
          </div>
        )}
        
        {filteredHistories.length > 0 && (
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(e) => onSearchTermChange(e.target.value)}
                className="pl-10"
              />
            </div>
            {filteredHistories.length > 0 && searchTerm && (
              <span className="text-sm text-gray-500">
                {filteredHistories.reduce((sum, h) => sum + h.messages.length, 0)} of {channelHistories.reduce((sum, h) => sum + h.messages.length, 0)} messages shown
              </span>
            )}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto min-h-0">
        {filteredHistories.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Archive className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Message History</h3>
              <p className="text-gray-500">
                Enter channel names and click "Fetch History" to retrieve stored messages
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredHistories.map((history) => (
              <div key={history.channel} className="space-y-3">
                <div className="border-b pb-2 space-y-1">
                  <div className="flex items-start justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Hash className="w-4 h-4" />
                      {history.channel}
                    </h3>
                    
                    {history.messages.length > 0 && (
                      <div className="flex flex-col items-end text-xs text-gray-500 gap-1">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          <span className="font-mono">Oldest msg: {formatTimetoken(history.messages[0].timetoken)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3 opacity-70" />
                          <span className="font-mono">Newest msg: {formatTimetoken(history.messages[history.messages.length - 1].timetoken)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="block text-sm font-normal text-gray-500">
                    ({history.messages.length} messages)
                  </span>
                </div>
                
                {history.messages.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No messages found for this channel
                  </div>
                ) : (
                  <div className="space-y-2">
                    {history.messages.map((msg, index) => (
                      <MessageItem 
                        key={`${msg.timetoken}-${index}`} 
                        msg={msg} 
                        channelName={history.channel} 
                        index={index} 
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
