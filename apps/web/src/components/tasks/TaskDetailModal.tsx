import MessageRenderer from "@/components/chat/MessageRenderer";
import LexicalEditor from "@/components/chat/editor/LexicalEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { Task, TaskStatus } from "@/store/task.store";
import {
  CheckSquare,
  Clock,
  Edit2,
  Plus,
  Square,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Assignee {
  id: string;
  name: string;
}
interface Comment {
  id: string;
  content: string;
  author: { id: string; name: string };
  createdAt: string;
}

interface Props {
  task: Task;
  workspaceId: string;
  workspaceMembers: { id: string; label: string }[];
  statuses: TaskStatus[];
  onClose: () => void;
  onUpdated: (task: Task) => void;
}

const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const PRIORITY_BG: Record<string, string> = {
  LOW:    'bg-slate-100 dark:bg-[#222e35] text-slate-500 border border-slate-200 dark:border-slate-700',
  MEDIUM: 'bg-blue-50 dark:bg-blue-950/10 text-blue-500 border border-blue-100 dark:border-blue-900/40',
  HIGH:   'bg-orange-50 dark:bg-orange-950/10 text-orange-500 border border-orange-100 dark:border-orange-900/40',
  URGENT: 'bg-red-50 dark:bg-red-950/10 text-red-500 border border-red-100 dark:border-red-900/40',
};

function extractPlain(content: string) {
  try {
    const p = JSON.parse(content);
    return p?.plainText ?? content;
  } catch {
    return content;
  }
}

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString();
}

