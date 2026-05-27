import { useEffect, useRef, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { Message } from '@webzoo/shared';
import { useAuthStore } from '@/store/auth.store';
import { getSocket } from '@/lib/socket';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import MessageRenderer from './MessageRenderer';
import DateSeparator from './DateSeparator';
import LexicalEditor from './editor/LexicalEditor';
import api from '@/lib/api';

interface Props {
  parentMessage: Message;
  workspaceId: string;
  topicId: string;
  topicName: string;
  workspaceMembers: { id: string; label: string }[];
  allTopics: { id: string; label: string }[];
  onClose: () => void;
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ThreadPanel({
  parentMessage,
  workspaceId,
  topicId,
  topicName,
  workspaceMembers,
  allTopics,
  onClose,
}: Props) {
  const user = useAuthStore((s) => s.user);
  const [replies, setReplies] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [alsoSendToChannel, setAlsoSendToChannel] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    setReplies([]);
    load();

    const socket = getSocket();

    function onNewMessage(data: { message: Message & { replyToId?: string } }) {
      // Only add to thread if it is a direct reply to this parent
      if (data.message.replyToId !== parentMessage.id) return;
      setReplies((prev) => {
        if (prev.find((m) => m.id === data.message.id)) return prev;
        return [...prev, data.message];
      });
      setTimeout(scrollToBottom, 50);
    }

    socket.on('message:new', onNewMessage);
    return () => { socket.off('message:new', onNewMessage); };
  }, [parentMessage.id]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get(
        `/workspaces/${workspaceId}/topics/${topicId}/messages/${parentMessage.id}/replies`
      );
      setReplies(res.data.data.messages ?? []);
      setTimeout(scrollToBottom, 50);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend(content: string) {
    await api.post(
      `/workspaces/${workspaceId}/topics/${topicId}/messages`,
      { content, replyToId: parentMessage.id }
    );
    if (alsoSendToChannel) {
      await api.post(
        `/workspaces/${workspaceId}/topics/${topicId}/messages`,
        { content }
      );
    }
  }

  const isDeleted = parentMessage.content === '__deleted__';

  return (
    <div className="flex flex-col h-full border-l border-border bg-background w-80 flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <div>
          <span className="font-semibold text-sm">Thread</span>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {replies.length} repl{replies.length === 1 ? 'y' : 'ies'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-accent transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <ScrollArea className="flex-1 overflow-y-auto">
        {/* Parent message — shown once at the top */}
        <div className="px-4 py-3 border-b border-border bg-muted/20">
          <div className="flex items-start gap-2.5">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
                {getInitials(parentMessage.author.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="text-sm font-semibold">
                  {parentMessage.author.name}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {formatTime(parentMessage.createdAt)}
                </span>
              </div>
              {isDeleted ? (
                <p className="text-sm text-muted-foreground italic">
                  This message was deleted.
                </p>
              ) : (
                <MessageRenderer content={parentMessage.content} />
              )}
            </div>
          </div>
        </div>

        {/* Divider */}
        {replies.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {replies.length} repl{replies.length === 1 ? 'y' : 'ies'}
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>
        )}

        {/* Replies only */}
        {loading && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Loading replies…
          </p>
        )}
        {!loading && replies.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8 opacity-60">
            No replies yet. Start the thread!
          </p>
        )}
        {replies.map((reply, i) => {
          const prev = replies[i - 1];
          const showDate =
            !prev ||
            new Date(reply.createdAt).toDateString() !==
              new Date(prev.createdAt).toDateString();
          const isOwn = reply.authorId === user?.id;
          const replyDeleted = reply.content === '__deleted__';

          return (
            <div key={reply.id}>
              {showDate && <DateSeparator date={new Date(reply.createdAt)} />}
              <div className="flex items-start gap-2.5 px-4 py-1.5 hover:bg-accent/20 transition-colors">
                <Avatar className="w-7 h-7 mt-0.5 flex-shrink-0">
                  <AvatarFallback className="text-[10px] bg-secondary text-secondary-foreground">
                    {getInitials(reply.author.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5 mb-0.5">
                    <span
                      className={`text-xs font-semibold ${
                        isOwn ? 'text-primary' : 'text-foreground'
                      }`}
                    >
                      {reply.author.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatTime(reply.createdAt)}
                    </span>
                  </div>
                  {replyDeleted ? (
                    <p className="text-xs text-muted-foreground italic">
                      This message was deleted.
                    </p>
                  ) : (
                    <MessageRenderer content={reply.content} />
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </ScrollArea>

      {/* LexicalEditor as reply input */}
      <div className="flex-shrink-0 border-t border-border">
        <div className="flex items-center gap-2 px-3 pt-2">
          <input
            type="checkbox"
            id="also-send"
            checked={alsoSendToChannel}
            onChange={(e) => setAlsoSendToChannel(e.target.checked)}
            className="w-3.5 h-3.5 accent-primary cursor-pointer"
          />
          <label
            htmlFor="also-send"
            className="text-xs text-muted-foreground cursor-pointer select-none"
          >
            Also send to #{topicName}
          </label>
        </div>
        <LexicalEditor
          topicId={topicId}
          topicName="thread"
          users={workspaceMembers}
          topics={allTopics}
          onSend={handleSend}
        />
      </div>
    </div>
  );
}
