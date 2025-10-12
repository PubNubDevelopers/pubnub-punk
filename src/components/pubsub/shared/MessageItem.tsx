import React from 'react';
import { MessageData } from '../types';
import { formatTimestamp } from '../utils';

interface MessageItemProps {
  message: MessageData;
  showRawData: boolean;
  isCompact?: boolean;
}

const MessageItem: React.FC<MessageItemProps> = ({ 
  message, 
  showRawData, 
  isCompact = false 
}) => {
  const containerClass = isCompact 
    ? "bg-white p-2 rounded border shadow-sm"
    : "bg-white p-3 rounded border shadow-sm";
    
  const channelBadgeClass = isCompact
    ? "text-xs font-mono text-blue-600 bg-blue-50 px-1 py-0.5 rounded"
    : "text-xs font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded";
    
  const preClass = isCompact
    ? "text-xs font-mono bg-gray-100 p-2 rounded"
    : "text-xs font-mono bg-gray-100 p-3 rounded";

  return (
    <div className={containerClass}>
      <div className={`flex items-center justify-between ${isCompact ? 'mb-1' : 'mb-2'}`}>
        <span className={channelBadgeClass}>
          #{message.channel}
        </span>
        <span className="text-xs text-gray-500">
          {message.timestamp || formatTimestamp(message.timetoken)}
        </span>
      </div>
      {showRawData ? (
        <pre className={preClass}>
          {JSON.stringify({
            channel: message.channel,
            message: message.message,
            timetoken: message.timetoken,
            publisher: message.publisher || null,
            messageType: message.messageType || null,
            userMetadata: message.userMetadata || null
          }, null, 2)}
        </pre>
      ) : (
        <pre className={preClass}>
          {JSON.stringify(message.message, null, 2)}
        </pre>
      )}
    </div>
  );
};

export default MessageItem;