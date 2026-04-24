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
      "flex items-center cursor-pointer gap-2 w-full px-4 py-1 text-[13px] transition-colors group relative",
      active
        ? "bg-slack-active text-sidebar-text font-medium"
        : "text-sidebar-dim hover:bg-sidebar-hover",
    )}
  >
    <Icon
      size={16}
      className={active ? "text-sidebar-text" : "text-sidebar-dim"}
    />
    <span className="truncate flex-1 text-left">{label}</span>
    {badge && (
      <span className="bg-slack-unread text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
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
  <div className="flex items-center justify-between px-4 mt-5 mb-1 group text-sidebar-dim">
    <button
      onClick={onToggle}
      className="flex items-center gap-1.5 cursor-pointer transition-colors"
    >
      <ChevronDown
        size={14}
        className={cn(
          "opacity-70 transition-transform duration-200",
          !isOpen && "-rotate-90",
        )}
      />
      <span className="text-[11px] font-semibold uppercase tracking-tight">
        {label}
      </span>
    </button>
    {onAdd && (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAdd();
        }}
        className="opacity-0 cursor-pointer group-hover:opacity-100 transition-opacity hover:text-sidebar-text"
      >
        <Plus size={16} />
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
      className="flex-1 flex flex-col bg-slack-wide border-r border-sidebar-border"
      style={{
        backgroundColor: "var(--slack-wide)",
      }}
    >
      {/* Workspace Header */}
      <div className="h-12 border-b border-sidebar-border flex items-center px-4 justify-between group">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 hover:bg-sidebar-hover rounded px-1.5 -ml-1 transition-colors min-w-0 pointer-events-auto">
              <span className="font-bold text-[15px] truncate text-shadow-slack-top text-sidebar-text">
                {activeWorkspace?.name ?? "Webzoo"}
              </span>
              <ChevronDown size={14} className="text-sidebar-dim" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuItem onClick={onInviteMember}>
              Invite people to {activeWorkspace?.name}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCreateTopic}>
              Create a channel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <button className="bg-white hover:bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center text-slack-wide shadow-sm transition-all active:scale-95 cursor-pointer">
          <SquarePen size={16} />
        </button>
      </div>

      <ScrollArea className="flex-1 py-3">
        {/* Top items */}
        <div className="space-y-1">
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
          <div className="space-y-1 mb-4">
            {topics.map((topic) => (
              <button
                key={topic.id}
                onClick={() => setActiveTopic(topic)}
                className={cn(
                  "flex items-center cursor-pointer gap-2 w-full px-4 py-1 text-[13px] transition-colors group relative",
                  activeTopic?.id === topic.id
                    ? "bg-slack-top text-sidebar-text font-medium"
                    : "text-sidebar-dim",
                )}
              >
                {topic.private ? (
                  <Lock
                    size={16}
                    className={
                      activeTopic?.id === topic.id
                        ? "text-sidebar-text"
                        : "text-sidebar-dim"
                    }
                  />
                ) : (
                  <Hash
                    size={16}
                    className={
                      activeTopic?.id === topic.id
                        ? "text-sidebar-text"
                        : "text-sidebar-dim"
                    }
                  />
                )}
                <span className="truncate flex-1 text-left">{topic.name}</span>
              </button>
            ))}
            <button
              onClick={onCreateTopic}
              className="flex items-center cursor-pointer gap-2 w-full px-4 py-1 text-[13px] text-sidebar-dim hover:bg-sidebar-hover transition-colors"
            >
              <div className="bg-sidebar-hover rounded p-0.5">
                <Plus size={12} />
              </div>
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
          <div className="px-4 py-2 space-y-2">
            <div className="flex items-center gap-2 text-sidebar-dim cursor-pointer transition-colors group">
              <div className="w-5 h-5 rounded bg-sidebar-hover flex items-center justify-center text-[10px] group-hover:bg-sidebar-border transition-colors text-sidebar-text">
                UN
              </div>
              <span className="text-[13px]">User Name</span>
            </div>
            <p className="text-[11px] text-sidebar-dim/60 ml-7">
              Add teammates to chat!
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
