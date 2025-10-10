import type { Attachment } from 'ai';
import { 
  FileText, 
  FileImage, 
  FileSpreadsheet, 
  File as FileIcon,
  Download,
  ExternalLink,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoaderIcon } from '../icons';

// File type detection helper
const getFileTypeInfo = (contentType?: string, name?: string) => {
  if (!contentType && !name) return { icon: FileIcon, color: 'text-zinc-500', label: 'File' };

  // Check by content type first
  if (contentType?.startsWith('image')) {
    return { icon: FileImage, color: 'text-green-600', label: 'Image' };
  }
  if (contentType === 'application/pdf') {
    return { icon: FileText, color: 'text-red-600', label: 'PDF' };
  }
  if (contentType === 'text/plain') {
    return { icon: FileText, color: 'text-blue-600', label: 'Text' };
  }
  if (contentType === 'text/markdown') {
    return { icon: FileText, color: 'text-purple-600', label: 'Markdown' };
  }
  if (contentType?.includes('spreadsheet') || contentType?.includes('excel')) {
    return { icon: FileSpreadsheet, color: 'text-emerald-600', label: 'Spreadsheet' };
  }
  if (contentType === 'text/csv') {
    return { icon: FileSpreadsheet, color: 'text-orange-600', label: 'CSV' };
  }

  // Fallback to file extension
  const extension = name?.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
      return { icon: FileImage, color: 'text-green-600', label: 'Image' };
    case 'pdf':
      return { icon: FileText, color: 'text-red-600', label: 'PDF' };
    case 'txt':
      return { icon: FileText, color: 'text-blue-600', label: 'Text' };
    case 'md':
      return { icon: FileText, color: 'text-purple-600', label: 'Markdown' };
    case 'csv':
      return { icon: FileSpreadsheet, color: 'text-orange-600', label: 'CSV' };
    case 'xls':
    case 'xlsx':
      return { icon: FileSpreadsheet, color: 'text-emerald-600', label: 'Excel' };
    default:
      return { icon: FileIcon, color: 'text-zinc-500', label: 'File' };
  }
};

// Format file size helper
const formatFileSize = (bytes?: number) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.round(bytes / (1024 * 1024))} MB`;
};

export const PreviewAttachment = ({
  attachment,
  isUploading = false,
  showActions = false,
  size = 'default',
  onRemove,
}: {
  attachment: Attachment;
  isUploading?: boolean;
  showActions?: boolean;
  size?: 'small' | 'default' | 'large';
  onRemove?: () => void;
}) => {
  const { name, url, contentType } = attachment;
  const fileInfo = getFileTypeInfo(contentType, name);
  const FileTypeIcon = fileInfo.icon;
  
  // Size configurations
  const sizeClasses = {
    small: {
      container: 'w-16 h-12',
      icon: 'w-4 h-4',
      text: 'text-xs max-w-12',
    },
    default: {
      container: 'w-20 h-16',
      icon: 'w-5 h-5',
      text: 'text-xs max-w-16',
    },
    large: {
      container: 'w-24 h-20',
      icon: 'w-6 h-6',
      text: 'text-sm max-w-20',
    },
  };
  
  const classes = sizeClasses[size];

  return (
    <div data-testid="input-attachment-preview" className="group relative">
      {/* Remove button for attachments with actions */}
      {showActions && onRemove && (
        <button
          onClick={onRemove}
          className="absolute -top-1 -right-1 z-20 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          title="Remove attachment"
        >
          <X className="w-3 h-3" />
        </button>
      )}

      <div 
        className={`${classes.container} aspect-video bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700 relative flex flex-col items-center justify-center overflow-hidden transition-all duration-200 hover:shadow-md hover:scale-105`}
      >
        {contentType?.startsWith('image') ? (
          <div className="relative w-full h-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={url}
              src={url}
              alt={name ?? 'An image attachment'}
              className="w-full h-full object-cover rounded-lg"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-200 rounded-lg" />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-1 p-2">
            <FileTypeIcon className={`${classes.icon} ${fileInfo.color}`} />
            <div className={`${classes.text} text-center text-zinc-600 dark:text-zinc-400 font-medium truncate`}>
              {fileInfo.label}
            </div>
          </div>
        )}

        {isUploading && (
          <div
            data-testid="input-attachment-loader"
            className="absolute inset-0 bg-white/80 dark:bg-black/80 flex items-center justify-center rounded-lg"
          >
            <div className="animate-spin text-blue-500">
              <LoaderIcon size={20} />
            </div>
          </div>
        )}

        {showActions && url && !isUploading && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 z-10">
            <Button
              size="sm"
              variant="secondary"
              className="h-7 px-2 text-xs"
              onClick={() => window.open(url, '_blank')}
            >
              <ExternalLink className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="h-7 px-2 text-xs"
              onClick={() => {
                const link = document.createElement('a');
                link.href = url;
                link.download = name || 'attachment';
                link.click();
              }}
            >
              <Download className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
      
      <div className="mt-1 flex flex-col gap-0.5">
        <div className={`${classes.text} text-zinc-700 dark:text-zinc-300 font-medium truncate`} title={name}>
          {name}
        </div>
        {(attachment as any).size && (
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            {formatFileSize((attachment as any).size)}
          </div>
        )}
      </div>
    </div>
  );
};
