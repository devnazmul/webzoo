import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/store/auth.store";
import { useWorkspaceStore } from "@/store/workspace.store";
import { useTopicStore } from "@/store/topic.store";
import { connectSocket, getSocket } from "@/lib/socket";
import api from "@/lib/api";
import Sidebar from "@/components/layout/Sidebar";
import SidebarNarrow from "@/components/layout/SidebarNarrow";
import TopBar from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MessageFeed from "@/components/chat/MessageFeed";
import { useDMStore } from '@/store/dm.store';
import DMFeed from '@/components/dm/DMFeed';
import NoWorkspaceState from '@/components/layout/NoWorkspaceState';
import CreateChannelWizard from '@/components/layout/CreateChannelWizard';

export default function AppShell() {
  const user = useAuthStore((s) => s.user);
  const { workspaces, activeWorkspace, setWorkspaces, setActiveWorkspace } =
    useWorkspaceStore();
  const { setTopics, setActiveTopic, activeTopic, setUnreadCounts, incrementUnread, clearUnread } = useTopicStore();
  const {
    conversations,
    activeConversation,
    setConversations,
    setActiveConversation,
    incrementUnread: dmIncrementUnread,
    clearUnread: dmClearUnread,
  } = useDMStore();

  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [showCreateTopic, setShowCreateTopic] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [wsName, setWsName] = useState("");
  const [topicName, setTopicName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [modalError, setModalError] = useState("");
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<
    { id: string; label: string }[]
  >([]);
  const [allTopics, setAllTopics] = useState<
    { id: string; label: string }[]
  >([]);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [hasLoadedWorkspaces, setHasLoadedWorkspaces] = useState(false);

  // Auto-close sidebar on mobile when active channel or DM changes
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [activeTopic?.id, activeConversation?.id]);

  // ... (keep loadWorkspaces, loadTopics, useEffects unchanged to preserve logic)
  const loadWorkspaces = useCallback(async () => {
    try {
      const res = await api.get("/workspaces");
      const data = res.data.data.workspaces;
      setWorkspaces(data);
      if (data.length > 0) {
        setActiveWorkspace(data[0]);
        const members = data[0]?.members ?? [];
        const names: Record<string, string> = {};
        members.forEach((m: any) => {
          names[m.user.id] = m.user.name;
        });
        setMemberNames(names);
        setWorkspaceMembers(
          members.map((m: any) => ({
            id: m.user.id,
            label: m.user.name,
            role: m.role,
          }))
        );
      }
    } catch {} finally {
      setHasLoadedWorkspaces(true);
    }
  }, [setWorkspaces, setActiveWorkspace]);

  const loadTopics = useCallback(async (workspaceId: string) => {
    try {
      const [topicsRes, unreadRes] = await Promise.all([
        api.get(`/workspaces/${workspaceId}/topics`),
        api.get(`/workspaces/${workspaceId}/topics/unread-counts`),
      ]);
      const data = topicsRes.data.data.topics;
      setTopics(data);
      if (data.length > 0) setActiveTopic(data[0]);
      setAllTopics(data.map((t: any) => ({ id: t.id, label: t.name })));
      setUnreadCounts(unreadRes.data.data.unreadCounts);
    } catch {}
  }, [setTopics, setActiveTopic, setUnreadCounts]);

  async function loadDMs() {
    try {
      const res = await api.get('/dm/conversations');
      setConversations(res.data.data.conversations ?? []);
    } catch {}
  }

  useEffect(() => {
    if (user) {
      connectSocket(user.id);
      loadWorkspaces();
      loadDMs();
    }
  }, [user, loadWorkspaces]);

  useEffect(() => {
    if (activeWorkspace) {
      loadTopics(activeWorkspace.id);
    }
  }, [activeWorkspace, loadTopics]);

  useEffect(() => {
    if (!activeWorkspace) return;
    const socket = getSocket();

    function onPresenceUpdate(data: { topicId: string; onlineUsers: string[] }) {
      setOnlineUsers(data.onlineUsers);
    }

    function onNewMessage(data: { message: { topicId: string } }) {
      const { activeTopic } = useTopicStore.getState();
      if (data.message.topicId !== activeTopic?.id) {
        incrementUnread(data.message.topicId);
      }
    }

    function onNewDMMessage(data: { message: { conversationId: string } }) {
      const { activeConversation, conversations } = useDMStore.getState();

      // If conversation not in list yet, reload the full list
      const known = conversations.find((c) => c.id === data.message.conversationId);
      if (!known) {
        loadDMs();
        return;
      }

      if (data.message.conversationId !== activeConversation?.id) {
        dmIncrementUnread(data.message.conversationId);
      }
    }

    socket.on('presence:update', onPresenceUpdate);
    socket.on('message:new', onNewMessage);
    socket.on('dm:message:new', onNewDMMessage);
    return () => {
      socket.off('presence:update', onPresenceUpdate);
      socket.off('message:new', onNewMessage);
      socket.off('dm:message:new', onNewDMMessage);
    };
  }, [activeWorkspace, incrementUnread, dmIncrementUnread, dmClearUnread]);

  async function handleCreateWorkspace(e: React.FormEvent) {
    e.preventDefault();
    setModalError("");
    try {
      const res = await api.post("/workspaces", { name: wsName });
      const ws = res.data.data.workspace;
      setWorkspaces([...workspaces, ws]);
      setActiveWorkspace(ws);
      setWsName("");
      setShowCreateWorkspace(false);
    } catch (err: any) {
      setModalError(
        err.response?.data?.message || "Failed to create workspace",
      );
    }
  }

  async function handleCreateTopic(e: React.FormEvent) {
    e.preventDefault();
    setModalError("");
    if (!activeWorkspace) return;
    try {
      const res = await api.post(`/workspaces/${activeWorkspace.id}/topics`, {
        name: topicName,
      });
      const topic = res.data.data.topic;
      const { topics } = useTopicStore.getState();
      setTopics([...topics, topic]);
      setActiveTopic(topic);
      setTopicName("");
      setShowCreateTopic(false);
    } catch (err: any) {
      setModalError(err.response?.data?.message || "Failed to create topic");
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setModalError("");
    if (!activeWorkspace) return;
    try {
      await api.post(`/workspaces/${activeWorkspace.id}/invite`, {
        email: inviteEmail,
      });
      setInviteEmail("");
      setShowInvite(false);
    } catch (err: any) {
      setModalError(err.response?.data?.message || "Failed to invite member");
    }
  }



  // Mark topic as read when user switches to it
  useEffect(() => {
    if (!activeTopic || !activeWorkspace) return;
    clearUnread(activeTopic.id);
    api.post(`/workspaces/${activeWorkspace.id}/topics/${activeTopic.id}/read`).catch(() => {});
  }, [activeTopic?.id, activeWorkspace, clearUnread]);

  useEffect(() => {
    if (!activeConversation) return;
    dmClearUnread(activeConversation.id);
  }, [activeConversation?.id, dmClearUnread]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-space-black relative">
      {/* Aurora Blurry Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full animate-aurora" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/5 blur-[150px] rounded-full animate-aurora" style={{ animationDelay: '-5s' }} />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-spectral-white/5 blur-[100px] rounded-full animate-aurora" style={{ animationDelay: '-10s' }} />
      </div>

      {/* Mobile Sidebar Overlay Drawer (Placed at root level with high z-index to sit on top of the navbar) */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 z-50 flex md:hidden bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setMobileSidebarOpen(false)}
        >
          <div 
            className="flex h-full shadow-2xl animate-slide-in-left"
            onClick={(e) => e.stopPropagation()}
          >
            <SidebarNarrow 
              onCreateWorkspace={() => {
                setModalError("");
                setShowCreateWorkspace(true);
              }} 
            />
            <div className="w-64 flex-shrink-0 flex">
              <Sidebar
                onCreateTopic={() => {
                  setModalError("");
                  setShowCreateTopic(true);
                }}
                onCreateWorkspace={() => {
                  setModalError("");
                  setShowCreateWorkspace(true);
                }}
                onInviteMember={() => {
                  setModalError("");
                  setShowInvite(true);
                }}
                workspaceMembers={workspaceMembers}
              />
            </div>
          </div>
        </div>
      )}

      {/* Top Header */}

      <TopBar onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)} />

      <div className="flex flex-1 min-h-0 overflow-hidden relative z-10">
        {hasLoadedWorkspaces && workspaces.length === 0 ? (
          <NoWorkspaceState onCreate={() => setShowCreateWorkspace(true)} />
        ) : (
          <>
            {/* Desktop Workspace Switcher */}
            <div className="hidden md:flex shrink-0">
              <SidebarNarrow 
                onCreateWorkspace={() => {
                  setModalError("");
                  setShowCreateWorkspace(true);
                }} 
              />
            </div>

            {/* Desktop Navigation Sidebar */}
            <div className="hidden md:flex w-64 flex-shrink-0">
              <Sidebar
                onCreateTopic={() => {
                  setModalError("");
                  setShowCreateTopic(true);
                }}
                onCreateWorkspace={() => {
                  setModalError("");
                  setShowCreateWorkspace(true);
                }}
                onInviteMember={() => {
                  setModalError("");
                  setShowInvite(true);
                }}
                workspaceMembers={workspaceMembers}
              />
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-black/10 backdrop-blur-sm border-l border-ghost-border">
              <div className="flex-1 flex flex-col min-h-0 min-w-0">
                {activeConversation ? (
                  <DMFeed
                    conversation={activeConversation}
                    currentUserId={user?.id ?? ''}
                  />
                ) : activeTopic ? (
                  <MessageFeed
                    topic={activeTopic}
                    workspaceId={activeWorkspace!.id}
                    memberNames={memberNames}
                    onlineUsers={onlineUsers}
                    workspaceMembers={workspaceMembers}
                    allTopics={allTopics}
                  />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-black/20">
                    <div className="w-20 h-20 bg-whatsapp-teal/10 rounded-full flex items-center justify-center mb-6">
                      <div className="text-whatsapp-teal text-4xl">👋</div>
                    </div>
                    <h3 className="text-2xl font-bold text-foreground mb-3 tracking-tight">Welcome to {activeWorkspace?.name}</h3>
                    <p className="text-muted-foreground text-sm max-w-sm">
                      Select a channel from the sidebar to start chatting, or create a new one for your team.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>


      {/* Modals ... */}

      {/* Modals */}
      {showCreateWorkspace && <CreateChannelWizard onClose={() => setShowCreateWorkspace(false)} />}
      
      {(showCreateTopic || showInvite) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm border-ghost-border bg-black/40 shadow-[0_0_50px_rgba(0,0,0,0.5)]">

            {showCreateTopic && (
              <>
                <CardHeader>
                  <CardTitle>Create topic</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateTopic} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Topic name</Label>
                      <Input
                        value={topicName}
                        onChange={(e) => setTopicName(e.target.value)}
                        placeholder="general"
                        required
                        minLength={2}
                      />
                    </div>
                    {modalError && (
                      <p className="text-sm text-destructive">{modalError}</p>
                    )}
                    <div className="flex gap-2 justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setShowCreateTopic(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">Create</Button>
                    </div>
                  </form>
                </CardContent>
              </>
            )}

            {showInvite && (
              <>
                <CardHeader>
                  <CardTitle>Invite member</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleInvite} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Email address</Label>
                      <Input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="colleague@example.com"
                        required
                      />
                    </div>
                    {modalError && (
                      <p className="text-sm text-destructive">{modalError}</p>
                    )}
                    <div className="flex gap-2 justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setShowInvite(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">Invite</Button>
                    </div>
                  </form>
                </CardContent>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
