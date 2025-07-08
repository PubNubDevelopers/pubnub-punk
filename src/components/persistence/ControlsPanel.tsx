import { useState } from 'react';
import { 
  Archive, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  BarChart3 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Database } from 'lucide-react';
import { PersistenceSettings, COMMON_TIMEZONES } from '@/types/persistence';

interface ControlsPanelProps {
  settings: PersistenceSettings;
  onSettingsChange: (updates: Partial<PersistenceSettings>) => void;
  selectedTimezone: string;
  onTimezoneChange: (timezone: string) => void;
  startTimestamp: string;
  endTimestamp: string;
  onStartTimestampChange: (timestamp: string) => void;
  onEndTimestampChange: (timestamp: string) => void;
  onStartTimetokenChange: (timetoken: string) => void;
  onEndTimetokenChange: (timetoken: string) => void;
  loading: boolean;
  countLoading: boolean;
  onFetchHistory: () => void;
  onGetMessageCounts: () => void;
}

export function ControlsPanel({
  settings,
  onSettingsChange,
  selectedTimezone,
  onTimezoneChange,
  startTimestamp,
  endTimestamp,
  onStartTimestampChange,
  onEndTimestampChange,
  onStartTimetokenChange,
  onEndTimetokenChange,
  loading,
  countLoading,
  onFetchHistory,
  onGetMessageCounts,
}: ControlsPanelProps) {
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Message History Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="channels">Channels *</Label>
            <Input
              id="channels"
              placeholder="channel1, channel2"
              value={settings.selectedChannels}
              onChange={(e) => onSettingsChange({ selectedChannels: e.target.value })}
            />
            <p className="text-xs text-gray-500">Comma-separated channel names</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="count">Message Count</Label>
            <Select 
              value={settings.count.toString()} 
              onValueChange={(value) => onSettingsChange({ count: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="100">100 messages</SelectItem>
                <SelectItem value="1000">1,000 messages</SelectItem>
                <SelectItem value="10000">10,000 messages</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Message Order</Label>
            <div className="flex items-center space-x-2 pt-1">
              <Switch
                checked={settings.reverse}
                onCheckedChange={(reverse) => onSettingsChange({ reverse })}
              />
              <span className="text-sm">{settings.reverse ? 'Oldest First' : 'Newest First'}</span>
            </div>
          </div>

          <div className="flex items-end space-x-2">
            <Button
              onClick={onFetchHistory}
              disabled={loading}
              className="bg-pubnub-blue hover:bg-pubnub-blue/90 flex-1"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Fetching...
                </>
              ) : (
                <>
                  <Archive className="w-4 h-4 mr-2" />
                  Fetch History
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Advanced Options */}
        <div>
          <Button 
            variant="outline" 
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            className="w-full justify-between"
          >
            Advanced Options
            {showAdvancedOptions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          
          {showAdvancedOptions && (
            <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-lg">
              {/* Timezone Selector */}
              <div className="space-y-2">
                <Label htmlFor="timezone">Display Timezone</Label>
                <Select value={selectedTimezone} onValueChange={onTimezoneChange}>
                  <SelectTrigger className="w-full md:w-64">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz} {tz === selectedTimezone && '(Current)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Times shown in {selectedTimezone || 'browser timezone'}. Timetokens are always UTC.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="start-timestamp">Start Time (Exclusive)</Label>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {selectedTimezone || 'Local'}
                    </span>
                  </div>
                  <Input
                    id="start-timestamp"
                    type="datetime-local"
                    value={startTimestamp}
                    onChange={(e) => onStartTimestampChange(e.target.value)}
                    step="1"
                  />
                  <Label htmlFor="start-timetoken">Start Timetoken</Label>
                  <Input
                    id="start-timetoken"
                    placeholder="15123456789012345"
                    value={settings.startTimetoken}
                    onChange={(e) => onStartTimetokenChange(e.target.value)}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500">
                    Messages after this time/timetoken
                    <br />
                    <span className="text-blue-600">Timetoken is stored as UTC</span>
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="end-timestamp">End Time (Inclusive)</Label>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {selectedTimezone || 'Local'}
                    </span>
                  </div>
                  <Input
                    id="end-timestamp"
                    type="datetime-local"
                    value={endTimestamp}
                    onChange={(e) => onEndTimestampChange(e.target.value)}
                    step="1"
                  />
                  <Label htmlFor="end-timetoken">End Timetoken</Label>
                  <Input
                    id="end-timetoken"
                    placeholder="15123456789012345"
                    value={settings.endTimetoken}
                    onChange={(e) => onEndTimetokenChange(e.target.value)}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500">
                    Messages up to this time/timetoken
                    <br />
                    <span className="text-blue-600">Timetoken is stored as UTC</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.includeTimetoken}
                    onCheckedChange={(includeTimetoken) => onSettingsChange({ includeTimetoken })}
                  />
                  <Label className="text-sm">Include Timetoken</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.includeUUID}
                    onCheckedChange={(includeUUID) => onSettingsChange({ includeUUID })}
                  />
                  <Label className="text-sm">Include UUID</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.includeMeta}
                    onCheckedChange={(includeMeta) => onSettingsChange({ includeMeta })}
                  />
                  <Label className="text-sm">Include Metadata</Label>
                </div>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={settings.includeMessageActions}
                          onCheckedChange={(includeMessageActions) => onSettingsChange({ includeMessageActions })}
                          disabled={settings.selectedChannels.split(',').length > 1}
                        />
                        <Label className="text-sm">Message Actions</Label>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Only available for single channel queries</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={onGetMessageCounts}
                  disabled={countLoading}
                >
                  {countLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Counting...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Get Message Counts
                    </>
                  )}
                </Button>

                <div className="text-sm text-gray-500">
                  Use timetokens to fetch specific time ranges
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}