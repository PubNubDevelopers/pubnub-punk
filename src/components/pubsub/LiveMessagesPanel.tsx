import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { MessageCircle, Copy, X, ArrowDown } from 'lucide-react';
import { MessageData, PresenceEvent } from './types';
import { formatTimestamp } from './utils';
import MessageItem from './shared/MessageItem';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface LiveMessagesPanelProps {
  messages: MessageData[];
  presenceEvents: PresenceEvent[];
  receivePresenceEvents: boolean;
  showRawMessageData: boolean;
  onCopyRaw: () => void;
  onCopyFormatted: () => void;
  onClear: () => void;
  onReceivePresenceEventsChange: (value: boolean) => void;
  onShowRawMessageDataChange: (value: boolean) => void;
  onEmptyConnectCta?: () => void;
  className?: string;
}

const LiveMessagesPanel: React.FC<LiveMessagesPanelProps> = ({
  messages,
  presenceEvents,
  receivePresenceEvents,
  showRawMessageData,
  onCopyRaw,
  onCopyFormatted,
  onClear,
  onReceivePresenceEventsChange,
  onShowRawMessageDataChange,
  onEmptyConnectCta,
  className,
}) => {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const presenceContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [autoScrollPresence, setAutoScrollPresence] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showPresenceScrollButton, setShowPresenceScrollButton] = useState(false);

  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    const container = messagesContainerRef.current;
    const isNearBottom = 
      container.scrollHeight - container.scrollTop - container.clientHeight < 50;
    setAutoScroll(isNearBottom);
    setShowScrollButton(!isNearBottom && messages.length > 0);
  }, [messages.length]);

  const handlePresenceScroll = useCallback(() => {
    if (!presenceContainerRef.current) return;
    const container = presenceContainerRef.current;
    const isNearBottom = 
      container.scrollHeight - container.scrollTop - container.clientHeight < 50;
    setAutoScrollPresence(isNearBottom);
    setShowPresenceScrollButton(!isNearBottom && presenceEvents.length > 0);
  }, [presenceEvents.length]);

  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      setAutoScroll(true);
      setShowScrollButton(false);
    }
  }, []);

  const scrollPresenceToBottom = useCallback(() => {
    if (presenceContainerRef.current) {
      presenceContainerRef.current.scrollTop = presenceContainerRef.current.scrollHeight;
      setAutoScrollPresence(true);
      setShowPresenceScrollButton(false);
    }
  }, []);

  useEffect(() => {
    if (autoScroll && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  useEffect(() => {
    if (autoScrollPresence && presenceContainerRef.current) {
      presenceContainerRef.current.scrollTop = presenceContainerRef.current.scrollHeight;
    }
  }, [presenceEvents, autoScrollPresence]);

  return (
    <Card className={cn("mb-6 flex flex-col", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center">
            <MessageCircle className="h-5 w-5 mr-2 text-blue-600" />
            LIVE MESSAGES
          </CardTitle>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-gray-600">Live</span>
            </div>
          </div>
        </div>
        
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Switch
                checked={receivePresenceEvents}
                onCheckedChange={onReceivePresenceEventsChange}
              />
              <Label className="text-sm">Receive Presence Events</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={showRawMessageData}
                onCheckedChange={onShowRawMessageDataChange}
              />
              <Label className="text-sm">Show Raw Message Data</Label>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={messages.length === 0}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    onCopyFormatted();
                  }}
                >
                  Copy formatted messages
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    onCopyRaw();
                  }}
                >
                  Copy raw events
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={messages.length === 0}
              onClick={onClear}
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 min-h-0">
        <div className="relative flex flex-col flex-1 min-h-0">
          {receivePresenceEvents ? (
            <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
              <div className="flex flex-col space-y-2 min-h-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-700">Messages</h4>
                  <span className="text-xs text-gray-500">{messages.length} received</span>
                </div>
                <div
                  ref={messagesContainerRef}
                  onScroll={handleScroll}
                  className="bg-gray-50 rounded-lg p-4 flex-1 min-h-0 overflow-y-auto overflow-x-hidden border-2 border-dashed border-gray-200 relative"
                >
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-center">
                      <div>
                        <MessageCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-xs text-gray-500">No messages yet</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {messages.map((msg, index) => (
                        <MessageItem
                          key={index}
                          message={msg}
                          showRawData={showRawMessageData}
                          isCompact={true}
                        />
                      ))}
                    </div>
                  )}
                  {showScrollButton && (
                    <Button
                      size="sm"
                      onClick={scrollToBottom}
                      className="absolute bottom-2 right-2 rounded-full w-8 h-8 p-0 shadow-lg bg-blue-500 hover:bg-blue-600 text-white"
                      title="Scroll to bottom"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex flex-col space-y-2 min-h-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-700">Presence Events</h4>
                  <span className="text-xs text-gray-500">{presenceEvents.length} events</span>
                </div>
                <div
                  ref={presenceContainerRef}
                  onScroll={handlePresenceScroll}
                  className="bg-green-50 rounded-lg p-4 flex-1 min-h-0 overflow-y-auto overflow-x-hidden border-2 border-dashed border-green-200 relative"
                >
                  {presenceEvents.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-center">
                      <div>
                        <MessageCircle className="h-8 w-8 text-green-300 mx-auto mb-2" />
                        <p className="text-xs text-green-600">No presence events yet</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {presenceEvents.map((event, index) => (
                        <div key={index} className="bg-white p-2 rounded border border-green-200 shadow-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-mono text-green-600 bg-green-100 px-1 py-0.5 rounded">
                              #{event.channel}
                            </span>
                            <span className="text-xs text-gray-500">
                              {event.timestamp || formatTimestamp(event.timetoken)}
                            </span>
                          </div>
                          <div className="text-xs space-y-1">
                            <div><span className="font-semibold">Action:</span> {event.action}</div>
                            <div><span className="font-semibold">UUID:</span> {event.uuid}</div>
                            <div><span className="font-semibold">Occupancy:</span> {event.occupancy}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {showPresenceScrollButton && (
                    <Button
                      size="sm"
                      onClick={scrollPresenceToBottom}
                      className="absolute bottom-2 right-2 rounded-full w-8 h-8 p-0 shadow-lg bg-green-500 hover:bg-green-600 text-white"
                      title="Scroll to bottom"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="bg-gray-50 rounded-lg p-4 flex-1 min-h-0 overflow-y-auto overflow-x-hidden border-2 border-dashed border-gray-200 relative"
            >
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-center">
                  <div>
                    <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-lg">No messages yet</p>
                    <p className="text-gray-400 text-sm mb-3">Connect to start receiving real-time messages</p>
                    {onEmptyConnectCta && (
                      <Button onClick={onEmptyConnectCta} className="bg-blue-600 hover:bg-blue-700">
                        Connect to Channels
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg, index) => (
                    <MessageItem
                      key={index}
                      message={msg}
                      showRawData={showRawMessageData}
                      isCompact={false}
                    />
                  ))}
                </div>
              )}
              {showScrollButton && (
                <Button
                  size="sm"
                  onClick={scrollToBottom}
                  className="absolute bottom-4 right-4 rounded-full w-10 h-10 p-0 shadow-lg bg-blue-500 hover:bg-blue-600 text-white"
                  title="Scroll to bottom"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
        
        {(messages.length > 0 || presenceEvents.length > 0) && (
          <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
            <span>
              {messages.length} message{messages.length !== 1 ? 's' : ''} received
              {receivePresenceEvents && presenceEvents.length > 0 && 
                `, ${presenceEvents.length} presence event${presenceEvents.length !== 1 ? 's' : ''}`
              }
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={onClear}
              className="text-red-600 hover:text-red-700"
            >
              Clear All Messages
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LiveMessagesPanel;
