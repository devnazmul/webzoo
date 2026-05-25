import { Task } from '@/store/task.store';
import { cn } from '@/lib/utils';
import { CheckSquare, Square, Calendar, User } from 'lucide-react';

interface Props {
  task: Task;
  workspaceId: string;
  onDragStart: (taskId: string) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'text-muted-foreground',
  MEDIUM: 'text-blue-500',
  HIGH: 'text-orange-500',
  URGENT: 'text-red-500',
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

export default function TaskCard({ task, onDragStart }: Props) {
  const done = task.subTasks.filter((s) => s.done).length;
  const total = task.subTasks.length;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(task.id);
      }}
      className="bg-background border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-primary/40 hover:shadow-sm transition-all select-none"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-sm font-medium leading-snug line-clamp-2">{task.title}</p>
        <span className={cn('text-[10px] font-semibold flex-shrink-0 mt-0.5', PRIORITY_COLORS[task.priority])}>
          {PRIORITY_LABELS[task.priority]}
        </span>
      </div>

      {total > 0 && (
        <div className="flex items-center gap-1.5 mb-2">
          {done === total
            ? <CheckSquare size={11} className="text-green-500" />
            : <Square size={11} className="text-muted-foreground" />}
          <span className="text-[10px] text-muted-foreground">{done}/{total}</span>
          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mt-1">
        {task.assignee && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <User size={10} />
            <span>{task.assignee.name.split(' ')[0]}</span>
          </div>
        )}
        {task.dueDate && (() => {
          const { label, isOverdue } = formatDue(task.dueDate);
          return (
            <div className={cn('flex items-center gap-1 text-[10px]', isOverdue ? 'text-red-500' : 'text-muted-foreground')}>
              <Calendar size={10} />
              <span>{label}</span>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
