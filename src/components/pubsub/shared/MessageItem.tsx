import React from 'react';
import { MessageItemProps } from '../types';

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  showRawData,
  type = 'message'
}) => {
  // Format timestamp from timetoken
  const formatTimestamp = (timetoken: string | number) => {
    const timestamp = typeof timetoken === 'string' ? parseInt(timetoken) : timetoken;
    return new Date(timestamp / 10000).toLocaleTimeString();
  };

  // Get presence action style
  const getPresenceActionStyle = (action: string) => {
    switch (action) {
      case 'join':
        return 'text-green-600 bg-green-100';
      case 'leave':
        return 'text-red-600 bg-red-100';
      case 'timeout':
        return 'text-yellow-600 bg-yellow-100';
      case 'state-change':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (showRawData) {
    // Raw data view
    const rawData = type === 'presence' 
      ? {
          channel: message.channel,
          action: (message as any).action,
          occupancy: (message as any).occupancy,
          uuid: (message as any).uuid,
          timestamp: (message as any).timestamp,
          timetoken: message.timetoken,
          messageType: (message as any).messageType || 'presence'
        }
      : {
          channel: message.channel,
          timetoken: message.timetoken,
          publisher: (message as any).publisher || null,
          subscription: (message as any).subscription || null,
          messageType: (message as any).messageType || null,
          message: (message as any).message,
          meta: (message as any).meta || null
        };

    const bgColor = type === 'presence' ? 'bg-green-100' : 'bg-gray-100';
    
    return (
      <pre className={`font-mono text-xs ${bgColor} p-2 rounded overflow-x-auto whitespace-pre-wrap`}>
        {JSON.stringify(rawData, null, 2)}
      </pre>
    );
  }

  if (type === 'presence') {
    // Formatted presence event view
    const presenceEvent = message as any;

    return (
      <div className="bg-white rounded border border-green-200 shadow-sm p-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-mono text-green-600 bg-green-100 px-1 py-0.5 rounded">
            #{presenceEvent.channel}
          </span>
          <span className="text-xs text-gray-500 font-mono">
            {formatTimestamp(presenceEvent.timetoken)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${getPresenceActionStyle(presenceEvent.action)}`}>
              {presenceEvent.action}
            </span>
            <span className="text-xs text-gray-600">
              {presenceEvent.uuid}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <span>Occupancy: {presenceEvent.occupancy}</span>
          </div>
        </div>
        {presenceEvent.state && (
          <div className="mt-2">
            <pre className="font-mono text-xs bg-green-50 p-2 rounded overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(presenceEvent.state, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  }

  // Formatted message view
  const msg = message as any;

  return (
    <div className="bg-white rounded border shadow-sm p-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono text-blue-600 bg-blue-50 px-1 py-0.5 rounded">
            #{msg.channel}
          </span>
          {msg.publisher && (
            <span className="text-xs text-gray-500 font-mono">
              from: {msg.publisher}
            </span>
          )}
          {msg.messageType && (
            <span className="text-xs text-purple-600 bg-purple-50 px-1 py-0.5 rounded font-mono">
              {msg.messageType}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500 font-mono">
          {formatTimestamp(msg.timetoken)}
        </span>
      </div>
      
      {/* Message content */}
      <pre className="font-mono text-xs bg-gray-100 p-2 rounded overflow-x-auto whitespace-pre-wrap">
        {JSON.stringify(msg.message, null, 2)}
      </pre>
      
      {/* Meta information */}
      {msg.meta && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="flex items-center mb-1">
            <span className="text-xs font-medium text-gray-500">Meta:</span>
          </div>
          <pre className="font-mono text-xs bg-yellow-50 p-2 rounded overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(msg.meta, null, 2)}
          </pre>
        </div>
      )}
      
      {/* Subscription information */}
      {msg.subscription && msg.subscription !== msg.channel && (
        <div className="mt-1 text-xs text-gray-400">
          via subscription: {msg.subscription}
        </div>
      )}
    </div>
  );
};