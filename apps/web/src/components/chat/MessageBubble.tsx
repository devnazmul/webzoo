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
    <div className="flex items-start gap-3 px-5 py-2 hover:bg-[#F8F8F8] group transition-colors relative -mx-5 first:mt-0">
      <Avatar className="w-9 h-9 rounded-md shrink-0">
        <AvatarFallback className="text-[13px] bg-[#E2E2E2] text-main-text font-black rounded-md">
          {getInitials(message.author.name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className="text-[15px] font-black text-main-text hover:underline cursor-pointer">
            {message.author.name}
          </span>
          <span className="text-[12px] text-main-dim">
            {formatTime(message.createdAt)}
          </span>
        </div>
        <div className="text-[15px] text-main-text leading-tight">
          <MessageRenderer content={message.content} />
        </div>
      </div>
    </div>
  );
}
