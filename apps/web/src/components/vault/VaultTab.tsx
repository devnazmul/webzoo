import { useEffect, useState, useRef } from 'react';
import {
  Plus, FileText, Loader2, Trash2,
  Bold, Italic, Strikethrough, Code,
  List, ListOrdered, Heading2, Quote,
  CodeSquare, Eye, EyeOff, ArrowLeft,
} from 'lucide-react';
import api from '@/lib/api';
import { Topic } from '@webzoo/shared';
import { cn } from '@/lib/utils';
import MessageRenderer from '@/components/chat/MessageRenderer';

interface VaultDoc {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string };
}

interface Props {
  topic: Topic;
  workspaceId: string;
}

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function VaultTab({ topic, workspaceId }: Props) {
  const [docs, setDocs] = useState<VaultDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeDoc, setActiveDoc] = useState<VaultDoc | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { load(); }, [topic.id]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  }, [editContent]);

  // Auto-save 2s after last keystroke
  useEffect(() => {
    if (!dirty || !activeDoc) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveDoc(false), 2000);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [editContent, editTitle, dirty]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get(`/workspaces/${workspaceId}/vault?topicId=${topic.id}`);
      setDocs(res.data.data.documents ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function createDoc() {
    try {
      const res = await api.post(`/workspaces/${workspaceId}/vault`, {
        title: 'Untitled',
        content: '',
        topicId: topic.id,
      });
      const doc = res.data.data.document;
      setDocs((prev) => [doc, ...prev]);
      openDoc(doc);
    } catch {}
  }

  async function saveDoc(showFeedback = true) {
    if (!activeDoc) return;
    setSaving(true);
    try {
      const res = await api.patch(`/workspaces/${workspaceId}/vault/${activeDoc.id}`, {
        title: editTitle || 'Untitled',
        content: editContent,
      });
      const updated = res.data.data.document;
      setDocs((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      setActiveDoc(updated);
      setDirty(false);
    } catch {} finally {
      setSaving(false);
    }
  }

  async function deleteDoc(id: string) {
    try {
      await api.delete(`/workspaces/${workspaceId}/vault/${id}`);
      setDocs((prev) => prev.filter((d) => d.id !== id));
      if (activeDoc?.id === id) setActiveDoc(null);
    } catch {}
  }

  function openDoc(doc: VaultDoc) {
    setActiveDoc(doc);
    setEditTitle(doc.title === 'Untitled' ? '' : doc.title);
    setEditContent(doc.content);
    setPreview(false);
    setDirty(false);
  }

  function handleContentChange(val: string) {
    setEditContent(val);
    setDirty(true);
  }

  function handleTitleChange(val: string) {
    setEditTitle(val);
    setDirty(true);
  }

  // Insert markdown syntax at cursor
  function insertSyntax(before: string, after = '', placeholder = 'text') {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = editContent.slice(start, end) || placeholder;
    const inserted = before + selected + after;
    const next = editContent.slice(0, start) + inserted + editContent.slice(end);
    handleContentChange(next);
    setTimeout(() => {
      ta.focus();
      const cursor = start + before.length + selected.length + after.length;
      ta.setSelectionRange(cursor, cursor);
    }, 0);
  }

  function insertLine(prefix: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const before = editContent.slice(0, start);
    const lineStart = before.lastIndexOf('\n') + 1;
    const lineContent = editContent.slice(lineStart, start);
    const already = lineContent.startsWith(prefix);
    let next: string;
    if (already) {
      next = editContent.slice(0, lineStart) + editContent.slice(lineStart + prefix.length);
    } else {
      next = editContent.slice(0, lineStart) + prefix + editContent.slice(lineStart);
    }
    handleContentChange(next);
    setTimeout(() => { ta.focus(); }, 0);
  }

  const toolbarBtn = (onClick: () => void, icon: React.ReactNode, title: string) => (
    <button
      key={title}
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
    >
      {icon}
    </button>
  );

  // ─── Editor view ───
  if (activeDoc) {
    return (
      <div className="flex flex-col h-full">
        {/* Top bar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border flex-shrink-0">
          <button
            type="button"
            onClick={() => { saveDoc(false); setActiveDoc(null); }}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <ArrowLeft size={15} />
          </button>
          <input
            value={editTitle}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Untitled"
            className="flex-1 text-sm font-semibold bg-transparent outline-none placeholder:text-muted-foreground/50 min-w-0"
          />
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {dirty && !saving && (
              <span className="text-[10px] text-muted-foreground">Unsaved</span>
            )}
            {saving && (
              <span className="text-[10px] text-muted-foreground">Saving…</span>
            )}
            {!dirty && !saving && activeDoc.content && (
              <span className="text-[10px] text-muted-foreground">Saved</span>
            )}
            <button
              type="button"
              onClick={() => setPreview((v) => !v)}
              title={preview ? 'Edit' : 'Preview'}
              className={cn(
                'p-1.5 rounded transition-colors',
                preview
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
              )}
            >
              {preview ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        {/* Formatting toolbar — hidden in preview */}
        {!preview && (
          <div className="flex items-center gap-0.5 px-2 py-1 border-b border-border/50 flex-wrap bg-muted/20 flex-shrink-0">
            {toolbarBtn(() => insertSyntax('## ', '', 'Heading'), <Heading2 size={13} />, 'Heading')}
            <div className="w-px h-4 bg-border mx-0.5" />
            {toolbarBtn(() => insertSyntax('**', '**', 'bold'), <Bold size={13} />, 'Bold')}
            {toolbarBtn(() => insertSyntax('_', '_', 'italic'), <Italic size={13} />, 'Italic')}
            {toolbarBtn(() => insertSyntax('~~', '~~', 'strikethrough'), <Strikethrough size={13} />, 'Strikethrough')}
            <div className="w-px h-4 bg-border mx-0.5" />
            {toolbarBtn(() => insertSyntax('`', '`', 'code'), <Code size={13} />, 'Inline code')}
            {toolbarBtn(() => insertSyntax('```\n', '\n```', 'code'), <CodeSquare size={13} />, 'Code block')}
            <div className="w-px h-4 bg-border mx-0.5" />
            {toolbarBtn(() => insertLine('- '), <List size={13} />, 'Bullet list')}
            {toolbarBtn(() => insertLine('1. '), <ListOrdered size={13} />, 'Numbered list')}
            {toolbarBtn(() => insertLine('> '), <Quote size={13} />, 'Blockquote')}
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 overflow-y-auto">
          {preview ? (
            <div className="px-4 py-4 min-h-full">
              {editContent ? (
                <MessageRenderer content={editContent} />
              ) : (
                <p className="text-sm text-muted-foreground italic">Nothing to preview.</p>
              )}
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={editContent}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder={"Start writing…\n\nSupports **bold**, _italic_, `code`, ## headings, lists, and more."}
              className="w-full px-4 py-4 text-sm bg-transparent resize-none outline-none text-foreground placeholder:text-muted-foreground/50 font-mono leading-relaxed min-h-full"
              style={{ minHeight: '100%' }}
              spellCheck
              autoFocus
            />
          )}
        </div>
      </div>
    );
  }

  // ─── Document list view ───
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
          {docs.length} doc{docs.length !== 1 ? 's' : ''}
        </span>
        <button
          type="button"
          onClick={createDoc}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <Plus size={13} />
          New doc
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-10">
            <FileText size={28} className="mb-2 opacity-20" />
            <p className="text-sm">No documents yet</p>
            <button
              type="button"
              onClick={createDoc}
              className="mt-2 text-xs text-primary hover:underline"
            >
              Create the first one
            </button>
          </div>
        ) : (
          docs.map((doc) => (
            <div
              key={doc.id}
              onClick={() => openDoc(doc)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer group hover:bg-muted/60 transition-colors"
            >
              <FileText size={14} className="text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {doc.title || 'Untitled'}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {doc.author.name} · {timeAgo(doc.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); deleteDoc(doc.id); }}
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