export default function TaskDetailModal({
  task,
  workspaceId,
  workspaceMembers,
  statuses,
  onClose,
  onUpdated,
}: Props) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [editingDesc, setEditingDesc] = useState(false);
  const [statusId, setStatusId] = useState(task.statusId);
  const [priority, setPriority] = useState(task.priority);
  const [dueDate, setDueDate] = useState(
    task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "",
  );
  const [saving, setSaving] = useState(false);
  const [subtasks, setSubtasks] = useState(task.subtasks ?? []);
  const [newSubtask, setNewSubtask] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [showAssigneeMenu, setShowAssigneeMenu] = useState(false);
  const assigneeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadComments();
    loadAssignees();
    function handleClick(e: MouseEvent) {
      if (
        assigneeRef.current &&
        !assigneeRef.current.contains(e.target as Node)
      ) {
        setShowAssigneeMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function loadComments() {
    try {
      const res = await api.get(
        `/workspaces/${workspaceId}/tasks/${task.id}/comments`,
      );
      setComments(res.data.data.comments ?? []);
    } catch {}
  }

  async function loadAssignees() {
    try {
      const res = await api.get(
        `/workspaces/${workspaceId}/tasks/${task.id}/assignees`,
      );
      setAssignees(res.data.data.assignees ?? []);
    } catch {}
  }

  async function patch(data: Record<string, any>) {
    setSaving(true);
    try {
      const res = await api.patch(
        `/workspaces/${workspaceId}/tasks/${task.id}`,
        data,
      );
      onUpdated(res.data.data.task);
    } catch {
    } finally {
      setSaving(false);
    }
  }

  async function saveDescription(content: string) {
    setDescription(content);
    await patch({ description: content });
    setEditingDesc(false);
  }

  async function toggleAssignee(userId: string) {
    const already = assignees.find((a) => a.id === userId);
    if (already) {
      const res = await api.delete(
        `/workspaces/${workspaceId}/tasks/${task.id}/assignees/${userId}`,
      );
      setAssignees(res.data.data.assignees);
    } else {
      const res = await api.post(
        `/workspaces/${workspaceId}/tasks/${task.id}/assignees`,
        { userId },
      );
      setAssignees(res.data.data.assignees);
    }
  }

  async function addSubtask() {
    if (!newSubtask.trim()) return;
    try {
      const res = await api.post(
        `/workspaces/${workspaceId}/tasks/${task.id}/subtasks`,
        { title: newSubtask.trim() },
      );
      setSubtasks((prev) => [...prev, res.data.data.subTask]);
      setNewSubtask("");
    } catch {}
  }

  async function toggleSubtask(id: string, completed: boolean) {
    try {
      const res = await api.patch(
        `/workspaces/${workspaceId}/tasks/${task.id}/subtasks/${id}`,
        { completed },
      );
      setSubtasks((prev) =>
        prev.map((s) => (s.id === id ? { ...s, completed } : s)),
      );
    } catch {}
  }

  async function deleteSubtask(id: string) {
    try {
      await api.delete(
        `/workspaces/${workspaceId}/tasks/${task.id}/subtasks/${id}`,
      );
      setSubtasks((prev) => prev.filter((s) => s.id !== id));
    } catch {}
  }

  async function postComment(content: string) {
    try {
      const plain = extractPlain(content);
      if (!plain.trim()) return;
      const res = await api.post(
        `/workspaces/${workspaceId}/tasks/${task.id}/comments`,
        { content: plain },
      );
      setComments((prev) => [...prev, res.data.data.comment]);
    } catch {}
  }

  async function deleteComment(id: string) {
    try {
      await api.delete(
        `/workspaces/${workspaceId}/tasks/${task.id}/comments/${id}`,
      );
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch {}
  }

  const completedCount = subtasks.filter((s) => s.completed).length;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-start justify-center z-50 p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-250">
      <div
        className="bg-card border border-border rounded-[var(--kanban-card-radius)] shadow-2xl w-full max-w-[var(--modal-max-width)] my-auto flex flex-col overflow-hidden"
        style={{ maxHeight: "var(--modal-max-height)" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border flex-shrink-0">
          <span
            className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0",
              PRIORITY_BG[priority],
            )}
          >
            {priority}
          </span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() =>
              title.trim() !== task.title && patch({ title: title.trim() })
            }
            className="flex-1 text-lg font-semibold bg-transparent outline-none border-b border-transparent focus:border-whatsapp-teal transition-colors min-w-0"
          />
          {saving && (
            <span className="text-xs text-muted-foreground flex-shrink-0">
              Saving…
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-full hover:bg-muted transition-colors flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-y-auto md:overflow-hidden">
          {/* Left panel */}
          <div className="flex-1 md:overflow-y-auto overflow-visible p-4 sm:p-6 space-y-5">
            {/* Meta grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
                  Status
                </label>
                <select
                  value={statusId}
                  onChange={(e) => {
                    setStatusId(e.target.value);
                    patch({ statusId: e.target.value });
                  }}
                  className="w-full text-sm bg-muted border border-border rounded-full px-3.5 py-1.5 outline-none focus:border-whatsapp-teal focus:ring-1 focus:ring-whatsapp-teal transition-all"
                >
                  {statuses.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => {
                    setPriority(e.target.value as any);
                    patch({ priority: e.target.value });
                  }}
                  className="w-full text-sm bg-muted border border-border rounded-full px-3.5 py-1.5 outline-none focus:border-whatsapp-teal focus:ring-1 focus:ring-whatsapp-teal transition-all"
                >
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
                  Due date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => {
                    setDueDate(e.target.value);
                    patch({ dueDate: e.target.value });
                  }}
                  className="w-full text-sm bg-muted border border-border rounded-full px-3.5 py-1.5 outline-none focus:border-whatsapp-teal focus:ring-1 focus:ring-whatsapp-teal transition-all"
                />
              </div>

              {/* Assignees */}
              <div ref={assigneeRef}>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 mb-1.5">
                  <Users size={10} /> Assignees
                </label>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {assignees.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center gap-1 bg-whatsapp-teal/15 text-whatsapp-teal text-xs px-2.5 py-0.5 rounded-full border border-whatsapp-teal/10"
                    >
                      <span>{a.name.split(" ")[0]}</span>
                      <button
                        type="button"
                        onClick={() => toggleAssignee(a.id)}
                        className="hover:text-destructive text-[11px] font-bold"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowAssigneeMenu((v) => !v)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border rounded-full px-3 py-0.5 transition-colors"
                    >
                      <Plus size={10} /> Add
                    </button>
                    {showAssigneeMenu && (
                      <div className="absolute top-7 left-0 w-44 bg-popover border border-border rounded-lg shadow-lg z-50 py-1 overflow-hidden">
                        {workspaceMembers.map((m) => {
                          const assigned = assignees.some((a) => a.id === m.id);
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => toggleAssignee(m.id)}
                              className={cn(
                                "flex items-center justify-between w-full px-3 py-1.5 text-sm hover:bg-muted transition-colors",
                                assigned && "text-whatsapp-teal font-semibold",
                              )}
                            >
                              {m.label}
                              {assigned && <CheckSquare size={12} className="text-whatsapp-teal" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Description
                </label>
                {!editingDesc && (
                  <button
                    type="button"
                    onClick={() => setEditingDesc(true)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Edit2 size={11} /> Edit
                  </button>
                )}
              </div>

              {editingDesc ? (
                <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
                  <LexicalEditor
                    topicId={task.id}
                    topicName="description"
                    users={workspaceMembers}
                    topics={[]}
                    onSend={saveDescription}
                  />
                  <div className="px-3 pb-2 flex gap-2">
                    <Button
                      size="sm"
                      type="button"
                      onClick={() => setEditingDesc(false)}
                      variant="ghost"
                      className="h-8 text-xs rounded-full border border-border"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : description ? (
                <div
                  className="prose prose-sm max-w-none bg-muted/30 rounded-xl p-3.5 border border-border/30 cursor-pointer hover:bg-muted/50 transition-colors text-foreground"
                  onClick={() => setEditingDesc(true)}
                >
                  <MessageRenderer content={description} />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingDesc(true)}
                  className="w-full text-left text-sm text-muted-foreground bg-muted/30 hover:bg-muted/50 rounded-xl p-3.5 border border-dashed border-border transition-colors italic"
                >
                  Add a description…
                </button>
              )}
            </div>

            {/* Checklist */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <CheckSquare size={10} /> Checklist
                  {subtasks.length > 0 && (
                    <span className="font-normal">
                      ({completedCount}/{subtasks.length})
                    </span>
                  )}
                </label>
              </div>

              {subtasks.length > 0 && (
                <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-whatsapp-teal rounded-full transition-all"
                    style={{
                      width: `${subtasks.length ? (completedCount / subtasks.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              )}

              <div className="space-y-1.5 mb-3">
                {subtasks.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-2.5 group/sub py-0.5"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSubtask(s.id, !s.completed)}
                      className="flex-shrink-0 text-muted-foreground hover:text-whatsapp-teal transition-colors"
                    >
                      {s.completed ? (
                        <CheckSquare size={16} className="text-whatsapp-teal" />
                      ) : (
                        <Square size={16} />
                       )}
                    </button>
                    <span
                      className={cn(
                        "flex-1 text-sm text-foreground",
                        s.completed && "line-through text-muted-foreground",
                      )}
                    >
                      {s.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteSubtask(s.id)}
                      className="opacity-0 group-hover/sub:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <Input
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addSubtask();
                  }}
                  placeholder="Add an item…"
                  className="h-8 text-xs rounded-full border border-border bg-card px-3.5 focus-visible:ring-whatsapp-teal focus-visible:ring-offset-0"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={addSubtask}
                  disabled={!newSubtask.trim()}
                  className="h-8 text-xs px-3.5 rounded-full bg-whatsapp-teal hover:bg-whatsapp-teal/90 text-white flex-shrink-0 border-0 flex items-center justify-center font-medium"
                >
                  <Plus size={12} className="mr-1" /> Add
                </Button>
              </div>
            </div>
          </div>

          {/* Right panel — comments */}
          <div className="w-full md:w-[var(--modal-sidebar-width)] flex-shrink-0 border-t md:border-t-0 md:border-l border-border flex flex-col overflow-visible md:overflow-hidden bg-[#faf8f5] dark:bg-[#182229]">
            <div className="px-4 py-3 border-b border-border flex-shrink-0 bg-secondary/30">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Clock size={14} className="text-muted-foreground" />
                Comments
                {comments.length > 0 && (
                  <span className="text-xs text-muted-foreground font-normal">
                    ({comments.length})
                  </span>
                )}
              </h3>
            </div>

            <div className="flex-1 md:overflow-y-auto overflow-visible p-3 space-y-3.5 min-h-[250px] md:min-h-0 max-h-[400px] md:max-h-none">
              {comments.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6 opacity-60">
                  No comments yet
                </p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="group/comment">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-5 h-5 rounded-full bg-whatsapp-teal/15 text-whatsapp-teal flex items-center justify-center text-[9px] font-semibold flex-shrink-0">
                        {c.author.name[0].toUpperCase()}
                      </div>
                      <span className="text-xs font-semibold text-foreground">
                        {c.author.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {timeAgo(c.createdAt)}
                      </span>
                    </div>
                    <div className="ml-7 bg-bubble-other-light dark:bg-bubble-other-dark text-foreground border border-border/40 rounded-[12px] rounded-tl-none px-3 py-2 text-sm relative shadow-xs">
                      {c.content}
                      <button
                        type="button"
                        onClick={() => deleteComment(c.id)}
                        className="absolute top-1 right-1 opacity-0 group-hover/comment:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex-shrink-0 border-t border-border bg-card">
              <LexicalEditor
                topicId={task.id}
                topicName="comment"
                users={workspaceMembers}
                topics={[]}
                onSend={postComment}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
