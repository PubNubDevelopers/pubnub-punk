import { useState } from 'react';
import { MessageCircle, Send, Play, Square, Copy, Settings, HelpCircle, Filter, Zap, RefreshCw, MapPin, Plus, X, ArrowDown, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

export default function PubSubWireframePage() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [presenceEvents, setPresenceEvents] = useState<any[]>([]);
  const [showAdvancedPublish, setShowAdvancedPublish] = useState(false);
  const [receivePresenceEvents, setReceivePresenceEvents] = useState(false);
  const [showRawMessageData, setShowRawMessageData] = useState(false);
  const [publishStatus, setPublishStatus] = useState<{
    isVisible: boolean;
    isSuccess: boolean;
    timetoken?: string;
    isFlashing: boolean;
  }>({ isVisible: false, isSuccess: false, isFlashing: false });
  const [filters, setFilters] = useState([
    { id: 1, target: 'message', field: 'type', operator: '==', value: 'alert' }
  ]);

  const [publishData, setPublishData] = useState({
    channel: 'hello_world',
    message: '{"text": "Hello, World!", "type": "greeting"}',
    storeInHistory: true,
    sendByPost: false,
    ttl: '',
    customMessageType: 'text-message',
    meta: ''
  });

  const [subscribeData, setSubscribeData] = useState({
    channels: 'hello_world, sensors-*',
    channelGroups: 'group1, group2',
    heartbeat: 300,
    restoreOnReconnect: true,
    cursor: { timetoken: '', region: '' }
  });

  const generateFilterSummary = () => {
    if (filters.length === 0) return 'No filters active';
    return filters.map(f => `${f.target}.${f.field} ${f.operator} "${f.value}"`).join(' AND ');
  };

  const addFilter = () => {
    setFilters([...filters, {
      id: Date.now(),
      target: 'message',
      field: '',
      operator: '==',
      value: ''
    }]);
  };

  const removeFilter = (id: number) => {
    setFilters(filters.filter(f => f.id !== id));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <MessageCircle className="text-white h-4 w-4" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">PubNub Pub/Sub Tool</h1>
            <p className="text-gray-600">Real-time messaging with advanced filtering and controls</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm">
            <HelpCircle className="h-4 w-4 mr-2" />
            Help
          </Button>
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Live Messages Panel */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isSubscribed ? 'bg-green-500' : 'bg-gray-400'}`} />
                <CardTitle className="text-lg">LIVE MESSAGES</CardTitle>
                <Badge variant={isSubscribed ? "default" : "secondary"}>
                  {isSubscribed ? `${messages.length} received` : 'Not connected'}
                </Badge>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Subscribe Toggle with Channel Display */}
              <div className="flex items-center space-x-3">
                <div className="text-right text-sm">
                  <div className="font-medium">{isSubscribed ? 'ON' : 'OFF'}</div>
                  {isSubscribed ? (
                    <div className="text-gray-500 text-xs">
                      <span className="font-mono bg-blue-50 px-1 py-0.5 rounded mr-1">
                        {subscribeData.channels.length > 45 ? 
                          `${subscribeData.channels.substring(0, 42)}...` : 
                          subscribeData.channels || 'No channels'
                        }
                      </span>
                      <button 
                        onClick={() => {
                          // Scroll to subscription configuration panel
                          const element = document.querySelector('[data-testid="subscription-config"]');
                          element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                        className="text-blue-600 hover:text-blue-800 underline text-xs"
                      >
                        change
                      </button>
                    </div>
                  ) : (
                    <div className="text-gray-500">Subscribe</div>
                  )}
                </div>
                <Switch 
                  checked={isSubscribed}
                  onCheckedChange={setIsSubscribed}
                  className="scale-125"
                />
              </div>
            </div>
          </div>
          
          {/* Message Display Options */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={receivePresenceEvents}
                  onCheckedChange={setReceivePresenceEvents}
                />
                <Label className="text-sm">Receive Presence Events</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={showRawMessageData}
                  onCheckedChange={setShowRawMessageData}
                />
                <Label className="text-sm">Show Raw Message Data</Label>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" disabled={messages.length === 0}>
                <Copy className="h-4 w-4 mr-1" />
                Copy All
              </Button>
              <Button variant="outline" size="sm" disabled={messages.length === 0}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {receivePresenceEvents ? (
              /* Split View - Messages and Presence Events */
              <div className="grid grid-cols-2 gap-4">
                {/* Messages Window */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-700">Messages</h4>
                    <span className="text-xs text-gray-500">{messages.length} received</span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 h-64 overflow-y-auto border-2 border-dashed border-gray-200 relative">
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
                          <div key={index} className="bg-white p-2 rounded border shadow-sm">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-mono text-blue-600 bg-blue-50 px-1 py-0.5 rounded">
                                #{msg.channel}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date().toLocaleTimeString()}
                              </span>
                            </div>
                            {showRawMessageData ? (
                              <pre className="text-xs font-mono bg-gray-100 p-2 rounded">
                                {JSON.stringify({
                                  channel: msg.channel,
                                  message: msg.message,
                                  timetoken: msg.timetoken || Date.now(),
                                  publisher: msg.publisher || null
                                }, null, 2)}
                              </pre>
                            ) : (
                              <pre className="text-xs font-mono bg-gray-100 p-2 rounded">
                                {JSON.stringify(msg.message, null, 2)}
                              </pre>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <Button
                      size="sm"
                      className="absolute bottom-2 right-2 rounded-full w-8 h-8 p-0 shadow-lg bg-blue-500 hover:bg-blue-600 text-white"
                      title="Scroll to bottom"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Presence Events Window */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-700">Presence Events</h4>
                    <span className="text-xs text-gray-500">{presenceEvents.length} events</span>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 h-64 overflow-y-auto border-2 border-dashed border-green-200 relative">
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
                                {new Date().toLocaleTimeString()}
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
                    <Button
                      size="sm"
                      className="absolute bottom-2 right-2 rounded-full w-8 h-8 p-0 shadow-lg bg-green-500 hover:bg-green-600 text-white"
                      title="Scroll to bottom"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* Single View - Messages Only */
              <div className="bg-gray-50 rounded-lg p-4 h-64 overflow-y-auto border-2 border-dashed border-gray-200 relative">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-center">
                    <div>
                      <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 text-lg">No messages yet</p>
                      <p className="text-gray-400 text-sm">Start subscribing to see real-time messages here</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((msg, index) => (
                      <div key={index} className="bg-white p-3 rounded border shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            #{msg.channel}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date().toLocaleTimeString()}
                          </span>
                        </div>
                        {showRawMessageData ? (
                          <pre className="text-xs font-mono bg-gray-100 p-3 rounded">
                            {JSON.stringify({
                              channel: msg.channel,
                              message: msg.message,
                              timetoken: msg.timetoken || Date.now(),
                              publisher: msg.publisher || null,
                              messageType: msg.messageType || null,
                              meta: msg.meta || null
                            }, null, 2)}
                          </pre>
                        ) : (
                          <pre className="text-xs font-mono bg-gray-100 p-3 rounded">
                            {JSON.stringify(msg.message, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <Button
                  size="sm"
                  className="absolute bottom-4 right-4 rounded-full w-10 h-10 p-0 shadow-lg bg-blue-500 hover:bg-blue-600 text-white"
                  title="Scroll to bottom"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          
          {/* Message Stats */}
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
                onClick={() => {
                  setMessages([]);
                  setPresenceEvents([]);
                }}
                className="text-red-600 hover:text-red-700"
              >
                Clear All Messages
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Publish Bar */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center">
              <Send className="h-5 w-5 mr-2 text-red-600" />
              QUICK PUBLISH
            </CardTitle>
            <div className="flex flex-col items-end space-y-2">
              <Button 
                className="bg-red-600 hover:bg-red-700"
                onClick={() => {
                  // Simulate publish
                  setPublishStatus({
                    isVisible: true,
                    isSuccess: true,
                    timetoken: '15123456789012345',
                    isFlashing: true
                  });
                  setTimeout(() => {
                    setPublishStatus(prev => ({ ...prev, isFlashing: false }));
                  }, 500);
                }}
              >
                <Send className="h-4 w-4 mr-2" />
                PUBLISH
              </Button>
              
              {/* Publish Status Indicator */}
              {publishStatus.isVisible && (
                <div className="flex items-center space-x-2">
                  <div 
                    className={`w-3 h-3 rounded-full transition-colors duration-150 ${
                      publishStatus.isFlashing
                        ? publishStatus.isSuccess 
                          ? 'bg-green-500 animate-pulse' 
                          : 'bg-red-500 animate-pulse'
                        : publishStatus.isSuccess
                          ? 'bg-green-500'
                          : 'bg-red-500'
                    }`}
                  />
                  <span className="text-xs text-gray-600 font-mono">
                    {publishStatus.isSuccess 
                      ? `timetoken=${publishStatus.timetoken}`
                      : 'Publish Error'
                    }
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <Label>Channel</Label>
              <div className="flex space-x-2">
                <Input 
                  value={publishData.channel}
                  placeholder="hello_world"
                  className="flex-1"
                />
                <Button variant="outline" size="sm">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <div className="flex space-x-2">
                <Input 
                  value={publishData.message}
                  placeholder='{"text": "Hello, World!"}'
                  className="flex-1 font-mono"
                />
                <Button variant="outline" size="sm">
                  Format
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Switch checked={publishData.storeInHistory} />
              <Label className="text-sm">Store in History</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch checked={publishData.sendByPost} />
              <Label className="text-sm">Send by POST</Label>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowAdvancedPublish(!showAdvancedPublish)}
            >
              {showAdvancedPublish ? 'Basic' : 'Advanced'} ▼
            </Button>
          </div>

          {showAdvancedPublish && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Custom Message Type</Label>
                  <Input value={publishData.customMessageType} placeholder="text-message" />
                </div>
                <div>
                  <Label>TTL (Hours)</Label>
                  <Input value={publishData.ttl} placeholder="24" type="number" />
                </div>
              </div>
              <div>
                <Label>Metadata (JSON)</Label>
                <Textarea 
                  value={publishData.meta}
                  placeholder='{"source": "dev-tools", "priority": "high"}'
                  className="font-mono"
                  rows={2}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscription Configuration Panel */}
      <Card data-testid="subscription-config">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <MessageCircle className="h-5 w-5 mr-2 text-blue-600" />
            SUBSCRIPTION CONFIGURATION
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="channels" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="channels">CHANNELS</TabsTrigger>
              <TabsTrigger value="groups">GROUPS</TabsTrigger>
              <TabsTrigger value="filters" className="relative">
                FILTERS
                {filters.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 min-w-5 text-xs">
                    {filters.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="advanced">ADVANCED</TabsTrigger>
            </TabsList>
            
            <TabsContent value="channels" className="mt-4 space-y-4">
              <div>
                <Label>Channel Names (comma-separated)</Label>
                <Input 
                  value={subscribeData.channels}
                  placeholder="hello_world, sensors-*, alerts"
                  className="mt-1"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Subscribe to individual channels. Use wildcards (*) for pattern matching.
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="groups" className="mt-4 space-y-4">
              <div>
                <Label>Channel Group Names (comma-separated)</Label>
                <Input 
                  value={subscribeData.channelGroups}
                  placeholder="group1, group2, sensors-group"
                  className="mt-1"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Subscribe to channel groups containing multiple channels.
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="filters" className="mt-4 space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Message Filters (Server-side)</Label>
                  <Button size="sm" onClick={addFilter}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Filter
                  </Button>
                </div>
                
                {filters.map((filter, index) => (
                  <div key={filter.id} className="p-3 border rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Filter {index + 1}</span>
                      {filters.length > 1 && (
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => removeFilter(filter.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <Input placeholder="Target" value={filter.target} />
                      <Input placeholder="Field" value={filter.field} />
                      <Input placeholder="Operator" value={filter.operator} />
                      <Input placeholder="Value" value={filter.value} />
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="advanced" className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Cursor Timetoken</Label>
                  <Input 
                    value={subscribeData.cursor.timetoken}
                    placeholder="15123456789012345"
                    className="mt-1 font-mono"
                  />
                </div>
                <div>
                  <Label>Cursor Region</Label>
                  <Input 
                    value={subscribeData.cursor.region}
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
                  <Switch />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="flex items-center">
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Restore on Reconnect
                    </Label>
                    <p className="text-sm text-gray-500">Auto-restore subscription after disconnect</p>
                  </div>
                  <Switch checked={subscribeData.restoreOnReconnect} />
                </div>
                
                <div>
                  <Label>Heartbeat Interval (seconds)</Label>
                  <Input 
                    value={subscribeData.heartbeat}
                    type="number"
                    className="mt-1 w-24"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Active Filters Summary */}
      {filters.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <Filter className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-medium text-blue-900">Active Filters:</div>
              <div className="text-sm text-blue-700 font-mono">{generateFilterSummary()}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}