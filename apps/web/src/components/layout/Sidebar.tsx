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
import api from '@/lib/api';
import {
  Hash,
  Plus,
  MessageSquareText,
  AtSign,
  FileText,
  History,
  MoreVertical,
  ChevronDown,
  SquarePen,
  Lock,
  Settings,
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

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick?: () => void;
  badge?: string;
}

const NavItem = ({
  icon: Icon,
  label,
  active,
  onClick,
  badge,
}: NavItemProps) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center cursor-pointer gap-2 w-full px-6 py-2 text-[11px] font-bold uppercase tracking-[1.17px] transition-all group relative",
      active
        ? "bg-ghost-surface text-white border-r-2 border-spectral-white"
        : "text-spectral-white/60 hover:text-spectral-white hover:bg-ghost-surface/50",
    )}
  >
    <Icon
      size={14}
      className={active ? "text-white" : "text-spectral-white/60 group-hover:text-spectral-white"}
    />
    <span className="truncate flex-1 text-left">{label}</span>
    {badge && (
      <span className="bg-spectral-white text-space-black text-[9px] px-1.5 py-0.5 rounded-full font-bold">
        {badge}
      </span>
    )}
  </button>
);

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
  <div className="flex items-center justify-between px-6 mt-6 mb-2 group text-spectral-white/40">
    <button
      onClick={onToggle}
      className="flex items-center gap-2 cursor-pointer transition-colors"
    >
      <ChevronDown
        size={12}
        className={cn(
          "opacity-70 transition-transform duration-200",
          !isOpen && "-rotate-90",
        )}
      />
      <span className="text-[10px] font-bold uppercase tracking-[2px]">
        {label}
      </span>
    </button>
    {onAdd && (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAdd();
        }}
        className="opacity-0 cursor-pointer group-hover:opacity-100 transition-opacity hover:text-white"
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
      className="flex-1 flex flex-col bg-black/20 backdrop-blur-md border-r border-ghost-border"
    >
      {/* Workspace Header */}
      <div className="h-12 border-b border-ghost-border flex items-center px-6 justify-between group">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 hover:bg-ghost-surface rounded-full px-3 py-1 transition-all pointer-events-auto border border-transparent hover:border-ghost-border">
              <span className="font-industrial font-bold text-[13px] uppercase tracking-[1.17px] text-spectral-white">
                {activeWorkspace?.name ?? "Webzoo"}
              </span>
              <ChevronDown size={14} className="text-spectral-white/50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 bg-black/90 border-ghost-border text-spectral-white">
            <DropdownMenuItem onClick={onInviteMember} className="uppercase text-[11px] font-bold tracking-wider">
              Invite people to {activeWorkspace?.name}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCreateTopic} className="uppercase text-[11px] font-bold tracking-wider">
              Create a channel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowProfile(true)} className="uppercase text-[11px] font-bold tracking-wider">
              <Settings size={14} className="mr-2" />
              Profile settings
            </DropdownMenuItem>
            {workspaceMembers && workspaceMembers.length > 0 && (
              <>
                <DropdownMenuSeparator className="bg-ghost-border" />
                <DropdownMenuLabel className="uppercase text-[10px] font-bold tracking-wider px-2 py-1.5 text-spectral-white/40">Message a member</DropdownMenuLabel>
                {workspaceMembers.map((m) => (
                  <DropdownMenuItem
                    key={m.id}
                    onClick={() => startDM(m.id)}
                    className="uppercase text-[11px] font-bold tracking-wider"
                  >
                    <div className="w-2 h-2 rounded-full bg-green-500 mr-2 flex-shrink-0" />
                    {m.label}
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <button className="bg-spectral-white/10 hover:bg-spectral-white/20 w-8 h-8 rounded-full flex items-center justify-center text-spectral-white border border-ghost-border transition-all active:scale-95 cursor-pointer">
          <SquarePen size={14} />
        </button>
      </div>

      <ScrollArea className="flex-1 py-4">
        {/* Top items */}
        <div className="space-y-0.5">
          <NavItem icon={History} label="All unreads" badge="2" />
          <NavItem icon={MessageSquareText} label="Threads" />
          <NavItem icon={AtSign} label="Mentions & reactions" />
          <NavItem icon={FileText} label="Drafts" />
          <NavItem icon={MoreVertical} label="More" />
        </div>

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
                    "flex items-center cursor-pointer gap-2 w-full px-6 py-2 text-[11px] font-bold uppercase tracking-[1.17px] transition-all group relative",
                    isActive
                      ? "bg-ghost-surface text-white border-r-2 border-spectral-white"
                      : unread > 0
                      ? "text-spectral-white hover:bg-ghost-surface/50 font-black"
                      : "text-spectral-white/60 hover:text-spectral-white hover:bg-ghost-surface/50",
                  )}
                >
                  {isPrivate ? (
                    <Lock
                      size={14}
                      className={isActive ? "text-white" : unread > 0 ? "text-spectral-white" : "text-spectral-white/60"}
                    />
                  ) : (
                    <Hash
                      size={14}
                      className={isActive ? "text-white" : unread > 0 ? "text-spectral-white" : "text-spectral-white/60"}
                    />
                  )}
                  <span className="truncate flex-1 text-left">{topic.name}</span>
                  {unread > 0 && !isActive && (
                    <span className="ml-auto flex-shrink-0 min-w-[18px] h-[18px] rounded-full bg-spectral-white text-space-black text-[9px] font-bold flex items-center justify-center px-1">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </button>
              );
            })}
            <button
              onClick={onCreateTopic}
              className="flex items-center cursor-pointer gap-2 w-full px-6 py-2 text-[11px] font-bold uppercase tracking-[1.17px] text-spectral-white/40 hover:text-spectral-white hover:bg-ghost-surface/50 transition-colors"
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
              <p className="px-2 text-xs text-spectral-white/30 uppercase tracking-[1px]">No conversations yet</p>
            )}
            {conversations.map((conv) => {
              const other = conv.participants.find((p) => p.id !== user?.id);
              const isActive = activeConversation?.id === conv.id;
              return (
                <button
                  key={conv.id}
                  onClick={() => setActiveConversation(conv)}
                  className={cn(
                    'flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs transition-colors font-bold uppercase tracking-wider',
                    isActive
                      ? 'bg-ghost-surface text-white border-r-2 border-spectral-white'
                      : conv.unreadCount > 0
                      ? 'text-spectral-white font-medium hover:bg-ghost-surface/50'
                      : 'text-spectral-white/60 hover:text-spectral-white hover:bg-ghost-surface/50'
                  )}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                  <span className="truncate flex-1 text-left">{other?.name ?? 'Unknown'}</span>
                  {conv.unreadCount > 0 && !isActive && (
                    <span className="ml-auto flex-shrink-0 min-w-[18px] h-[18px] rounded-full bg-spectral-white text-space-black text-[9px] font-bold flex items-center justify-center px-1">
                      {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
      <div className="p-4 border-t border-ghost-border flex items-center justify-end gap-2">
        <NotificationBell />
        <ThemeToggle />
      </div>
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </div>

  );
}
