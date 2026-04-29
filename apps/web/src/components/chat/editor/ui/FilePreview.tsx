import { X, File, Image, Film, Music } from 'lucide-react';
import { SerializedFileNode } from '../utils/schema';

interface Props {
  files: SerializedFileNode[];
  onRemove: (fileId: string) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith('image/')) return <Image size={20} />;
  if (mimeType.startsWith('video/')) return <Film size={20} />;
  if (mimeType.startsWith('audio/')) return <Music size={20} />;
  return <File size={20} />;
}

export default function FilePreview({ files, onRemove }: Props) {
  if (files.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 px-3 pt-2 pb-1 border-b border-border">
      {files.map((file) => (
        <div
          key={file.fileId}
          className="relative flex items-center gap-2 bg-muted rounded-lg px-3 py-2 pr-8 max-w-[200px]"
        >
          {file.mimeType.startsWith('image/') && file.previewUrl ? (
            <img
              src={file.previewUrl}
              alt={file.name}
              className="w-10 h-10 rounded object-cover flex-shrink-0"
            />
          ) : (
            <span className="text-muted-foreground flex-shrink-0">
              <FileIcon mimeType={file.mimeType} />
            </span>
          )}
          <div className="min-w-0">
            <p className="text-xs font-medium truncate text-foreground">
              {file.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatBytes(file.size)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onRemove(file.fileId)}
            className="absolute top-1 right-1 p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
