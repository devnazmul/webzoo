import { useState } from 'react';
import { CheckSquare, BookOpen, Image, Link } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Topic } from '@webzoo/shared';
import TasksTab from '@/components/tasks/TasksTab';
import VaultTab from '@/components/vault/VaultTab';
import MediaTab from '@/components/media/MediaTab';
import LinksTab from '@/components/links/LinksTab';

type Tab = 'tasks' | 'vault' | 'media' | 'links';

interface Props {
  topic: Topic;
  workspaceId: string;
  workspaceMembers: { id: string; label: string }[];
}

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'tasks', label: 'Tasks', icon: <CheckSquare size={15} /> },
  { id: 'vault', label: 'Vault', icon: <BookOpen size={15} /> },
  { id: 'media', label: 'Media', icon: <Image size={15} /> },
  { id: 'links', label: 'Links', icon: <Link size={15} /> },
];

export default function RightPanel({ topic, workspaceId, workspaceMembers }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('tasks');

  return (
    <div className="flex flex-col h-full border-l border-border bg-background">
      {/* Tab bar */}
      <div className="flex border-b border-border flex-shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px',
              activeTab === tab.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'tasks' && (
          <TasksTab
            topic={topic}
            workspaceId={workspaceId}
            workspaceMembers={workspaceMembers}
          />
        )}
        {activeTab === 'vault' && (
          <VaultTab topic={topic} workspaceId={workspaceId} />
        )}
        {activeTab === 'media' && (
          <MediaTab topic={topic} workspaceId={workspaceId} />
        )}
        {activeTab === 'links' && (
          <LinksTab topic={topic} workspaceId={workspaceId} />
        )}
      </div>
    </div>
  );
}
