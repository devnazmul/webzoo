import { useEffect, useState } from 'react';
import { Loader2, FileIcon, Download } from 'lucide-react';
import api from '@/lib/api';
import { Topic } from '@webzoo/shared';

interface MediaFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
  uploader: { id: string; name: string };
}

interface Props {
  topic: Topic;
  workspaceId: string;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaTab({ topic, workspaceId }: Props) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    load();
  }, [topic.id]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get(
        `/workspaces/${workspaceId}/media?topicId=${topic.id}`
      );
      setFiles(res.data.data.files ?? []);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={18} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
  const images = files.filter((f) => f.mimeType.startsWith('image/'));
  const others = files.filter((f) => !f.mimeType.startsWith('image/'));

  return (
    <div className="flex flex-col h-full overflow-y-auto p-3 space-y-4">
      {files.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-10">
          <FileIcon size={28} className="mb-2 opacity-20" />
          <p className="text-sm">No files shared yet</p>
        </div>
      ) : (
        <>
          {images.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Images
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {images.map((f) => (
                  <a
                    key={f.id}
                    href={`${baseUrl}${f.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aspect-square rounded-lg overflow-hidden bg-muted border border-border hover:opacity-80 transition-opacity"
                  >
                    <img
                      src={`${baseUrl}${f.url}`}
                      alt={f.originalName}
                      className="w-full h-full object-cover"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          {others.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Files
              </p>
              <div className="space-y-1.5">
                {others.map((f) => (
                  <a
                    key={f.id}
                    href={`${baseUrl}${f.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border hover:bg-muted/60 transition-colors group"
                  >
                    <FileIcon size={16} className="text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{f.originalName}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatSize(f.size)} · {f.uploader.name}
                      </p>
                    </div>
                    <Download size={13} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
