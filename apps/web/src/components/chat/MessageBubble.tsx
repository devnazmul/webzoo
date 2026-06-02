import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Message } from '@webzoo/shared';
import MessageRenderer from './MessageRenderer';
import ReactionBar from './ReactionBar';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { ChevronDown, Reply, CheckSquare, Smile, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

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
      className={cn(
        "flex items-start gap-3 px-4 py-2 hover:bg-accent/5 group transition-colors relative",
        isOwn ? "flex-row-reverse" : "flex-row"
      )}
    >
      <Avatar className="w-8 h-8 mt-1 flex-shrink-0">
        <AvatarFallback className="text-xs bg-whatsapp-teal/20 text-whatsapp-teal font-semibold">
          {getInitials(message.author.name)}
        </AvatarFallback>
      </Avatar>

      <div className={cn(
        "flex flex-col max-w-[85%] md:max-w-[70%]",
        isOwn ? "items-end" : "items-start"
      )}>
        {/* Reply context */}
        {message.replyTo && !isDeleted && (
          <div className="flex items-center gap-2 mb-1 text-[11px] text-muted-foreground border-l-2 border-whatsapp-teal pl-2 opacity-85">
            <span className="font-semibold">{message.replyTo.author.name}</span>
            <span className="truncate max-w-xs">
              {extractPlainText(message.replyTo.content).slice(0, 60)}
            </span>
          </div>
        )}

        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-xs font-semibold text-muted-foreground">
            {message.author.name}
          </span>
          <span className="text-[10px] text-muted-foreground/80">
            {formatTime(message.createdAt)}
          </span>
        </div>

        {isDeleted ? (
          <div className="bg-muted text-muted-foreground italic text-xs rounded-xl px-3 py-2 border border-border/40">
            This message was deleted.
          </div>
        ) : (
          <div className={cn(
            "rounded-[16px] px-3.5 py-2 text-sm shadow-sm relative select-text border group/bubble pr-7",
            isOwn 
              ? "bg-bubble-own-light dark:bg-bubble-own-dark text-[#1c1e21] dark:text-[#f0f2f5] border-[#d1f4cc] dark:border-[#004c3e] rounded-tr-none" 
              : "bg-bubble-other-light dark:bg-bubble-other-dark text-[#1c1e21] dark:text-[#e9edef] border-[#e9edef] dark:border-[#222e35] rounded-tl-none"
          )}>
            {/* WhatsApp Style Chevron-Down Message Trigger */}
            {!isDeleted && (
              <div className="absolute top-1 right-1 opacity-0 group-hover/bubble:opacity-100 transition-opacity z-20">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-6 w-6 rounded-full flex items-center justify-center bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground cursor-pointer transition-colors border-0 outline-none">
                      <ChevronDown size={14} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={isOwn ? "end" : "start"} className="w-48 bg-card border-border text-foreground p-1 shadow-md">
                    {/* Reaction Row */}
                    <div className="flex items-center gap-1.5 px-2 py-1 justify-between bg-muted/40 rounded-sm mb-1">
                      {['👍', '❤️', '😂', '😮', '😢', '🙏'].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleReact(emoji)}
                          className="hover:scale-125 transition-transform text-base p-0.5 cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <DropdownMenuItem onClick={() => onReply(message)} className="text-xs font-semibold gap-2 py-2 cursor-pointer">
                      <Reply size={14} className="text-muted-foreground" />
                      Reply
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onCreateTask(message)} className="text-xs font-semibold gap-2 py-2 cursor-pointer">
                      <CheckSquare size={14} className="text-muted-foreground" />
                      Create Task
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-border" />
                    <DropdownMenuItem onClick={handleDeleteForMe} className="text-xs font-semibold gap-2 py-2 cursor-pointer">
                      <Trash2 size={14} className="text-muted-foreground" />
                      Delete for me
                    </DropdownMenuItem>
                    {isOwn && (
                      <DropdownMenuItem onClick={handleDeleteForEveryone} className="text-xs font-semibold gap-2 py-2 text-destructive focus:text-destructive cursor-pointer">
                        <Trash2 size={14} className="text-destructive" />
                        Delete for everyone
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

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
                className="mt-1 flex items-center gap-1.5 text-xs text-whatsapp-teal hover:underline font-semibold"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
