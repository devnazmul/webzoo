import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Task, TaskStatus } from '@/store/task.store';
import { cn } from '@/lib/utils';
import TaskCard from './TaskCard';

interface Props {
  status: TaskStatus;
  tasks: Task[];
  onAddTask: () => void;
  onDragStart: (taskId: string) => void;
  onDrop: (statusId: string) => void;
  workspaceMembers: { id: string; label: string }[];
  workspaceId: string;
  topicId: string;
}

export default function KanbanColumn({
  status,
  tasks,
  onAddTask,
  onDragStart,
  onDrop,
  workspaceId,
}: Props) {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div
      className={cn(
        'flex flex-col w-64 flex-shrink-0 rounded-xl border transition-colors',
        isDragOver
          ? 'border-primary/50 bg-primary/5'
          : 'border-border bg-muted/40'
      )}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={() => { setIsDragOver(false); onDrop(status.id); }}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: status.color }} />
          <span className="text-xs font-semibold">{status.name}</span>
          <span className="text-xs text-muted-foreground">({tasks.length})</span>
        </div>
        <button type="button" onClick={onAddTask} className="text-muted-foreground hover:text-foreground transition-colors">
          <Plus size={14} />
        </button>
      </div>

      {/* Drop zone hint */}
      {isDragOver && tasks.length === 0 && (
        <div className="mx-2 mt-2 h-16 rounded-lg border-2 border-dashed border-primary/40 flex items-center justify-center">
          <span className="text-xs text-primary/60">Drop here</span>
        </div>
      )}

      {/* Task cards */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            workspaceId={workspaceId}
            onDragStart={onDragStart}
          />
        ))}
        {!isDragOver && tasks.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4 opacity-50">No tasks</p>
        )}
      </div>
    </div>
  );
}
