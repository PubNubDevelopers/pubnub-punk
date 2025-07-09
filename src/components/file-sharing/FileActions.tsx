import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FileItem } from './types';

interface FileActionsProps {
  file: FileItem;
  onCopyUrl: (file: FileItem) => void;
  isGalleryMode?: boolean;
}

export function FileActions({ file, onCopyUrl, isGalleryMode = false }: FileActionsProps) {
  if (isGalleryMode) {
    return (
      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onCopyUrl(file);
          }}
          title="Copy file URL"
          className="h-6 w-6 p-0 bg-white/90 hover:bg-white border border-gray-200"
        >
          <Copy className="w-3 h-3 text-gray-500 hover:text-gray-700" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={(e) => {
        e.stopPropagation();
        onCopyUrl(file);
      }}
      title="Copy file URL"
    >
      <Copy className="w-4 h-4 text-gray-500 hover:text-gray-700" />
    </Button>
  );
}