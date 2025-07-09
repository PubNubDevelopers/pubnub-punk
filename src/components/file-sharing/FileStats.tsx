import { File, HardDrive, Calendar } from 'lucide-react';
import { ChannelStats } from './types';
import { formatFileSize, formatDate } from './utils';

interface FileStatsProps {
  channelStats: ChannelStats;
  searchTerm: string;
  filteredCount: number;
  filteredSize: number;
  selectedChannel: string;
}

export function FileStats({ 
  channelStats, 
  searchTerm, 
  filteredCount, 
  filteredSize, 
  selectedChannel 
}: FileStatsProps) {
  return (
    <div className="flex items-center gap-6 text-sm text-gray-600">
      <div className="flex items-center gap-2">
        <File className={`w-4 h-4 ${searchTerm ? 'text-pubnub-blue' : ''}`} />
        <span className={searchTerm ? 'text-pubnub-blue font-medium' : ''}>
          {searchTerm ? 
            `${filteredCount} of ${channelStats.totalFiles} files` :
            `${channelStats.totalFiles} files`
          }
        </span>
      </div>
      <div className="flex items-center gap-2">
        <HardDrive className={`w-4 h-4 ${searchTerm ? 'text-pubnub-blue' : ''}`} />
        <span className={searchTerm ? 'text-pubnub-blue font-medium' : ''}>
          {searchTerm ? 
            `${formatFileSize(filteredSize)} of ${formatFileSize(channelStats.totalSize)}` :
            formatFileSize(channelStats.totalSize)
          }
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4" />
        <span>Last activity: {formatDate(channelStats.lastActivity)}</span>
      </div>
    </div>
  );
}