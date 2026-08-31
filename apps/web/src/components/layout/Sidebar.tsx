import { useState } from "react";
import { useWorkspaceStore } from "@/store/workspace.store";
import { useTopicStore } from "@/store/topic.store";
import { useDMStore } from '@/store/dm.store';
import { useAuthStore } from '@/store/auth.store';
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import NotificationBell from '@/components/ui/NotificationBell';
import ThemeToggle from '@/components/ui/ThemeToggle';
import ProfileModal from '@/components/ui/ProfileModal';
import WorkspaceSettingsModal from '@/components/layout/WorkspaceSettingsModal';
import api from '@/lib/api';
import {
  Hash,
  Plus,
  ChevronDown,
  SquarePen,
  Lock,
  Settings,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

interface SidebarProps {
  onCreateTopic: () => void;
  onInviteMember: () => void;
  onCreateWorkspace: () => void;
  workspaceMembers: { id: string; label: string }[];
}

interface SectionHeaderProps {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  onAdd?: () => void;
}

const SectionHeader = ({
  label,
  isOpen,
  onToggle,
  onAdd,
}: SectionHeaderProps) => (
  <div className="flex items-center justify-between px-6 mt-6 mb-2 group text-foreground/50">
    <button
      onClick={onToggle}
      className="flex items-center gap-2 cursor-pointer transition-colors hover:text-foreground"
    >
      <ChevronDown
        size={12}
        className={cn(
          "opacity-70 transition-transform duration-200",
          !isOpen && "-rotate-90",
        )}
      />
      <span className="text-[10px] font-bold uppercase tracking-[1.5px] font-sans">
        {label}
      </span>
    </button>
    {onAdd && (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAdd();
        }}
        className="opacity-0 cursor-pointer group-hover:opacity-100 transition-opacity hover:text-foreground"
      >
        <Plus size={14} />
      </button>
    )}
  </div>
);

