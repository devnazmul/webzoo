import { ScrollArea } from "@/components/ui/scroll-area";
import { getSocket } from "@/lib/socket";
import { useAuthStore } from "@/store/auth.store";
import { useCallback, useEffect, useRef, useState } from "react";
import MessageBubble from "./MessageBubble";

import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { Message, Topic } from "@webzoo/shared";
import { ChevronDown, Hash, Info } from "lucide-react";
import TypingIndicator from "./TypingIndicator";
import LexicalEditor from "./editor/LexicalEditor";

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
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(
        `/workspaces/${workspaceId}/topics/${topic.id}/messages`,
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
      socket.emit("topic:leave", prevTopicId.current);
    }

    socket.emit("topic:join", topic.id);
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
          ? prev.includes(data.userId)
            ? prev
            : [...prev, data.userId]
          : prev.filter((id) => id !== data.userId),
      );
    }

    socket.on("message:new", onNewMessage);
    socket.on("typing:update", onTypingUpdate);

    return () => {
      socket.off("message:new", onNewMessage);
      socket.off("typing:update", onTypingUpdate);
    };
  }, [topic.id, user?.id, loadMessages, scrollToBottom]);

  async function handleSend(content: string) {
    await api.post(`/workspaces/${workspaceId}/topics/${topic.id}/messages`, {
      content,
    });
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-black/5 backdrop-blur-sm">
      {/* SpaceX-style header */}
      <div className="h-12 border-b border-ghost-border flex items-center px-6 justify-between flex-shrink-0 bg-black/20">
        <div className="flex items-center gap-4 min-w-0">
          <button className="flex items-center gap-2 hover:bg-ghost-surface rounded-full px-3 py-1 -ml-2 transition-all group border border-transparent hover:border-ghost-border">
            <Hash size={16} className="text-spectral-white" />
            <span className="font-industrial font-bold text-[14px] uppercase tracking-[1.17px] truncate text-spectral-white">
              {topic.name}
            </span>
            <ChevronDown size={14} className="text-spectral-white/50" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleDetails}
            className="h-8 px-4 gap-2 text-spectral-white hover:bg-ghost-surface hover:text-white font-bold uppercase text-[10px] tracking-wider rounded-full border border-ghost-border"
          >
            <div className="flex -space-x-1.5 items-center">
              {[...Array(Math.min(3, onlineUsers.length))].map((_, i) => (
                <div
                  key={i}
                  className="w-5 h-5 rounded-full border border-space-black bg-spectral-white/20 text-[8px] flex items-center justify-center font-bold text-spectral-white"
                >
                  {memberNames[onlineUsers[i]]
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2) || "U"}
                </div>
              ))}
            </div>
            <span>{onlineUsers.length} ONLINE</span>
          </Button>
          <div className="w-px h-6 bg-ghost-border mx-1" />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggleDetails}
            className="text-spectral-white/50 hover:text-white"
          >
            <Info size={18} />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="px-6 py-10">
          {!loading && messages.length === 0 && (
            <div className="mb-12 border border-ghost-border bg-ghost-surface/20 p-8 rounded-2xl backdrop-blur-md max-w-2xl">
              <div className="w-14 h-14 bg-spectral-white/10 border border-ghost-border rounded-full flex items-center justify-center mb-6">
                <Hash size={28} className="text-spectral-white" />
              </div>
              <h2 className="text-3xl font-industrial font-bold text-spectral-white uppercase tracking-[1.17px] mb-4">
                Channel Initialized: #{topic.name}
              </h2>
              <p className="text-spectral-white/60 text-[14px] max-w-lg leading-relaxed uppercase tracking-wider font-medium">
                Establishing communication in{" "}
                <span className="text-spectral-white">#{topic.name}</span>. All
                telemetry and data transmissions are encrypted and archived for
                mission history.
              </p>
            </div>
          )}

          <div className="space-y-6">
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

      <div className="px-6 pb-8">
        <LexicalEditor
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
