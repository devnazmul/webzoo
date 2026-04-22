import { useAuthStore } from '@/store/auth.store';
import { useWorkspaceStore } from '@/store/workspace.store';
import { useTopicStore } from '@/store/topic.store';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Hash,
  Plus,
  ChevronDown,
  MessageSquare,
  Settings,
  LogOut,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { disconnectSocket } from '@/lib/socket';

interface SidebarProps {
  onCreateTopic: () => void;
  onCreateWorkspace: () => void;
  onInviteMember: () => void;
}

export default function Sidebar({
  onCreateTopic,
  onCreateWorkspace,
  onInviteMember,
}: SidebarProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);
  const topics = useTopicStore((s) => s.topics);
  const activeTopic = useTopicStore((s) => s.activeTopic);
  const setActiveTopic = useTopicStore((s) => s.setActiveTopic);

  function handleLogout() {
    disconnectSocket();
    clearAuth();
    navigate('/login');
  }

  function getInitials(name: string) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <div className="flex h-full">
      {/* Workspace switcher strip */}
      <div
        className="w-14 flex flex-col items-center py-3 gap-2"
        style={{ background: 'hsl(var(--sidebar))' }}
      >
        {workspaces.map((ws) => (
          <button
            key={ws.id}
            onClick={() => setActiveWorkspace(ws)}
            className={cn(
              'w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold transition-all',
              activeWorkspace?.id === ws.id
                ? 'bg-primary text-primary-foreground rounded-xl'
                : 'bg-secondary text-secondary-foreground hover:rounded-xl'
            )}
            title={ws.name}
          >
            {getInitials(ws.name)}
          </button>
        ))}
        <button
          onClick={onCreateWorkspace}
          className="w-9 h-9 rounded-lg bg-secondary hover:rounded-xl transition-all flex items-center justify-center text-muted-foreground hover:text-foreground"
          title="Create workspace"
        >
          <Plus size={18} />
        </button>
      </div>

      <Separator orientation="vertical" />

      {/* Channel/topic list */}
      <div
        className="flex-1 flex flex-col"
        style={{ background: 'hsl(var(--sidebar))' }}
      >
        {/* Workspace header */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 px-3 py-3 hover:bg-accent transition-colors w-full">
              <span className="font-semibold text-sm truncate flex-1 text-left">
                {activeWorkspace?.name ?? 'Select workspace'}
              </span>
              <ChevronDown size={14} className="text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuItem onClick={onInviteMember}>
              Invite people
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCreateTopic}>
              Create topic
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator />

        <ScrollArea className="flex-1 px-2 py-2">
          {/* Topics */}
          <div className="mb-4">
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Topics
              </span>
              <button
                onClick={onCreateTopic}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
            {topics.map((topic) => (
              <button
                key={topic.id}
                onClick={() => setActiveTopic(topic)}
                className={cn(
                  'flex items-center gap-2 w-full px-2 py-1 rounded text-sm transition-colors',
                  activeTopic?.id === topic.id
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                )}
              >
                <Hash size={14} />
                <span className="truncate">{topic.name}</span>
              </button>
            ))}
          </div>

          {/* Direct Messages placeholder */}
          <div>
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Direct Messages
              </span>
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                <Plus size={14} />
              </button>
            </div>
            <p className="px-2 text-xs text-muted-foreground">
              Coming soon
            </p>
          </div>
        </ScrollArea>

        <Separator />

        {/* User footer */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 px-3 py-3 hover:bg-accent transition-colors w-full">
              <Avatar className="w-7 h-7">
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  {user ? getInitials(user.name) : '?'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium truncate flex-1 text-left">
                {user?.name}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>
              <Settings size={14} className="mr-2" />
              Profile settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive"
            >
              <LogOut size={14} className="mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
