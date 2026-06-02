import { useEffect, useRef, useState, useCallback } from "react";
import { useAuthStore } from "@/store/auth.store";
import { getSocket } from "@/lib/socket";
import { ScrollArea } from "@/components/ui/scroll-area";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import DateSeparator from "./DateSeparator";
import TopicTabs, { TopicTab } from "./TopicTabs";
import CreateTaskModal from "@/components/tasks/CreateTaskModal";
import { useTaskStore } from "@/store/task.store";
import TasksTab from "@/components/tasks/TasksTab";
import VaultTab from "@/components/vault/VaultTab";
import MediaTab from "@/components/media/MediaTab";
import LinksTab from "@/components/links/LinksTab";
import LexicalEditor from "./editor/LexicalEditor";
import api from "@/lib/api";
import { Message, Topic } from "@webzoo/shared";
import ThreadPanel from "./ThreadPanel";

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
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [threadMessage, setThreadMessage] = useState<Message | null>(null);
  const [taskFromMessage, setTaskFromMessage] = useState<{
    content: string;
    description: string;
    mentionedIds: string[];
  } | null>(null);
  const [activeTab, setActiveTab] = useState<TopicTab>("messages");
  const statuses = useTaskStore((s) => s.statuses);
  const addTask = useTaskStore((s) => s.addTask);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevTopicId = useRef<string | null>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (prevTopicId.current) socket.emit("topic:leave", prevTopicId.current);
    socket.emit("topic:join", topic.id);
    prevTopicId.current = topic.id;
    setMessages([]);
    setTypingUsers([]);
    setActiveTab("messages");
    loadMessages();

    function onNewMessage(data: { message: Message & { replyToId?: string } }) {
      const msg = data.message;

      // If this is a reply, increment the parent's reply count
      // and do NOT add it to the main feed
      if (msg.replyToId) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== msg.replyToId) return m;
            const current = (m as any)._count?.replies ?? 0;
            return {
              ...m,
              _count: { ...((m as any)._count ?? {}), replies: current + 1 },
            } as any;
          }),
        );
        return;
      }

      // Top-level message — add to main feed
      setMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
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

    function onMessageDeleted(data: { messageId: string; deletedFor: string }) {
      if (data.deletedFor === "everyone") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === data.messageId
              ? ({
                  ...m,
                  content: "__deleted__",
                  deletedAt: new Date().toISOString(),
                } as any)
              : m,
          ),
        );
      }
    }

    function onReactionUpdate(data: { messageId: string; reactions: any[] }) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId
            ? ({ ...m, reactions: data.reactions } as any)
            : m,
        ),
      );
    }

    socket.on("message:new", onNewMessage);
    socket.on("typing:update", onTypingUpdate);
    socket.on("message:deleted", onMessageDeleted);
    socket.on("reaction:update", onReactionUpdate);
    return () => {
      socket.off("message:new", onNewMessage);
      socket.off("typing:update", onTypingUpdate);
      socket.off("message:deleted", onMessageDeleted);
      socket.off("reaction:update", onReactionUpdate);
    };
  }, [topic.id]);

  async function loadMessages() {
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
  }

  function handleDeleteLocal(messageId: string) {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  }

  async function handleSend(content: string) {
    await api.post(`/workspaces/${workspaceId}/topics/${topic.id}/messages`, {
      content,
      replyToId: replyTo?.id,
    });
    setReplyTo(null);
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Topic tab bar */}
      <TopicTabs
        activeTab={activeTab}
        onChange={setActiveTab}
        topicName={topic.name}
        onlineCount={onlineUsers.length}
      />

      {/* Tab content */}
      {activeTab === "messages" && (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Main feed */}
          <div className="flex flex-col flex-1 min-h-0 min-w-0">
            <ScrollArea className="flex-1 py-4 overflow-y-auto">
              {loading && (
                <div className="flex justify-center py-8 text-muted-foreground text-sm">
                  Loading messages...
                </div>
              )}
              {!loading && messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <span className="text-4xl mb-3 opacity-20">#</span>
                  <p className="font-medium">Welcome to #{topic.name}</p>
                  <p className="text-sm">Send the first message!</p>
                </div>
              )}
              {messages.map((message, index) => {
                const prev = messages[index - 1];
                const showDate =
                  !prev ||
                  new Date(message.createdAt).toDateString() !==
                    new Date(prev.createdAt).toDateString();
                return (
                  <div key={message.id} className={`relative `}>
                    {showDate && (
                      <DateSeparator date={new Date(message.createdAt)} />
                    )}
                    <MessageBubble
                      message={message as any}
                      isOwn={message.authorId === user?.id}
                      currentUserId={user?.id ?? ""}
                      workspaceId={workspaceId}
                      topicId={topic.id}
                      onReply={(msg) => setThreadMessage(msg)}
                      onOpenThread={(msg) => setThreadMessage(msg)}
                      onCreateTask={(msg) => {
                        let plain = msg.content;
                        let mentionedIds: string[] = [];
                        try {
                          const p = JSON.parse(msg.content);
                          plain = p?.plainText ?? msg.content;
                          // Extract mentioned user IDs from Lexical mentions array
                          if (Array.isArray(p?.mentions)) {
                            mentionedIds = p.mentions
                              .map((m: any) => m.id)
                              .filter(Boolean);
                          }
                        } catch {}
                        setTaskFromMessage({
                          content: plain.slice(0, 200),
                          description: plain,
                          mentionedIds,
                        });
                      }}
                      onDeleteLocal={handleDeleteLocal}
                      onReactionUpdate={(messageId, reactions) => {
                        setMessages((prev) =>
                          prev.map((m) =>
                            m.id === messageId
                              ? ({ ...m, reactions } as any)
                              : m,
                          ),
                        );
                      }}
                    />
                  </div>
                );
              })}
              <TypingIndicator
                typingUsers={typingUsers}
                memberNames={memberNames}
              />
              <div ref={bottomRef} />
            </ScrollArea>

            <LexicalEditor
              topicId={topic.id}
              topicName={topic.name}
              users={workspaceMembers}
              topics={allTopics}
              onSend={handleSend}
            />
          </div>

          {/* Thread panel */}
          {threadMessage && (
            <ThreadPanel
              parentMessage={threadMessage}
              workspaceId={workspaceId}
              topicId={topic.id}
              topicName={topic.name}
              workspaceMembers={workspaceMembers}
              allTopics={allTopics}
              onClose={() => setThreadMessage(null)}
            />
          )}
        </div>
      )}

      {activeTab === "tasks" && (
        <div className="flex-1 overflow-hidden">
          <TasksTab
            topic={topic}
            workspaceId={workspaceId}
            workspaceMembers={workspaceMembers}
          />
        </div>
      )}

      {activeTab === "vault" && (
        <div className="flex-1 overflow-hidden">
          <VaultTab topic={topic} workspaceId={workspaceId} />
        </div>
      )}

      {activeTab === "media" && (
        <div className="flex-1 overflow-hidden">
          <MediaTab topic={topic} workspaceId={workspaceId} />
        </div>
      )}

      {activeTab === "links" && (
        <div className="flex-1 overflow-hidden">
          <LinksTab topic={topic} workspaceId={workspaceId} />
        </div>
      )}

      {/* Create task modal */}
      {taskFromMessage && statuses.length > 0 && (
        <CreateTaskModal
          workspaceId={workspaceId}
          topicId={topic.id}
          statusId={statuses[0].id}
          statuses={statuses}
          workspaceMembers={workspaceMembers}
          onClose={() => setTaskFromMessage(null)}
          onCreated={(task) => {
            addTask(task);
            setTaskFromMessage(null);
          }}
          prefillTitle={taskFromMessage.content}
          prefillDescription={taskFromMessage.description}
          creatorName={user?.name}
          prefillAssigneeIds={taskFromMessage.mentionedIds}
        />
      )}
    </div>
  );
}
