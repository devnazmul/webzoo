import { useEffect, useState } from 'react';
import { Loader2, Link as LinkIcon, Plus, Trash2, ExternalLink } from 'lucide-react';
import api from '@/lib/api';
import { Topic } from '@webzoo/shared';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SharedLink {
  id: string;
  url: string;
  title?: string;
  description?: string;
  createdAt: string;
  addedBy: { id: string; name: string };
}

interface Props {
  topic: Topic;
  workspaceId: string;
}

export default function LinksTab({ topic, workspaceId }: Props) {
  const [links, setLinks] = useState<SharedLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    load();
  }, [topic.id]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get(
        `/workspaces/${workspaceId}/links?topicId=${topic.id}`
      );
      setLinks(res.data.data.links ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function addLink() {
    if (!newUrl.trim()) return;
    setAdding(true);
    try {
      const res = await api.post(`/workspaces/${workspaceId}/links`, {
        url: newUrl.trim(),
        title: newTitle.trim() || undefined,
        topicId: topic.id,
      });
      setLinks((prev) => [res.data.data.link, ...prev]);
      setNewUrl('');
      setNewTitle('');
      setShowAdd(false);
    } catch {} finally {
      setAdding(false);
    }
  }

  async function deleteLink(id: string) {
    try {
      await api.delete(`/workspaces/${workspaceId}/links/${id}`);
      setLinks((prev) => prev.filter((l) => l.id !== id));
    } catch {}
  }

  function getDomain(url: string) {
    try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={18} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border flex-shrink-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {links.length} link{links.length !== 1 ? 's' : ''}
        </span>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <Plus size={13} />
          Add link
        </button>
      </div>

      {showAdd && (
        <div className="px-3 py-2.5 border-b border-border space-y-2 bg-muted/30">
          <Input
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="https://..."
            className="h-7 text-xs"
            autoFocus
          />
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Title (optional)"
            className="h-7 text-xs"
          />
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => { setShowAdd(false); setNewUrl(''); setNewTitle(''); }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="xs"
              disabled={!newUrl.trim() || adding}
              onClick={addLink}
            >
              {adding ? 'Adding…' : 'Add'}
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {links.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-10">
            <LinkIcon size={28} className="mb-2 opacity-20" />
            <p className="text-sm">No links shared yet</p>
          </div>
        ) : (
          links.map((link) => (
            <div
              key={link.id}
              className="flex items-start gap-2.5 px-3 py-2 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
            >
              <LinkIcon size={13} className="text-muted-foreground flex-shrink-0 mt-1" />
              <div className="flex-1 min-w-0">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-primary hover:underline flex items-center gap-1 truncate"
                >
                  {link.title || getDomain(link.url)}
                  <ExternalLink size={10} className="flex-shrink-0" />
                </a>
                {link.title && (
                  <p className="text-[10px] text-muted-foreground truncate">
                    {getDomain(link.url)}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground">
                  {link.addedBy.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => deleteLink(link.id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all flex-shrink-0"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
