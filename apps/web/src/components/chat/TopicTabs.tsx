import { cn } from '@/lib/utils';
import {
  MessageSquare, CheckSquare, BookOpen,
  Image, Link,
} from 'lucide-react';

export type TopicTab = 'messages' | 'tasks' | 'vault' | 'media' | 'links';

interface Props {
  activeTab: TopicTab;
  onChange: (tab: TopicTab) => void;
  topicName: string;
  onlineCount: number;
}

const TABS: { id: TopicTab; label: string; icon: React.ReactNode }[] = [
  { id: 'messages', label: 'Messages', icon: <MessageSquare size={14} /> },
  { id: 'tasks',    label: 'Tasks',    icon: <CheckSquare size={14} /> },
  { id: 'vault',    label: 'Vault',    icon: <BookOpen size={14} /> },
  { id: 'media',    label: 'Media',    icon: <Image size={14} /> },
  { id: 'links',    label: 'Links',    icon: <Link size={14} /> },
];

export default function TopicTabs({
  activeTab,
  onChange,
  topicName,
  onlineCount,
}: Props) {
  return (
    <div className="flex items-center border-b border-border flex-shrink-0 bg-background">
      {/* Topic name */}
      <div className="flex items-center gap-2 px-4 py-2 border-r border-border flex-shrink-0">
        <span className="text-muted-foreground">#</span>
        <span className="font-semibold text-sm">{topicName}</span>
        <span className="text-xs text-muted-foreground ml-1">
          {onlineCount} online
        </span>
      </div>

      {/* Tabs */}
      <div className="flex items-center overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
              activeTab === tab.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
