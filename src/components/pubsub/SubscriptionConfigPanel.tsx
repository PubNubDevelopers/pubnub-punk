import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Filter, Maximize2, Minimize2 } from 'lucide-react';
import ChannelsTab from './tabs/ChannelsTab';
import GroupsTab from './tabs/GroupsTab';
import FiltersTab from './tabs/FiltersTab';
import AdvancedTab from './tabs/AdvancedTab';
import type { SubscribeFormData, FilterCondition } from './types';
import { generateFilterExpression } from './utils';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

interface SubscriptionConfigPanelProps {
  subscribeData: SubscribeFormData;
  filters: FilterCondition[];
  filterLogic: '&&' | '||';
  onSubscribeDataChange: (field: string, value: any) => void;
  onFiltersChange: (filters: FilterCondition[]) => void;
  onFilterLogicChange: (logic: '&&' | '||') => void;
  // New connection controls
  isSubscribed?: boolean;
  onSubscribe?: () => void;
  onUnsubscribe?: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  initialTab?: 'channels' | 'groups' | 'filters' | 'advanced';
}

export default function SubscriptionConfigPanel({
  subscribeData,
  filters,
  filterLogic,
  onSubscribeDataChange,
  onFiltersChange,
  onFilterLogicChange,
  isSubscribed = false,
  onSubscribe,
  onUnsubscribe,
  isExpanded = false,
  onToggleExpand,
  initialTab = 'channels',
}: SubscriptionConfigPanelProps) {
  const handleCursorChange = (field: 'timetoken' | 'region', value: string) => {
    onSubscribeDataChange(`cursor.${field}`, value);
  };

  const validFilterCount = useMemo(() => {
    return (filters || []).filter(f => (f.field?.trim() || '') && (f.value?.trim() || '')).length;
  }, [filters]);

  const [activeTab, setActiveTab] = useState<'channels' | 'groups' | 'filters' | 'advanced'>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <>
      <Card data-testid="subscription-config">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center">
              <MessageCircle className="h-5 w-5 mr-2 text-blue-600" />
              SUBSCRIPTION CONFIGURATION
            </CardTitle>
            <div className="flex items-center space-x-3">
              {onToggleExpand && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleExpand}
                  className="hidden lg:flex items-center space-x-1"
                >
                  {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  <span>{isExpanded ? 'Reduce' : 'Expand'}</span>
                </Button>
              )}
              <div className="text-right text-sm">
                <div className="font-medium">{isSubscribed ? 'Connected' : 'Disconnected'}</div>
              </div>
              <Switch
                checked={isSubscribed}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onSubscribe?.();
                  } else {
                    onUnsubscribe?.();
                  }
                }}
                className="scale-110"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'channels' | 'groups' | 'filters' | 'advanced')} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="channels">CHANNELS</TabsTrigger>
              <TabsTrigger value="groups">GROUPS</TabsTrigger>
              <TabsTrigger value="filters" className="relative">
                FILTERS
                {validFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 min-w-5 text-xs">
                    {validFilterCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="advanced">ADVANCED</TabsTrigger>
            </TabsList>
            
            <ChannelsTab
              channels={subscribeData.channels}
              onChannelsChange={(value) => onSubscribeDataChange('channels', value)}
            />
            
            <GroupsTab
              channelGroups={subscribeData.channelGroups}
              onChannelGroupsChange={(value) => onSubscribeDataChange('channelGroups', value)}
            />
            
            <FiltersTab
              filters={filters}
              filterLogic={filterLogic}
              onFiltersChange={onFiltersChange}
              onFilterLogicChange={onFilterLogicChange}
            />
            
            <AdvancedTab
              cursor={subscribeData.cursor}
              withPresence={subscribeData.withPresence}
              restoreOnReconnect={subscribeData.restoreOnReconnect}
              heartbeat={subscribeData.heartbeat}
              onCursorChange={handleCursorChange}
              onWithPresenceChange={(value) => onSubscribeDataChange('withPresence', value)}
              onRestoreOnReconnectChange={(value) => onSubscribeDataChange('restoreOnReconnect', value)}
              onHeartbeatChange={(value) => onSubscribeDataChange('heartbeat', value)}
            />
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
              <div className="text-sm text-blue-700 font-mono">
                {generateFilterExpression(filters, filterLogic) || 'No filters active'}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
