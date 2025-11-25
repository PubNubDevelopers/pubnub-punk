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
  const containerClass = showRawData
    ? 'pb-2 border-b border-gray-200 last:border-b-0 overflow-hidden'
    : isCompact
      ? 'bg-white p-2 rounded border shadow-sm overflow-hidden'
      : 'bg-white p-3 rounded border shadow-sm overflow-hidden';

  const channelBadgeClass = showRawData
    ? 'text-xs font-mono text-gray-500'
    : isCompact
      ? 'text-xs font-mono text-blue-600 bg-blue-50 px-1 py-0.5 rounded'
      : 'text-xs font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded';

  const preClass = showRawData
    ? 'text-xs font-mono text-gray-700 whitespace-pre-wrap break-words overflow-hidden'
    : isCompact
      ? 'text-xs font-mono bg-gray-100 p-2 rounded whitespace-pre-wrap break-words overflow-x-auto overflow-y-hidden'
      : 'text-xs font-mono bg-gray-100 p-3 rounded whitespace-pre-wrap break-words overflow-x-auto overflow-y-hidden';

  return (
    <div className={containerClass}>
      <div className={`flex items-center justify-between ${showRawData ? 'mb-1' : isCompact ? 'mb-1' : 'mb-2'}`}>
        <span className={channelBadgeClass}>
          #{message.channel}
        </span>
        <span className="text-xs text-gray-500">
          {message.timestamp || formatTimestamp(message.timetoken)}
        </span>
      </div>
      <pre className={preClass}>
        {showRawData
          ? JSON.stringify({
              channel: message.channel,
              message: message.message,
              timetoken: message.timetoken,
              publisher: message.publisher || null,
              messageType: message.messageType || null,
              userMetadata: message.userMetadata || null
            }, null, 2)
          : JSON.stringify(message.message, null, 2)}
      </pre>
    </div>
  );
};

export default MessageItem;
