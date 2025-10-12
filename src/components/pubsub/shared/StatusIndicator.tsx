import React from 'react';
import { Wifi, WifiOff, Filter } from 'lucide-react';

interface StatusIndicatorProps {
  isConnected: boolean;
  channels: string[];
  channelGroups: string[];
  hasFilters: boolean;
  filterExpression?: string;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  isConnected,
  channels,
  channelGroups,
  hasFilters,
  filterExpression
}) => {
  const totalSubscriptions = channels.length + channelGroups.length;

  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-2">
        {isConnected ? (
          <>
            <Wifi className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-600">Connected</span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-400">Disconnected</span>
          </>
        )}
      </div>
      
      {isConnected && totalSubscriptions > 0 && (
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">
            Subscribed to {totalSubscriptions} {totalSubscriptions === 1 ? 'target' : 'targets'}
          </span>
          {channels.length > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
              {channels.length} channel{channels.length !== 1 ? 's' : ''}
            </span>
          )}
          {channelGroups.length > 0 && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
              {channelGroups.length} group{channelGroups.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}
      
      {hasFilters && filterExpression && (
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-orange-600" />
          <span className="text-xs text-orange-600" title={filterExpression}>
            Filters Active
          </span>
        </div>
      )}
    </div>
  );
};

export default StatusIndicator;