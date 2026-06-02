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
  LOW:    'bg-slate-100 dark:bg-[#222e35] text-slate-500 border border-slate-200 dark:border-slate-700',
  MEDIUM: 'bg-blue-50 dark:bg-blue-950/10 text-blue-500 border border-blue-100 dark:border-blue-900/40',
  HIGH:   'bg-orange-50 dark:bg-orange-950/10 text-orange-500 border border-orange-100 dark:border-orange-900/40',
  URGENT: 'bg-red-50 dark:bg-red-950/10 text-red-500 border border-red-100 dark:border-red-900/40',
};

const PRIORITY_LEFT_BORDER: Record<string, string> = {
  LOW:    'border-l-slate-400/80',
  MEDIUM: 'border-l-blue-400/80',
  HIGH:   'border-l-orange-400/80',
  URGENT: 'border-l-red-400/80',
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
      className={cn(
        "bg-card border border-border border-l-3 rounded-[var(--kanban-card-radius)] p-[var(--kanban-card-padding)] cursor-pointer hover:border-whatsapp-teal/40 hover:shadow-md transition-all select-none group",
        PRIORITY_LEFT_BORDER[task.priority] ?? 'border-l-transparent'
      )}
    >
      {/* Priority badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium leading-snug line-clamp-2 flex-1 text-foreground">
          {task.title}
        </p>
        {task.priority && (
          <span className={cn(
            'text-[9px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5',
            PRIORITY_COLORS[task.priority] ?? 'bg-slate-100 text-slate-500'
          )}>
            {PRIORITY_LABELS[task.priority] ?? task.priority}
          </span>
        )}
      </div>

      {/* Subtask progress */}
      {total > 0 && (
        <div className="flex items-center gap-1.5 mb-2.5">
          {completed === total
            ? <CheckSquare size={11} className="text-whatsapp-teal flex-shrink-0" />
            : <Square size={11} className="text-muted-foreground flex-shrink-0" />}
          <span className="text-[10px] text-muted-foreground">{completed}/{total}</span>
          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-whatsapp-teal rounded-full transition-all"
              style={{ width: `${(completed / total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-3">
        {task.assignee && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <div className="w-4.5 h-4.5 rounded-full bg-whatsapp-teal/15 text-whatsapp-teal flex items-center justify-center text-[8px] font-bold">
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
              isOverdue ? 'text-red-500 dark:text-red-400' : 'text-muted-foreground'
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
