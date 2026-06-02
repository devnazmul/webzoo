import { useRef } from 'react';
import { Task } from '@/store/task.store';
import { cn } from '@/lib/utils';
import { CheckSquare, Square, Calendar, User } from 'lucide-react';

interface Props {
  task: Task;
  workspaceId: string;
  onDragStart: (taskId: string) => void;
  onOpen: (task: Task) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW:    'bg-slate-500/20 text-slate-400',
  MEDIUM: 'bg-blue-500/20 text-blue-400',
  HIGH:   'bg-orange-500/20 text-orange-400',
  URGENT: 'bg-red-500/20 text-red-400',
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', URGENT: 'Urgent',
};

function formatDue(dateStr: string) {
  const d = new Date(dateStr);
  return {
    label: d.toLocaleDateString([], { month: 'short', day: 'numeric' }),
    isOverdue: d < new Date(),
  };
}

export default function TaskCard({ task, workspaceId, onDragStart, onOpen }: Props) {
  const completed = task.subtasks.filter((s) => s.completed).length;
  const total = task.subtasks.length;
  const dragMoved = useRef(false);

  return (
    <div
      draggable
      onDragStart={(e) => {
        dragMoved.current = true;
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(task.id);
      }}
      onDragEnd={() => { setTimeout(() => { dragMoved.current = false; }, 100); }}
      onMouseDown={() => { dragMoved.current = false; }}
      onClick={() => { if (!dragMoved.current) onOpen(task); }}
      className="bg-background border border-border rounded-[var(--kanban-card-radius)] p-[var(--kanban-card-padding)] cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all select-none group"
    >
      {/* Priority badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium leading-snug line-clamp-2 flex-1">
          {task.title}
        </p>
        {task.priority && (
          <span className={cn(
            'text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 mt-0.5',
            PRIORITY_COLORS[task.priority] ?? 'bg-slate-500/20 text-slate-400'
          )}>
            {PRIORITY_LABELS[task.priority] ?? task.priority}
          </span>
        )}
      </div>

      {/* Subtask progress */}
      {total > 0 && (
        <div className="flex items-center gap-1.5 mb-2">
          {completed === total
            ? <CheckSquare size={11} className="text-green-500 flex-shrink-0" />
            : <Square size={11} className="text-muted-foreground flex-shrink-0" />}
          <span className="text-[10px] text-muted-foreground">{completed}/{total}</span>
          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${(completed / total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-3">
        {task.assignee && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <div className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[8px] font-bold">
              {task.assignee.name[0].toUpperCase()}
            </div>
            <span>{task.assignee.name.split(' ')[0]}</span>
          </div>
        )}
        {task.dueDate && (() => {
          const { label, isOverdue } = formatDue(task.dueDate!);
          return (
            <div className={cn(
              'flex items-center gap-1 text-[10px]',
              isOverdue ? 'text-red-400' : 'text-muted-foreground'
            )}>
              <Calendar size={10} />
              <span>{label}</span>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