export default function Sidebar({
  onCreateTopic,
  onCreateWorkspace,
  onInviteMember,
  workspaceMembers,
}: SidebarProps) {
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const topics = useTopicStore((s) => s.topics);
  const activeTopic = useTopicStore((s) => s.activeTopic);
  const setActiveTopic = useTopicStore((s) => s.setActiveTopic);
  const unreadCounts = useTopicStore((s) => s.unreadCounts);
  const user = useAuthStore((s) => s.user);
  const { conversations, activeConversation, setConversations, setActiveConversation } = useDMStore();
  const setActiveDM = setActiveConversation;
  const dmUnreads = conversations.reduce((acc, c) => acc + c.unreadCount, 0);

  const [topicsExpanded, setTopicsExpanded] = useState(true);
  const [dmsExpanded, setDmsExpanded] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [showWorkspaceSettings, setShowWorkspaceSettings] = useState(false);

  async function startDM(memberId: string) {
    try {
      const res = await api.post('/dm/conversations', { participantId: memberId });
      const conv = res.data.data.conversation;
      // Add to list if not already present
      const exists = conversations.find((c) => c.id === conv.id);
      if (!exists) setConversations([...conversations, conv]);
      setActiveDM(conv);
      // Clear active topic
      useTopicStore.getState().setActiveTopic(
        useTopicStore.getState().topics[0] ?? null as any
      );
    } catch {}
  }

  return (
    <div
      className="flex-1 flex flex-col bg-[#faf8f5] dark:bg-[#111b21] border-r border-border/80"
    >
      {/* Workspace Header */}
      <div className="h-14 border-b border-border/80 flex items-center px-6 justify-between group bg-[#f0f2f5] dark:bg-[#202c33]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 hover:bg-accent/10 rounded-full px-3 py-1 transition-all pointer-events-auto border border-transparent hover:border-border">
              <span className="font-sans font-bold text-[13px] tracking-wide text-foreground">
                {activeWorkspace?.name ?? "Webzoo"}
              </span>
              <ChevronDown size={14} className="text-muted-foreground/70" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 bg-card border-border text-foreground">
            <DropdownMenuItem onClick={onInviteMember} className="text-[11px] font-bold tracking-wider">
              Invite people to {activeWorkspace?.name}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCreateTopic} className="text-[11px] font-bold tracking-wider">
              Create a channel
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem onClick={() => setShowWorkspaceSettings(true)} className="text-[11px] font-bold tracking-wider">
              <Users size={14} className="mr-2" />
              Workspace settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowProfile(true)} className="text-[11px] font-bold tracking-wider">
              <Settings size={14} className="mr-2" />
              Profile settings
            </DropdownMenuItem>
            {workspaceMembers && workspaceMembers.length > 0 && (
              <>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuLabel className="text-[10px] font-bold tracking-wider px-2 py-1.5 text-muted-foreground/60">Message a member</DropdownMenuLabel>
                {workspaceMembers.map((m) => (
                  <DropdownMenuItem
                    key={m.id}
                    onClick={() => startDM(m.id)}
                    className="text-[11px] font-bold tracking-wider"
                  >
                    <div className="w-2 h-2 rounded-full bg-green-500 mr-2 flex-shrink-0" />
                    {m.label}
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <button className="bg-background hover:bg-accent/10 w-8 h-8 rounded-full flex items-center justify-center text-foreground border border-border transition-all active:scale-95 cursor-pointer">
          <SquarePen size={14} />
        </button>
      </div>

      <ScrollArea className="flex-1 py-4">

        {/* Topics */}
        <SectionHeader
          label="Topics"
          isOpen={topicsExpanded}
          onToggle={() => setTopicsExpanded(!topicsExpanded)}
          onAdd={onCreateTopic}
        />
        {topicsExpanded && (
          <div className="space-y-0.5 mb-6">
            {topics.map((topic) => {
              const unread = unreadCounts[topic.id] ?? 0;
              const isActive = activeTopic?.id === topic.id;
              const isPrivate = (topic as any).private;
              return (
                <button
                  key={topic.id}
                  onClick={() => { setActiveConversation(null); setActiveTopic(topic); }}
                  className={cn(
                    "flex items-center cursor-pointer gap-3 w-full px-6 py-2.5 text-xs font-semibold transition-all group relative",
                    isActive
                      ? "bg-accent/15 text-whatsapp-teal border-r-[3px] border-whatsapp-teal dark:bg-accent/10"
                      : unread > 0
                      ? "text-foreground hover:bg-accent/8 font-bold"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/8",
                  )}
                >
                  {isPrivate ? (
                    <Lock
                      size={14}
                      className={isActive ? "text-whatsapp-teal" : unread > 0 ? "text-foreground" : "text-muted-foreground"}
                    />
                  ) : (
                    <Hash
                      size={14}
                      className={isActive ? "text-whatsapp-teal" : unread > 0 ? "text-foreground" : "text-muted-foreground"}
                    />
                  )}
                  <span className="truncate flex-1 text-left">{topic.name}</span>
                  {unread > 0 && !isActive && (
                    <span className="ml-auto flex-shrink-0 min-w-[18px] h-[18px] rounded-full bg-whatsapp-teal text-white text-[9px] font-bold flex items-center justify-center px-1">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </button>
              );
            })}
            <button
              onClick={onCreateTopic}
              className="flex items-center cursor-pointer gap-2 w-full px-6 py-2 text-xs font-semibold text-muted-foreground/60 hover:text-foreground hover:bg-accent/8 transition-colors"
            >
              <Plus size={14} />
              <span>Add topic</span>
            </button>
          </div>
        )}

        {/* Direct Messages */}
        <SectionHeader
          label="Direct Messages"
          isOpen={dmsExpanded}
          onToggle={() => setDmsExpanded(!dmsExpanded)}
        />
        {dmsExpanded && (
          <div className="px-6 py-2 space-y-1">
            {conversations.length === 0 && (
              <p className="px-2 text-xs text-muted-foreground/40 font-semibold mt-1">No conversations yet</p>
            )}
            {conversations.map((conv) => {
              const other = conv.participants.find((p) => p.id !== user?.id);
              const isActive = activeConversation?.id === conv.id;
              return (
                <button
                  key={conv.id}
                  onClick={() => setActiveConversation(conv)}
                  className={cn(
                    'flex items-center gap-3 w-full px-2 py-2 rounded-lg text-xs transition-colors font-semibold',
                    isActive
                      ? 'bg-accent/15 text-whatsapp-teal border-r-[3px] border-whatsapp-teal dark:bg-accent/10'
                      : conv.unreadCount > 0
                      ? 'text-foreground font-bold hover:bg-accent/8'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/8'
                  )}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                  <span className="truncate flex-1 text-left">{other?.name ?? 'Unknown'}</span>
                  {conv.unreadCount > 0 && !isActive && (
                    <span className="ml-auto flex-shrink-0 min-w-[18px] h-[18px] rounded-full bg-whatsapp-teal text-white text-[9px] font-bold flex items-center justify-center px-1">
                      {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
      <div className="p-4 border-t border-border/80 flex items-center justify-end gap-2 bg-[#f0f2f5] dark:bg-[#111b21]">
        <NotificationBell />
        <ThemeToggle />
      </div>
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      {showWorkspaceSettings && <WorkspaceSettingsModal onClose={() => setShowWorkspaceSettings(false)} />}
    </div>
  );
}
