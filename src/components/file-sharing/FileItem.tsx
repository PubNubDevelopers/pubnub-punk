import { Checkbox } from '@/components/ui/checkbox';
import { FilePreview } from './FilePreview';
import { FileActions } from './FileActions';
import { FileItem as FileItemType } from './types';
import { formatFileSize, formatDate } from './utils';

interface FileItemProps {
  file: FileItemType;
  selected: boolean;
  onToggleSelection: (fileId: string) => void;
  onCopyUrl: (file: FileItemType) => void;
  isGalleryMode?: boolean;
}

export function FileItem({ 
  file, 
  selected, 
  onToggleSelection, 
  onCopyUrl, 
  isGalleryMode = false 
}: FileItemProps) {
  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const copyButton = target.closest('button[title="Copy file URL"]');
    const fileNameLink = target.closest('a[data-file-link]');
    if (!copyButton && !fileNameLink) {
      onToggleSelection(file.id);
    }
  };

  if (isGalleryMode) {
    return (
      <div
        className={`relative group border rounded-lg p-3 transition-all duration-200 cursor-pointer ${
          selected
            ? 'border-pubnub-blue bg-blue-50 shadow-md'
            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
        }`}
        onClick={handleClick}
      >
        {/* Selection Checkbox */}
        <div className="absolute top-2 left-2 z-10">
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggleSelection(file.id)}
            className="data-[state=checked]:bg-pubnub-blue data-[state=checked]:border-pubnub-blue bg-white/90 border-gray-300"
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        {/* Copy Button */}
        <FileActions file={file} onCopyUrl={onCopyUrl} isGalleryMode={true} />

        {/* File Preview */}
        <FilePreview fileName={file.name} fileUrl={file.url || ''} isGalleryMode={true} />

        {/* File Info */}
        <div className="space-y-1">
          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            data-file-link
            className="block text-sm font-medium text-pubnub-blue hover:text-pubnub-blue/80 hover:underline truncate"
            onClick={(e) => e.stopPropagation()}
            title={file.name}
          >
            {file.name}
          </a>
          <div className="text-xs text-gray-500">
            {formatFileSize(file.size)}
          </div>
          <div className="text-xs text-gray-400">
            {formatDate(file.created)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`grid grid-cols-[auto,1fr,100px,150px,auto] gap-4 p-4 items-center transition-colors cursor-pointer ${
        selected 
          ? 'bg-blue-50 hover:bg-blue-100' 
          : 'bg-white hover:bg-gray-50'
      }`}
      onClick={handleClick}
    >
      <div 
        className="flex items-center"
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelection(file.id);
        }}
      >
        <Checkbox
          checked={selected}
          className="data-[state=checked]:bg-pubnub-blue data-[state=checked]:border-pubnub-blue"
        />
      </div>
      
      <FilePreview fileName={file.name} fileUrl={file.url || ''} />
      
      <div className="text-sm text-gray-600">
        {formatFileSize(file.size)}
      </div>
      
      <div className="text-sm text-gray-600">
        {formatDate(file.created)}
      </div>
      
      <FileActions file={file} onCopyUrl={onCopyUrl} />
    </div>
  );
}