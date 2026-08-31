import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useWorkspaceStore } from '@/store/workspace.store';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { X, Users, Settings } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface WorkspaceSettingsModalProps {
  onClose: () => void;
}

interface Member {
  id: string;
  userId: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export default function WorkspaceSettingsModal({ onClose }: WorkspaceSettingsModalProps) {
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const user = useAuthStore((s) => s.user);
  
  const [activeTab, setActiveTab] = useState<'general' | 'members'>('general');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (activeWorkspace && activeTab === 'members') {
      loadMembers();
    }
  }, [activeWorkspace, activeTab]);

  async function loadMembers() {
    try {
      setLoading(true);
      const res = await api.get(`/workspaces/${activeWorkspace?.id}/members`);
      setMembers(res.data.data.members);
    } catch (err: any) {
      console.error(err);
      setError('Failed to load members');
    } finally {
      setLoading(false);
    }
  }

  async function handleLeaveWorkspace() {
    if (!window.confirm(`Are you sure you want to leave ${activeWorkspace?.name}?`)) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      await api.delete(`/workspaces/${activeWorkspace?.id}/members/${user?.id}`);
      window.location.reload();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to leave workspace');
      setLoading(false);
    }
  }

  if (!activeWorkspace) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-popover text-popover-foreground w-full max-w-2xl rounded-xl shadow-2xl border border-border overflow-hidden flex h-[600px] max-h-[85vh]">
        
        {/* Left Sidebar for Tabs */}
        <div className="w-64 bg-card border-r border-border p-4 flex flex-col">
          <div className="mb-6 px-2">
            <h2 className="text-lg font-bold truncate">{activeWorkspace.name}</h2>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-1">Workspace Settings</p>
          </div>
          
          <nav className="space-y-1 flex-1">
            <button
              onClick={() => setActiveTab('general')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'general' ? 'bg-whatsapp-teal text-white' : 'hover:bg-accent/50 text-foreground'
              }`}
            >
              <Settings size={16} />
              General
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'members' ? 'bg-whatsapp-teal text-white' : 'hover:bg-accent/50 text-foreground'
              }`}
            >
              <Users size={16} />
              Members
            </button>
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <X size={20} />
          </button>
          
          <div className="p-8 pb-4 border-b border-border">
            <h3 className="text-xl font-bold">
              {activeTab === 'general' && 'General Settings'}
              {activeTab === 'members' && 'Workspace Members'}
            </h3>
          </div>

          <ScrollArea className="flex-1 p-8 pt-6">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg mb-4 border border-destructive/20 font-medium">
                {error}
              </div>
            )}

            {activeTab === 'general' && (
              <div className="space-y-8">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Workspace Name</h4>
                  <p className="text-base font-medium">{activeWorkspace.name}</p>
                </div>

                <div className="pt-6 border-t border-border">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-destructive mb-4">Danger Zone</h4>
                  <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">Leave Workspace</p>
                      <p className="text-xs text-muted-foreground mt-1">You will no longer have access to this workspace's channels or data.</p>
                    </div>
                    <Button 
                      variant="destructive" 
                      onClick={handleLeaveWorkspace}
                      disabled={loading}
                      className="whitespace-nowrap ml-4 font-semibold"
                    >
                      {loading ? 'Leaving...' : 'Leave Workspace'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'members' && (
              <div className="space-y-4">
                {loading && members.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Loading members...</p>
                ) : (
                  <div className="rounded-lg border border-border bg-card overflow-hidden">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-4 border-b border-border/50 last:border-0 hover:bg-accent/5 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-whatsapp-teal/10 text-whatsapp-teal font-bold flex items-center justify-center uppercase text-sm border border-whatsapp-teal/20">
                            {member.user.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold flex items-center gap-2">
                              {member.user.name}
                              {member.user.id === user?.id && (
                                <span className="text-[10px] bg-accent text-muted-foreground px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">You</span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">{member.user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                            member.role === 'OWNER' 
                              ? 'bg-whatsapp-teal/10 text-whatsapp-teal border border-whatsapp-teal/20' 
                              : 'bg-accent text-muted-foreground'
                          }`}>
                            {member.role}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
