import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { getSocket } from '@/lib/socket';
import { ScrollArea } from '@/components/ui/scroll-area';
import MessageBubble from './MessageBubble';

import TypingIndicator from './TypingIndicator';
import MarkdownInput from './editor/MarkdownInput';
import api from '@/lib/api';
import { Message, Topic } from '@webzoo/shared';
import { Hash, Users } from 'lucide-react';

interface Props {
  topic: Topic;
  workspaceId: string;
  memberNames: Record<string, string>;
  onlineUsers: string[];
  workspaceMembers: { id: string; label: string }[];
  allTopics: { id: string; label: string }[];
}

export default function MessageFeed({
  topic,
  workspaceId,
  memberNames,
  onlineUsers,
  workspaceMembers,
  allTopics,
}: Props) {
  const user = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevTopicId = useRef<string | null>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Load messages and switch socket rooms on topic change
  useEffect(() => {
    const socket = getSocket();

    if (prevTopicId.current) {
      socket.emit('topic:leave', prevTopicId.current);
    }

    socket.emit('topic:join', topic.id);
    prevTopicId.current = topic.id;
    setMessages([]);
    setTypingUsers([]);
    loadMessages();

    function onNewMessage(data: { message: Message }) {
      setMessages((prev) => {
        if (prev.find((m) => m.id === data.message.id)) return prev;
        return [...prev, data.message];
      });
      setTimeout(scrollToBottom, 50);
    }

    function onTypingUpdate(data: {
      topicId: string;
      userId: string;
      isTyping: boolean;
    }) {
      if (data.topicId !== topic.id) return;
      if (data.userId === user?.id) return;
      setTypingUsers((prev) =>
        data.isTyping
          ? prev.includes(data.userId) ? prev : [...prev, data.userId]
          : prev.filter((id) => id !== data.userId)
      );
    }

    socket.on('message:new', onNewMessage);
    socket.on('typing:update', onTypingUpdate);

    return () => {
      socket.off('message:new', onNewMessage);
      socket.off('typing:update', onTypingUpdate);
    };
  }, [topic.id]);

  async function loadMessages() {
    setLoading(true);
    try {
      const res = await api.get(
        `/workspaces/${workspaceId}/topics/${topic.id}/messages`
      );
      setMessages(res.data.data.messages);
      setTimeout(scrollToBottom, 50);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend(content: string) {
    await api.post(
      `/workspaces/${workspaceId}/topics/${topic.id}/messages`,
      { content }
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Topic header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Hash size={18} className="text-muted-foreground" />
          <span className="font-semibold">{topic.name}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Users size={13} />
          <span>{onlineUsers.length} online</span>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 py-4 overflow-y-auto">
        {loading && (
          <div className="flex justify-center py-8 text-muted-foreground text-sm">
            Loading messages...
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Hash size={40} className="mb-3 opacity-20" />
            <p className="font-medium">Welcome to #{topic.name}</p>
            <p className="text-sm">Send the first message!</p>
          </div>
        )}
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isOwn={message.authorId === user?.id}
          />
        ))}
        <TypingIndicator
          typingUsers={typingUsers}
          memberNames={memberNames}
        />
        <div ref={bottomRef} />
      </ScrollArea>

      {/* Input */}
      <MarkdownInput
        topicId={topic.id}
        topicName={topic.name}
        users={workspaceMembers}
        topics={allTopics}
        onSend={handleSend}
      />
    </div>
  );
}
