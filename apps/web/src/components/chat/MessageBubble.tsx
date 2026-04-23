import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Message } from '@webzoo/shared';
import MessageRenderer from './MessageRenderer';

interface Props {
  message: Message;
  isOwn: boolean;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MessageBubble({ message, isOwn }: Props) {
  return (
    <div className="flex items-start gap-3 px-4 py-1.5 hover:bg-accent/20 group transition-colors">
      <Avatar className="w-8 h-8 mt-0.5 flex-shrink-0">
        <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
          {getInitials(message.author.name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5">
          <span
            className={`text-sm font-semibold ${
              isOwn ? 'text-primary' : 'text-foreground'
            }`}
          >
            {message.author.name}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatTime(message.createdAt)}
          </span>
        </div>
        <MessageRenderer content={message.content} />
      </div>
    </div>
  );
}
