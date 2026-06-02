import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { getSocket } from '@/lib/socket';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { SendHorizonal } from 'lucide-react';
import api from '@/lib/api';
import { DMConversation, DMMessage } from '@/store/dm.store';
import DateSeparator from '@/components/chat/DateSeparator';
import { cn } from '@/lib/utils';

interface Props {
  conversation: DMConversation;
  currentUserId: string;
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function extractPlain(content: string) {
  try {
    const p = JSON.parse(content);
    return p?.plainText ?? content;
  } catch { return content; }
}

export default function DMFeed({ conversation, currentUserId }: Props) {
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const other = conversation.participants.find((p) => p.id !== currentUserId);

  useEffect(() => {
    load();
    const socket = getSocket();

    function onNewDM(data: { message: DMMessage }) {
      if (data.message.conversationId !== conversation.id) return;
      setMessages((prev) => {
        if (prev.find((m) => m.id === data.message.id)) return prev;
        return [...prev, data.message];
      });
      setTimeout(scrollToBottom, 50);
    }

    socket.on('dm:message:new', onNewDM);
    return () => { socket.off('dm:message:new', onNewDM); };
  }, [conversation.id]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get(`/dm/conversations/${conversation.id}/messages`);
      setMessages(res.data.data.messages ?? []);
      setTimeout(scrollToBottom, 50);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    const trimmed = content.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await api.post(`/dm/conversations/${conversation.id}/messages`, { content: trimmed });
      setContent('');
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0">
        <Avatar className="w-8 h-8">
          <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
            {other ? getInitials(other.name) : '?'}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-semibold">{other?.name ?? 'Unknown'}</p>
          <p className="text-xs text-muted-foreground">Direct message</p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 py-4 overflow-y-auto">
        {loading && (
          <div className="flex justify-center py-8 text-muted-foreground text-sm">
            Loading…
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Avatar className="w-12 h-12 mb-3">
              <AvatarFallback className="text-sm bg-secondary">
                {other ? getInitials(other.name) : '?'}
              </AvatarFallback>
            </Avatar>
            <p className="font-medium">{other?.name}</p>
            <p className="text-sm">Send the first message!</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const prev = messages[i - 1];
          const showDate = !prev ||
            new Date(msg.createdAt).toDateString() !==
            new Date(prev.createdAt).toDateString();
          const isOwn = msg.authorId === currentUserId;
          return (
            <div key={msg.id}>
              {showDate && <DateSeparator date={new Date(msg.createdAt)} />}
              <div
                className={cn(
                  "flex items-start gap-3 px-4 py-1.5 group transition-colors",
                  isOwn ? "flex-row-reverse" : "flex-row"
                )}
              >
                <Avatar className="w-8 h-8 mt-0.5 flex-shrink-0">
                  <AvatarFallback className="text-xs bg-whatsapp-teal/20 text-whatsapp-teal font-semibold">
                    {getInitials(msg.author.name)}
                  </AvatarFallback>
                </Avatar>
                <div className={cn(
                  "flex flex-col max-w-[85%] md:max-w-[70%]",
                  isOwn ? "items-end" : "items-start"
                )}>
                  <div className="flex items-baseline gap-2 mb-0.5 px-0.5">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {msg.author.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground/80">
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>
                  <div className={cn(
                    "rounded-[16px] px-3.5 py-2 text-sm shadow-xs relative border select-text leading-relaxed",
                    isOwn 
                      ? "bg-bubble-own-light dark:bg-bubble-own-dark text-[#1c1e21] dark:text-[#f0f2f5] border-[#d1f4cc] dark:border-[#004c3e] rounded-tr-none" 
                      : "bg-bubble-other-light dark:bg-bubble-other-dark text-[#1c1e21] dark:text-[#e9edef] border-border dark:border-[#222e35] rounded-tl-none"
                  )}>
                    {extractPlain(msg.content)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </ScrollArea>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex items-end gap-2 border border-border rounded-lg bg-secondary px-3 py-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${other?.name ?? ''}…`}
            className="flex-1 bg-transparent text-sm resize-none outline-none text-foreground placeholder:text-muted-foreground min-h-[36px] max-h-32"
            rows={1}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={!content.trim() || sending}
            onClick={handleSend}
            className="h-7 w-7 flex-shrink-0"
          >
            <SendHorizonal size={16} />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 px-1">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
