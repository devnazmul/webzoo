import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth.store";
import { useWorkspaceStore } from "@/store/workspace.store";
import { useTopicStore } from "@/store/topic.store";
import { connectSocket, getSocket } from "@/lib/socket";
import api from "@/lib/api";
import Sidebar from "@/components/layout/Sidebar";
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

  async function loadWorkspaces() {
    try {
      const res = await api.get("/workspaces");
      const data = res.data.data.workspaces;
      setWorkspaces(data);
      if (data.length > 0) {
        setActiveWorkspace(data[0]);
        // Build member names map
        const members = data[0]?.members ?? [];
        const names: Record<string, string> = {};
        members.forEach((m: any) => {
          names[m.user.id] = m.user.name;
        });
        setMemberNames(names);
      }
      if (data.length > 0) {
        const members = data[0]?.members ?? [];
        setWorkspaceMembers(
          members.map((m: any) => ({
            id: m.user.id,
            label: m.user.name,
          }))
        );
      }
    } catch {}
  }

  async function loadTopics(workspaceId: string) {
    try {
      const res = await api.get(`/workspaces/${workspaceId}/topics`);
      const data = res.data.data.topics;
      setTopics(data);
      if (data.length > 0) setActiveTopic(data[0]);
      setAllTopics(data.map((t: any) => ({ id: t.id, label: t.name })));
    } catch {}
  }

  // Initialize socket and load workspaces
  useEffect(() => {
    if (user) {
      connectSocket(user.id);
      loadWorkspaces();
    }
  }, [user]);

  // Load topics when active workspace changes
  useEffect(() => {
    if (activeWorkspace) {
      loadTopics(activeWorkspace.id);
    }
  }, [activeWorkspace]);

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
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <div className="w-60 flex-shrink-0 border-r border-border">
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
        />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-0">
        {activeTopic && (
          <MessageFeed
            topic={activeTopic}
            workspaceId={activeWorkspace!.id}
            memberNames={memberNames}
            onlineUsers={onlineUsers}
            workspaceMembers={workspaceMembers}
            allTopics={allTopics}
          />
        )}
      </div>

      {/* Modals */}
      {(showCreateWorkspace || showCreateTopic || showInvite) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-sm">
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
