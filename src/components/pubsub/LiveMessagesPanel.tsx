import React, { useRef, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { MessageCircle, Copy, ChevronUp, ChevronDown, ArrowDown } from 'lucide-react';
import { MessageItem } from './shared/MessageItem';
import { StatusIndicator } from './shared/StatusIndicator';
import { LiveMessagesPanelProps } from './types';

export const LiveMessagesPanel: React.FC<LiveMessagesPanelProps> = ({
  messages,
  presenceEvents,
  isSubscribed,
  showRawMessageData,
  receivePresenceEvents,
  messagesHeight,
  showMessages,
  showScrollButton,
  showPresenceScrollButton,
  onShowRawMessageDataToggle,
  onReceivePresenceEventsToggle,
  onShowMessagesToggle,
  onCopyAllMessages,
  onCopyAllPresenceEvents,
  onScrollToBottom,
  onScrollToBottomPresence,
  onMessagesScroll,
  onPresenceScroll,
  onMessagesHeightChange
}) => {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const presenceContainerRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);

  // Handle container resizing for messages
  useEffect(() => {
    const messagesContainer = messagesContainerRef.current;
    if (!messagesContainer) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newHeight = entry.contentRect.height;
        if (newHeight !== messagesHeight && newHeight > 0) {
          onMessagesHeightChange?.(newHeight);
        }
      }
    });

    resizeObserver.observe(messagesContainer);
    return () => resizeObserver.disconnect();
  }, [messagesHeight, onMessagesHeightChange]);

  // Handle scroll events for messages
  const handleMessagesScroll = () => {
    if (messagesContainerRef.current && onMessagesScroll) {
      onMessagesScroll(messagesContainerRef.current);
    }
  };

  // Handle scroll events for presence
  const handlePresenceScroll = () => {
    if (presenceContainerRef.current && onPresenceScroll) {
      onPresenceScroll(presenceContainerRef.current);
    }
  };

  // Auto-scroll to bottom when new messages arrive (if user is near bottom)
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || messages.length === 0) return;

    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
    if (isNearBottom) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  // Auto-scroll to bottom when new presence events arrive (if user is near bottom)
  useEffect(() => {
    const container = presenceContainerRef.current;
    if (!container || presenceEvents.length === 0) return;

    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
    if (isNearBottom) {
      container.scrollTop = container.scrollHeight;
    }
  }, [presenceEvents]);

  const renderMessagesSection = () => (
    <div className="space-y-2 relative">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">Messages</h4>
        <Button
          variant="outline"
          size="sm"
          onClick={onCopyAllMessages}
          disabled={messages.length === 0}
          className="h-6 px-2"
          title="Copy all messages to clipboard"
        >
          <Copy className="h-3 w-3" />
        </Button>
      </div>
      <div 
        ref={messagesContainerRef}
        onScroll={handleMessagesScroll}
        className="bg-gray-50 rounded-lg p-4 overflow-y-auto resize-y border-b-2 border-gray-300"
        style={{ height: `${messagesHeight}px`, minHeight: '120px', maxHeight: '600px' }}
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <MessageCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-500">
                {isSubscribed 
                  ? "No messages received yet..." 
                  : "Subscribe to channels to start receiving messages"}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((msg, index) => (
              <MessageItem 
                key={`message-${index}-${msg.timetoken}`}
                message={msg}
                showRawData={showRawMessageData}
                type="message"
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Scroll to bottom button for messages window */}
      {showScrollButton && (
        <Button
          onClick={onScrollToBottom}
          size="sm"
          className="absolute bottom-4 right-4 rounded-full w-8 h-8 p-0 shadow-lg bg-blue-500 hover:bg-blue-600 text-white"
          title="Scroll to bottom"
        >
          <ArrowDown className="h-3 w-3" />
        </Button>
      )}
    </div>
  );

  const renderPresenceSection = () => (
    <div className="space-y-2 relative">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">Presence Events</h4>
        <Button
          variant="outline"
          size="sm"
          onClick={onCopyAllPresenceEvents}
          disabled={presenceEvents.length === 0}
          className="h-6 px-2"
          title="Copy all presence events to clipboard"
        >
          <Copy className="h-3 w-3" />
        </Button>
      </div>
      <div 
        ref={presenceContainerRef}
        onScroll={handlePresenceScroll}
        className="bg-green-50 rounded-lg p-4 overflow-y-auto resize-y border-b-2 border-green-300"
        style={{ height: `${messagesHeight}px`, minHeight: '120px', maxHeight: '600px' }}
      >
        {presenceEvents.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <MessageCircle className="h-8 w-8 text-green-300 mx-auto mb-2" />
              <p className="text-xs text-green-600">
                {isSubscribed 
                  ? "No presence events received yet..." 
                  : "Subscribe to channels to see presence events"}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {presenceEvents.map((event, index) => (
              <MessageItem 
                key={`presence-${index}-${event.timetoken}`}
                message={event}
                showRawData={showRawMessageData}
                type="presence"
              />
            ))}
          </div>
        )}
      </div>

      {/* Scroll to bottom button for presence window */}
      {showPresenceScrollButton && (
        <Button
          onClick={onScrollToBottomPresence}
          size="sm"
          className="absolute bottom-4 right-4 rounded-full w-8 h-8 p-0 shadow-lg bg-green-500 hover:bg-green-600 text-white"
          title="Scroll to bottom"
        >
          <ArrowDown className="h-3 w-3" />
        </Button>
      )}
    </div>
  );

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
              <MessageCircle className="text-white h-5 w-5" />
            </div>
            <div>
              <CardTitle>Real-Time Messages</CardTitle>
              <StatusIndicator 
                isSubscribed={isSubscribed}
                messageCount={messages.length}
                presenceEventCount={presenceEvents.length}
                receivePresenceEvents={receivePresenceEvents}
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 text-sm">
                <Label htmlFor="receive-presence" className="text-xs font-medium">
                  Receive Presence Events
                </Label>
                <Switch
                  id="receive-presence"
                  checked={receivePresenceEvents}
                  onCheckedChange={onReceivePresenceEventsToggle}
                />
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <Label htmlFor="show-raw-data" className="text-xs font-medium">
                  Show Raw Message Data
                </Label>
                <Switch
                  id="show-raw-data"
                  checked={showRawMessageData}
                  onCheckedChange={onShowRawMessageDataToggle}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {/* Show copy button only when presence events are disabled */}
              {!receivePresenceEvents && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCopyAllMessages}
                  disabled={messages.length === 0}
                  className="flex items-center space-x-1"
                  title="Copy all messages to clipboard"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={onShowMessagesToggle}
                className="flex items-center space-x-2"
              >
                {showMessages ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                <span>{showMessages ? 'Hide' : 'Show'}</span>
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      {showMessages && (
        <CardContent>
          <div className="relative">
            {receivePresenceEvents ? (
              /* Split View - Messages and Presence Events */
              <div className="grid grid-cols-2 gap-4">
                {renderMessagesSection()}
                {renderPresenceSection()}
              </div>
            ) : (
              /* Single View - Messages Only */
              <div className="relative">
                <div 
                  ref={messagesContainerRef}
                  onScroll={handleMessagesScroll}
                  className="bg-gray-50 rounded-lg p-4 overflow-y-auto resize-y border-b-2 border-gray-300"
                  style={{ height: `${messagesHeight}px`, minHeight: '120px', maxHeight: '600px' }}
                >
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-center">
                      <div>
                        <MessageCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-xs text-gray-500">
                          {isSubscribed 
                            ? "No messages received yet..." 
                            : "Subscribe to channels to start receiving messages"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {messages.map((msg, index) => (
                        <MessageItem 
                          key={`message-${index}-${msg.timetoken}`}
                          message={msg}
                          showRawData={showRawMessageData}
                          type="message"
                        />
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Scroll to bottom button for single view */}
                {showScrollButton && (
                  <Button
                    onClick={onScrollToBottom}
                    size="sm"
                    className="absolute bottom-4 right-4 rounded-full w-8 h-8 p-0 shadow-lg bg-blue-500 hover:bg-blue-600 text-white"
                    title="Scroll to bottom"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};