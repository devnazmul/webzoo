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

export default function MessageBubble({ message }: Props) {
  return (
    <div className="flex items-start gap-4 px-6 py-3 hover:bg-ghost-surface/20 group transition-all relative -mx-6 rounded-lg">
      <Avatar className="w-10 h-10 rounded-full shrink-0 border border-ghost-border">
        <AvatarFallback className="text-[11px] bg-spectral-white/10 text-spectral-white font-bold rounded-full font-industrial uppercase">
          {getInitials(message.author.name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-3 mb-1">
          <span className="font-industrial text-[13px] font-bold text-spectral-white uppercase tracking-wider hover:underline cursor-pointer">
            {message.author.name}
          </span>
          <span className="text-[9px] text-spectral-white/40 uppercase tracking-widest font-bold">
            {formatTime(message.createdAt)}
          </span>
        </div>
        <div className="text-[14px] text-spectral-white/90 leading-relaxed font-medium">
          <MessageRenderer content={message.content} />
        </div>
      </div>
    </div>

  );
}
