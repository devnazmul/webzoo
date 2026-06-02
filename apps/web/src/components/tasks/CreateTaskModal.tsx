import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';
import { Task, TaskStatus } from '@/store/task.store';

interface Props {
  workspaceId: string;
  topicId: string;
  statusId: string;
  statuses: TaskStatus[];
  workspaceMembers: { id: string; label: string }[];
  onClose: () => void;
  onCreated: (task: Task) => void;
  prefillTitle?: string;
  prefillDescription?: string;
  creatorName?: string;
  prefillAssigneeIds?: string[];
}

export default function CreateTaskModal({
  workspaceId,
  topicId,
  statusId,
  statuses,
  workspaceMembers,
  onClose,
  onCreated,
  prefillTitle,
  prefillDescription,
  creatorName,
  prefillAssigneeIds,
}: Props) {
  const [title, setTitle] = useState(
    creatorName ? `${creatorName} added this task` : (prefillTitle ?? '')
  );
  const [description, setDescription] = useState(prefillDescription ?? '');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [assigneeId, setAssigneeId] = useState(
    prefillAssigneeIds?.[0] ?? ''
  );
  const [dueDate, setDueDate] = useState('');
  const [selectedStatusId, setSelectedStatusId] = useState(statusId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!title.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.post(`/workspaces/${workspaceId}/tasks`, {
        title: title.trim(),
        description: description.trim() || undefined,
        statusId: selectedStatusId,
        priority,
        assigneeId: assigneeId || undefined,
        dueDate: dueDate || undefined,
        topicId,
      });
      onCreated(res.data.data.task);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-xl shadow-xl w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-base">New task</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-xs mb-1">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              autoFocus
            />
          </div>

          <div>
            <Label className="text-xs mb-1">Description</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="w-full text-sm bg-transparent border border-input rounded-lg px-2.5 py-1.5 resize-none outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 min-h-[60px] placeholder:text-muted-foreground"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1">Status</Label>
              <select
                value={selectedStatusId}
                onChange={(e) => setSelectedStatusId(e.target.value)}
                className="w-full text-sm bg-background border border-input rounded-lg px-2.5 py-1.5 outline-none focus-visible:border-ring"
              >
                {statuses.length === 0 ? (
                  <option value="">No statuses available</option>
                ) : (
                  statuses.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))
                )}
              </select>
            </div>

            <div>
              <Label className="text-xs mb-1">Priority</Label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full text-sm bg-background border border-input rounded-lg px-2.5 py-1.5 outline-none focus-visible:border-ring"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1">Assignee</Label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full text-sm bg-background border border-input rounded-lg px-2.5 py-1.5 outline-none focus-visible:border-ring"
              >
                <option value="">Unassigned</option>
                {workspaceMembers.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs mb-1">Due date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!title.trim() || loading}
              onClick={handleCreate}
            >
              {loading ? 'Creating...' : 'Create task'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
