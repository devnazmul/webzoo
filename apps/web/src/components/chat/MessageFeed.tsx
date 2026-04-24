import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { getSocket } from '@/lib/socket';
import { ScrollArea } from '@/components/ui/scroll-area';
import MessageBubble from './MessageBubble';

import TypingIndicator from './TypingIndicator';
import MarkdownInput from './editor/MarkdownInput';
import api from '@/lib/api';
import { Message, Topic } from '@webzoo/shared';
import { Hash, Star, Info, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  topic: Topic;
  workspaceId: string;
  memberNames: Record<string, string>;
  onlineUsers: string[];
  workspaceMembers: { id: string; label: string }[];
  allTopics: { id: string; label: string }[];
  onToggleDetails: () => void;
}

export default function MessageFeed({
  topic,
  workspaceId,
  memberNames,
  onlineUsers,
  workspaceMembers,
  allTopics,
  onToggleDetails,
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

  const loadMessages = useCallback(async () => {
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
  }, [workspaceId, topic.id, scrollToBottom]);

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
  }, [topic.id, user?.id, loadMessages, scrollToBottom]);

  async function handleSend(content: string) {
    await api.post(
      `/workspaces/${workspaceId}/topics/${topic.id}/messages`,
      { content }
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      {/* Slack-style header */}
      <div className="h-12 border-b border-[#E2E2E2] flex items-center px-4 justify-between flex-shrink-0 bg-white">
        <div className="flex items-center gap-2 min-w-0">
          <button className="flex items-center gap-1.5 hover:bg-[#F6F6F6] rounded-md px-1.5 py-1 -ml-1.5 transition-colors group">
            <Hash size={16} className="text-[#1D1C1D] font-bold" />
            <span className="font-black text-[16px] truncate text-[#1D1C1D]">
              {topic.name}
            </span>
            <ChevronDown size={14} className="text-main-dim" />
          </button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-main-dim hover:text-[#1D1C1D] hover:bg-[#F6F6F6]">
            <Star size={14} />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleDetails}
            className="h-7 px-2 gap-1.5 text-main-dim hover:bg-[#F6F6F6] hover:text-[#1D1C1D] font-normal"
          >
            <div className="flex -space-x-1 items-center">
              {[...Array(Math.min(3, onlineUsers.length))].map((_, i) => (
                <div key={i} className="w-5 h-5 rounded border border-white bg-[#E2E2E2] text-[8px] flex items-center justify-center font-bold text-main-dim">
                  {memberNames[onlineUsers[i]]?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                </div>
              ))}
            </div>
            <span className="text-[13px] font-bold">{onlineUsers.length}</span>
          </Button>
          <div className="w-px h-6 bg-[#E2E2E2] mx-2" />
          <Button variant="ghost" size="icon" onClick={onToggleDetails} className="h-8 w-8 text-main-dim hover:text-[#1D1C1D] hover:bg-[#F6F6F6]">
            <Info size={20} />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="px-5 py-8">
           {!loading && messages.length === 0 && (
            <div className="mb-10">
              <div className="w-12 h-12 bg-slack-hover rounded-lg flex items-center justify-center mb-4">
                <Hash size={24} className="text-slack-text" />
              </div>
              <h2 className="text-2xl font-bold text-slack-text mb-2">Welcome to #{topic.name}</h2>
              <p className="text-slack-dim text-[15px] max-w-lg leading-relaxed">
                This the very beginning of the <span className="font-bold">#{topic.name}</span> channel.
                Everything here will be saved and archived for our team's history.
              </p>
            </div>
          )}

          <div className="space-y-4">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.authorId === user?.id}
              />
            ))}
          </div>
          <TypingIndicator
            typingUsers={typingUsers}
            memberNames={memberNames}
          />
          <div ref={bottomRef} className="h-4" />
        </div>
      </ScrollArea>

      <div className="px-5 pb-6">
        <MarkdownInput
          topicId={topic.id}
          topicName={topic.name}
          users={workspaceMembers}
          topics={allTopics}
          onSend={handleSend}
        />
      </div>
    </div>
  );
}
