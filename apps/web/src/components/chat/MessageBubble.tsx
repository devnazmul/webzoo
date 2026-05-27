import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Message } from '@webzoo/shared';
import MessageRenderer from './MessageRenderer';
import MessageActions from './MessageActions';
import ReactionBar from './ReactionBar';
import api from '@/lib/api';

interface ExtendedMessage extends Message {
  reactions?: { id: string; emoji: string; user: { id: string; name: string } }[];
  replyTo?: { id: string; content: string; author: { id: string; name: string } } | null;
  deletedAt?: string | null;
}

interface Props {
  message: ExtendedMessage;
  isOwn: boolean;
  currentUserId: string;
  workspaceId: string;
  topicId: string;
  onReply: (message: Message) => void;
  onCreateTask: (message: Message) => void;
  onDeleteLocal: (messageId: string) => void;
  onReactionUpdate: (messageId: string, reactions: any[]) => void;
  onOpenThread: (message: Message) => void;
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
  onDeleteLocal,
  onReactionUpdate,
  onOpenThread,
}: Props) {
  const [reactions, setReactions] = useState(message.reactions ?? []);
  const [showActions, setShowActions] = useState(false);
  const [isDeleted, setIsDeleted] = useState(
    !!(message.deletedAt || message.content === '__deleted__')
  );
  const replyCount = (message as any)._count?.replies ?? 0;

  async function handleReact(emoji: string) {
    try {
      const res = await api.post(
        `/workspaces/${workspaceId}/topics/${topicId}/messages/${message.id}/reactions`,
        { emoji }
      );
      const updated = res.data.data.reactions;
      setReactions(updated);
      onReactionUpdate(message.id, updated);
    } catch {}
  }

  async function handleDeleteForMe() {
    try {
      await api.delete(
        `/workspaces/${workspaceId}/topics/${topicId}/messages/${message.id}?deleteFor=me`
      );
      onDeleteLocal(message.id);
    } catch {}
  }

  async function handleDeleteForEveryone() {
    try {
      await api.delete(
        `/workspaces/${workspaceId}/topics/${topicId}/messages/${message.id}?deleteFor=everyone`
      );
      setIsDeleted(true);
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
        {message.replyTo && !isDeleted && (
          <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground border-l-2 border-border pl-2">
            <span className="font-medium">{message.replyTo.author.name}</span>
            <span className="truncate max-w-xs opacity-70">
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

        {isDeleted ? (
          <p className="text-sm text-muted-foreground italic">
            This message was deleted.
          </p>
        ) : (
          <>
            <MessageRenderer content={message.content} />
            <ReactionBar
              reactions={reactions}
              currentUserId={currentUserId}
              onToggle={handleReact}
            />
            {replyCount > 0 && !isDeleted && (
              <button
                type="button"
                onClick={() => onOpenThread(message)}
                className="mt-1 flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
              </button>
            )}
          </>
        )}
      </div>

      {/* Actions — only for non-deleted messages */}
      {showActions && !isDeleted && (
        <div className="absolute right-4 top-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <MessageActions
            message={message}
            isOwn={isOwn}
            onReact={handleReact}
            onReply={() => onReply(message)}
            onCreateTask={() => onCreateTask(message)}
            onDeleteForMe={handleDeleteForMe}
            onDeleteForEveryone={handleDeleteForEveryone}
          />
        </div>
      )}
    </div>
  );
}
