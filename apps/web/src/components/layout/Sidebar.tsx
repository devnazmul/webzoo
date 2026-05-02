import { useState } from "react";
import { useWorkspaceStore } from "@/store/workspace.store";
import { useTopicStore } from "@/store/topic.store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
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
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SidebarProps {
  onCreateTopic: () => void;
  onInviteMember: () => void;
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
  onInviteMember,
}: SidebarProps) {
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const topics = useTopicStore((s) => s.topics);
  const activeTopic = useTopicStore((s) => s.activeTopic);
  const setActiveTopic = useTopicStore((s) => s.setActiveTopic);

  const [topicsExpanded, setTopicsExpanded] = useState(true);
  const [dmsExpanded, setDmsExpanded] = useState(true);

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
            {topics.map((topic) => (
              <button
                key={topic.id}
                onClick={() => setActiveTopic(topic)}
                className={cn(
                  "flex items-center cursor-pointer gap-2 w-full px-6 py-2 text-[11px] font-bold uppercase tracking-[1.17px] transition-all group relative",
                  activeTopic?.id === topic.id
                    ? "bg-ghost-surface text-white border-r-2 border-spectral-white"
                    : "text-spectral-white/60 hover:text-spectral-white hover:bg-ghost-surface/50",
                )}
              >
                {topic.private ? (
                  <Lock
                    size={14}
                    className={activeTopic?.id === topic.id ? "text-white" : "text-spectral-white/60"}
                  />
                ) : (
                  <Hash
                    size={14}
                    className={activeTopic?.id === topic.id ? "text-white" : "text-spectral-white/60"}
                  />
                )}
                <span className="truncate flex-1 text-left">{topic.name}</span>
              </button>
            ))}
            <button
              onClick={onCreateTopic}
              className="flex items-center cursor-pointer gap-2 w-full px-6 py-2 text-[11px] font-bold uppercase tracking-[1.17px] text-spectral-white/40 hover:text-spectral-white hover:bg-ghost-surface/50 transition-colors"
            >
              <Plus size={14} />
              <span>Add topic</span>
            </button>
          </div>
        )}

        {/* Direct Messages Placeholder */}
        <SectionHeader
          label="Direct Messages"
          isOpen={dmsExpanded}
          onToggle={() => setDmsExpanded(!dmsExpanded)}
          onAdd={() => {}}
        />
        {dmsExpanded && (
          <div className="px-6 py-2 space-y-3">
            <div className="flex items-center gap-2 text-spectral-white/60 cursor-pointer transition-colors group hover:text-spectral-white">
              <div className="w-6 h-6 rounded-full bg-ghost-surface border border-ghost-border flex items-center justify-center text-[9px] font-bold font-industrial uppercase">
                UN
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider">User Name</span>
            </div>
            <p className="text-[9px] text-spectral-white/30 ml-8 uppercase tracking-[1px]">
              Add teammates to chat!
            </p>
          </div>
        )}
      </ScrollArea>
    </div>

  );
}
