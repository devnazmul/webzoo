import { cn } from '@/lib/utils';

interface Reaction {
  id: string;
  emoji: string;
  user: { id: string; name: string };
}

interface Props {
  reactions: Reaction[];
  currentUserId: string;
  onToggle: (emoji: string) => void;
}

export default function ReactionBar({ reactions, currentUserId, onToggle }: Props) {
  if (reactions.length === 0) return null;

  // Group by emoji
  const grouped = reactions.reduce<Record<string, { count: number; users: string[]; hasReacted: boolean }>>(
    (acc, r) => {
      if (!acc[r.emoji]) {
        acc[r.emoji] = { count: 0, users: [], hasReacted: false };
      }
      acc[r.emoji].count++;
      acc[r.emoji].users.push(r.user.name);
      if (r.user.id === currentUserId) acc[r.emoji].hasReacted = true;
      return acc;
    },
    {}
  );

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {Object.entries(grouped).map(([emoji, data]) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onToggle(emoji)}
          title={data.users.join(', ')}
          className={cn(
            'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors',
            data.hasReacted
              ? 'bg-primary/10 border-primary/30 text-primary'
              : 'bg-muted border-border text-foreground hover:bg-accent'
          )}
        >
          <span>{emoji}</span>
          <span className="font-medium">{data.count}</span>
        </button>
      ))}
    </div>
  );
}
