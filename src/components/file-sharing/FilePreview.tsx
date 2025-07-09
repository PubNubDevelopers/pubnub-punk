import { File } from 'lucide-react';

interface FilePreviewProps {
  fileName: string;
  fileUrl: string;
  isGalleryMode?: boolean;
}

export function FilePreview({ fileName, fileUrl, isGalleryMode = false }: FilePreviewProps) {
  const isImage = fileName.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);
  
  if (isGalleryMode) {
    return (
      <div className="aspect-square mb-2 flex items-center justify-center bg-gray-50 rounded border overflow-hidden">
        {isImage ? (
          <img
            src={fileUrl}
            alt={fileName}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to file icon if image fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <div className={`flex items-center justify-center w-full h-full ${isImage ? 'hidden' : ''}`}>
          <File className="w-8 h-8 text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 min-w-0">
      <File className="w-4 h-4 text-gray-400 flex-shrink-0" />
      <a 
        href={fileUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        data-file-link
        className="truncate font-medium text-pubnub-blue hover:text-pubnub-blue/80 hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {fileName}
      </a>
    </div>
  );
}