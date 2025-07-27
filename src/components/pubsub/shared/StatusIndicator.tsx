import React from 'react';
import { StatusIndicatorProps } from '../types';

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  isSubscribed,
  messageCount,
  presenceEventCount,
  receivePresenceEvents,
  activeFiltersCount = 0,
  connectionStatus = 'disconnected'
}) => {
  // Generate status text based on subscription state and message counts  
  const getStatusText = () => {
    if (!isSubscribed) {
      return "Subscribe to channels to see messages here";
    }

    const messagePart = messageCount === 1 ? "1 message" : `${messageCount} messages`;
    const presencePart = receivePresenceEvents 
      ? ` • ${presenceEventCount === 1 ? "1 presence event" : `${presenceEventCount} presence events`}`
      : "";
    
    let statusText = `Listening for messages • ${messagePart}${presencePart}`;
    
    if (activeFiltersCount > 0) {
      statusText += ` • ${activeFiltersCount} active filter${activeFiltersCount === 1 ? '' : 's'}`;
    }

    return statusText;
  };

  // Get connection status indicator
  const getConnectionIndicator = () => {
    if (!isSubscribed) {
      return <div className="w-2 h-2 bg-gray-400 rounded-full" title="Not connected" />;
    }

    switch (connectionStatus) {
      case 'connected':
        return <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Connected" />;
      case 'connecting':
        return <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" title="Connecting..." />;
      case 'reconnecting':
        return <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" title="Reconnecting..." />;
      case 'disconnected':
      default:
        return <div className="w-2 h-2 bg-red-500 rounded-full" title="Disconnected" />;
    }
  };

  return (
    <div className="flex items-center space-x-2">
      {getConnectionIndicator()}
      <p className="text-sm text-gray-600">
        {getStatusText()}
      </p>
      {activeFiltersCount > 0 && (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
          {activeFiltersCount} filter{activeFiltersCount === 1 ? '' : 's'}
        </span>
      )}
    </div>
  );
};