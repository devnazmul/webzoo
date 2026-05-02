import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/store/auth.store";
import { useWorkspaceStore } from "@/store/workspace.store";
import { useTopicStore } from "@/store/topic.store";
import { connectSocket, getSocket } from "@/lib/socket";
import api from "@/lib/api";
import Sidebar from "@/components/layout/Sidebar";
import SidebarNarrow from "@/components/layout/SidebarNarrow";
import TopBar from "@/components/layout/TopBar";
import RightPanel from "@/components/layout/RightPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MessageFeed from "@/components/chat/MessageFeed";

export default function AppShell() {
  const user = useAuthStore((s) => s.user);
  const { workspaces, activeWorkspace, setWorkspaces, setActiveWorkspace } =
    useWorkspaceStore();
  const { setTopics, setActiveTopic } = useTopicStore();

  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [showCreateTopic, setShowCreateTopic] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(false);
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
          }))
        );
      }
    } catch {}
  }, [setWorkspaces, setActiveWorkspace]);

  const loadTopics = useCallback(async (workspaceId: string) => {
    try {
      const res = await api.get(`/workspaces/${workspaceId}/topics`);
      const data = res.data.data.topics;
      setTopics(data);
      if (data.length > 0) setActiveTopic(data[0]);
      setAllTopics(data.map((t: any) => ({ id: t.id, label: t.name })));
    } catch {}
  }, [setTopics, setActiveTopic]);

  useEffect(() => {
    if (user) {
      connectSocket(user.id);
      loadWorkspaces();
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
    function onPresenceUpdate(data: {
      topicId: string;
      onlineUsers: string[];
    }) {
      setOnlineUsers(data.onlineUsers);
    }
    socket.on("presence:update", onPresenceUpdate);
    return () => {
      socket.off("presence:update", onPresenceUpdate);
    };
  }, [activeWorkspace]);

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

  const activeTopic = useTopicStore((s) => s.activeTopic);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-space-black relative">
      {/* Aurora Blurry Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full animate-aurora" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/5 blur-[150px] rounded-full animate-aurora" style={{ animationDelay: '-5s' }} />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-spectral-white/5 blur-[100px] rounded-full animate-aurora" style={{ animationDelay: '-10s' }} />
      </div>

      {/* Top Header */}

      <TopBar />

      <div className="flex flex-1 min-h-0 overflow-hidden relative z-10">
        {/* Workspace Switcher */}
        <SidebarNarrow 
          onCreateWorkspace={() => {
            setModalError("");
            setShowCreateWorkspace(true);
          }} 
        />

        {/* Navigation Sidebar */}
        <div className="w-64 flex-shrink-0 flex">
          <Sidebar
            onCreateTopic={() => {
              setModalError("");
              setShowCreateTopic(true);
            }}
            onInviteMember={() => {
              setModalError("");
              setShowInvite(true);
            }}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-black/10 backdrop-blur-sm border-l border-ghost-border">
          {activeTopic && (
            <MessageFeed
              topic={activeTopic}
              workspaceId={activeWorkspace!.id}
              memberNames={memberNames}
              onlineUsers={onlineUsers}
              workspaceMembers={workspaceMembers}
              allTopics={allTopics}
              onToggleDetails={() => setShowRightPanel(!showRightPanel)}
            />
          )}
        </div>

        {/* Right Panel */}
        {showRightPanel && (
          <RightPanel 
            onClose={() => setShowRightPanel(false)}
            onlineCount={onlineUsers.length}
          />
        )}
      </div>


      {/* Modals ... */}

      {/* Modals */}
      {(showCreateWorkspace || showCreateTopic || showInvite) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm border-ghost-border bg-black/40 shadow-[0_0_50px_rgba(0,0,0,0.5)]">

            {showCreateWorkspace && (
              <>
                <CardHeader>
                  <CardTitle>Create workspace</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateWorkspace} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Workspace name</Label>
                      <Input
                        value={wsName}
                        onChange={(e) => setWsName(e.target.value)}
                        placeholder="My Team"
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
                        onClick={() => setShowCreateWorkspace(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">Create</Button>
                    </div>
                  </form>
                </CardContent>
              </>
            )}

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
