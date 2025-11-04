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
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
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
  channelsManagedExternally?: boolean;
  channelsHelperText?: string;
  selectedChannelsList?: string[];
  advancedOptionsActive?: boolean;
  onClearAdvancedOptions?: () => void;
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
  channelsManagedExternally = false,
  channelsHelperText,
  selectedChannelsList = [],
  advancedOptionsActive = false,
  onClearAdvancedOptions,
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="channels">Channels *</Label>
            {channelsManagedExternally ? (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {selectedChannelsList.length > 0 ? (
                    selectedChannelsList.map((channel) => (
                      <Badge
                        key={channel}
                        variant="outline"
                        className="rounded-full border-green-200 bg-green-100 text-green-700 font-medium"
                      >
                        {channel}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="outline" className="rounded-full border-gray-200 bg-white text-gray-500">
                      No channels selected
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {channelsHelperText || 'Select channels from the Channel List panel'}
                </p>
              </div>
            ) : (
              <>
                <Input
                  id="channels"
                  placeholder="channel1, channel2"
                  value={settings.selectedChannels}
                  onChange={(e) => onSettingsChange({ selectedChannels: e.target.value })}
                />
                <p className="text-xs text-gray-500">Comma-separated channel names</p>
              </>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="count">Max msgs to Retrieve</Label>
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

          <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-4 md:col-span-2 xl:col-span-3 md:flex-wrap">
            <Button
              onClick={onFetchHistory}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white w-full md:min-w-[180px] md:flex-1"
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

            <Button
              variant="outline"
              onClick={onGetMessageCounts}
              disabled={countLoading}
              className="w-full md:min-w-[180px] md:flex-1"
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
          </div>
        </div>

        {/* Advanced Options */}
        <div>
          <Button 
            variant="outline" 
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            className={cn(
              "w-full justify-between",
              advancedOptionsActive && "text-green-600 font-semibold"
            )}
          >
            Advanced Options
            {showAdvancedOptions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          
          {showAdvancedOptions && (
            <div className="relative mt-4 space-y-4 px-4 pb-4 pt-4 bg-gray-50 rounded-lg">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2"
                onClick={() => onClearAdvancedOptions?.()}
                disabled={!advancedOptionsActive}
              >
                Clear
              </Button>

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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="start-timestamp">Start Time (Exclusive)</Label>
                <Input
                  id="start-timestamp"
                  type="datetime-local"
                  value={startTimestamp}
                  onChange={(e) => onStartTimestampChange(e.target.value)}
                  step="1"
                />
                <Label htmlFor="start-timetoken" className="pt-1 block">Start Timetoken</Label>
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
                <Label htmlFor="end-timestamp">End Time (Inclusive)</Label>
                <Input
                  id="end-timestamp"
                  type="datetime-local"
                  value={endTimestamp}
                  onChange={(e) => onEndTimestampChange(e.target.value)}
                  step="1"
                />
                <Label htmlFor="end-timetoken" className="pt-1 block">End Timetoken</Label>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start space-x-2">
                  <Switch
                    checked={settings.includeTimetoken}
                    onCheckedChange={(includeTimetoken) => onSettingsChange({ includeTimetoken })}
                    className="mt-0.5"
                  />
                  <Label className="text-xs font-normal text-gray-600">Include Timetoken</Label>
                </div>

                <div className="flex items-start space-x-2">
                  <Switch
                    checked={settings.includeUUID}
                    onCheckedChange={(includeUUID) => onSettingsChange({ includeUUID })}
                    className="mt-0.5"
                  />
                  <Label className="text-xs font-normal text-gray-600">Include UUID</Label>
                </div>

                <div className="flex items-start space-x-2">
                  <Switch
                    checked={settings.includeMeta}
                    onCheckedChange={(includeMeta) => onSettingsChange({ includeMeta })}
                    className="mt-0.5"
                  />
                  <Label className="text-xs font-normal text-gray-600">Include Metadata</Label>
                </div>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-start space-x-2">
                        <Switch
                          checked={settings.includeMessageActions}
                          onCheckedChange={(includeMessageActions) => onSettingsChange({ includeMessageActions })}
                          disabled={settings.selectedChannels.split(',').length > 1}
                          className="mt-0.5"
                        />
                        <Label className="text-xs font-normal text-gray-600">Message Actions</Label>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Only available for single channel queries</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
