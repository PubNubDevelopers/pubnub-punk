import { useEffect, useState } from 'react';
import { storage } from '@/lib/storage';
import { ConnectionStatus as ConnectionStatusType } from '@/types/settings';

export function ConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatusType>(storage.getConnectionStatus());

  useEffect(() => {
    const interval = setInterval(() => {
      const currentStatus = storage.getConnectionStatus();
      setStatus(currentStatus);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    switch (status.status) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = () => {
    switch (status.status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Connection Error';
      default:
        return 'Not Connected';
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <div className={`w-3 h-3 ${getStatusColor()} rounded-full`}></div>
      <span className="text-sm text-gray-600">{getStatusText()}</span>
    </div>
  );
}
