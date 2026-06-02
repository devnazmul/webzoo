import { useEffect, useRef, useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { Topic } from '@webzoo/shared';
import { useTaskStore, Task } from '@/store/task.store';
import { getSocket } from '@/lib/socket';
import KanbanColumn from './KanbanColumn';
import CreateTaskModal from './CreateTaskModal';
import TaskDetailModal from './TaskDetailModal';

interface Props {
  topic: Topic;
  workspaceId: string;
  workspaceMembers: { id: string; label: string }[];
}

export default function TasksTab({ topic, workspaceId, workspaceMembers }: Props) {
  const { statuses, tasks, setStatuses, setTasks, addTask, updateTask } = useTaskStore();
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createStatusId, setCreateStatusId] = useState('');
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const draggingTaskId = useRef<string | null>(null);

  useEffect(() => {
    setTasks([]);
    load();

    const socket = getSocket();
    socket.on('task:created', (data: { task: Task }) => {
      if (data.task.topicId === topic.id) addTask(data.task);
    });
    socket.on('task:updated', (data: { task: Task }) => {
      if (data.task.topicId === topic.id) updateTask(data.task);
    });
    return () => {
      socket.off('task:created');
      socket.off('task:updated');
    };
  }, [topic.id]);

  async function load() {
    setLoading(true);
    try {
      const [statusRes, taskRes] = await Promise.all([
        api.get(`/workspaces/${workspaceId}/tasks/statuses?topicId=${topic.id}`),
        api.get(`/workspaces/${workspaceId}/tasks?topicId=${topic.id}`),
      ]);
      setStatuses(statusRes.data.data.statuses);
      setTasks(taskRes.data.data.tasks);
    } finally {
      setLoading(false);
    }
  }

  async function handleDrop(targetStatusId: string) {
    const taskId = draggingTaskId.current;
    if (!taskId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.statusId === targetStatusId) return;

    // Optimistic update
    updateTask({ ...task, statusId: targetStatusId });

    try {
      const res = await api.patch(`/workspaces/${workspaceId}/tasks/${taskId}`, {
        statusId: targetStatusId,
      });
      updateTask(res.data.data.task);
    } catch {
      // Revert on failure
      updateTask(task);
    } finally {
      draggingTaskId.current = null;
    }
  }

  const topicTasks = tasks.filter((t) => t.topicId === topic.id);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border flex-shrink-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {topicTasks.length} task{topicTasks.length !== 1 ? 's' : ''}
        </span>
        <button
          type="button"
          onClick={() => { setCreateStatusId(statuses[0]?.id ?? ''); setShowCreate(true); }}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <Plus size={13} />
          Add task
        </button>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden select-none scrollbar-thin">
        <div className="flex h-full gap-[var(--kanban-column-gap)] p-[var(--kanban-card-padding)]" style={{ minWidth: 'max-content' }}>
          {statuses.map((status) => (
            <KanbanColumn
              key={status.id}
              status={status}
              tasks={topicTasks.filter((t) => t.statusId === status.id)}
              onAddTask={() => { setCreateStatusId(status.id); setShowCreate(true); }}
              onDragStart={(id) => { draggingTaskId.current = id; }}
              onDrop={handleDrop}
              onOpen={(task) => setActiveTask(task)}
              workspaceMembers={workspaceMembers}
              workspaceId={workspaceId}
              topicId={topic.id}
            />
          ))}
        </div>
      </div>

      {showCreate && (
        <CreateTaskModal
          workspaceId={workspaceId}
          topicId={topic.id}
          statusId={createStatusId}
          statuses={statuses}
          workspaceMembers={workspaceMembers}
          onClose={() => setShowCreate(false)}
          onCreated={(task) => { addTask(task); setShowCreate(false); }}
        />
      )}

      {activeTask && (
        <TaskDetailModal
          task={activeTask}
          workspaceId={workspaceId}
          workspaceMembers={workspaceMembers}
          statuses={statuses}
          onClose={() => setActiveTask(null)}
          onUpdated={(updated) => {
            updateTask(updated);
            setActiveTask(updated);
          }}
        />
      )}
    </div>
  );
}
