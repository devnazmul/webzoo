import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Message } from '@webzoo/shared';
import MessageRenderer from './MessageRenderer';
import MessageActions from './MessageActions';
import ReactionBar from './ReactionBar';
import api from '@/lib/api';

interface Props {
  message: Message & {
    reactions?: { id: string; emoji: string; user: { id: string; name: string } }[];
    replyTo?: { id: string; content: string; author: { id: string; name: string } } | null;
  };
  isOwn: boolean;
  currentUserId: string;
  workspaceId: string;
  topicId: string;
  onReply: (message: Message) => void;
  onCreateTask: (message: Message) => void;
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

function extractPlainText(content: string): string {
  try {
    const parsed = JSON.parse(content);
    if (parsed?.plainText) return parsed.plainText;
  } catch {}
  return content;
}

export default function MessageBubble({
  message,
  isOwn,
  currentUserId,
  workspaceId,
  topicId,
  onReply,
  onCreateTask,
}: Props) {
  const [reactions, setReactions] = useState(message.reactions ?? []);
  const [showActions, setShowActions] = useState(false);

  async function handleReact(emoji: string) {
    try {
      const res = await api.post(
        `/workspaces/${workspaceId}/topics/${topicId}/messages/${message.id}/reactions`,
        { emoji }
      );
      setReactions(res.data.data.reactions);
    } catch {}
  }

  return (
    <div
      className="flex items-start gap-3 px-4 py-1.5 hover:bg-accent/20 group transition-colors relative"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <Avatar className="w-8 h-8 mt-0.5 flex-shrink-0">
        <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
          {getInitials(message.author.name)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        {/* Reply context */}
        {message.replyTo && (
          <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground border-l-2 border-border pl-2">
            <span className="font-medium">{message.replyTo.author.name}</span>
            <span className="truncate max-w-xs">
              {extractPlainText(message.replyTo.content).slice(0, 80)}
            </span>
          </div>
        )}

        <div className="flex items-baseline gap-2 mb-0.5">
          <span className={`text-sm font-semibold ${isOwn ? 'text-primary' : 'text-foreground'}`}>
            {message.author.name}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatTime(message.createdAt)}
          </span>
        </div>

        <MessageRenderer content={message.content} />
        <ReactionBar
          reactions={reactions}
          currentUserId={currentUserId}
          onToggle={handleReact}
        />
      </div>

      {/* Action buttons — visible on hover */}
      {showActions && (
        <div className="absolute right-4 top-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <MessageActions
            message={message}
            onReact={handleReact}
            onReply={() => onReply(message)}
            onCreateTask={() => onCreateTask(message)}
          />
        </div>
      )}
    </div>
  );
}
