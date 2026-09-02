import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  MessageSquare,
  CheckSquare,
  BookOpen,
  Image,
  Link,
} from "lucide-react";

export type TopicTab = "messages" | "tasks" | "vault" | "media" | "links";

interface Props {
  activeTab: TopicTab;
  onChange: (tab: TopicTab) => void;
  topicName: string;
  onlineCount: number;
  onlineUserNames: string[];
}

const TABS: { id: TopicTab; label: string; icon: React.ReactNode }[] = [
  { id: "messages", label: "Messages", icon: <MessageSquare size={14} /> },
  { id: "tasks", label: "Tasks", icon: <CheckSquare size={14} /> },
  { id: "vault", label: "Vault", icon: <BookOpen size={14} /> },
  { id: "media", label: "Media", icon: <Image size={14} /> },
  { id: "links", label: "Links", icon: <Link size={14} /> },
];

export default function TopicTabs({
  activeTab,
  onChange,
  topicName,
  onlineCount,
  onlineUserNames,
}: Props) {
  const [showOnline, setShowOnline] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setShowOnline(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div className="flex flex-col md:flex-row border-b border-border flex-shrink-0 bg-background">
      {/* Topic name */}
      <div className="flex border-b border-border items-center justify-between md:justify-start gap-2 px-4 py-2 md:border-r flex-shrink-0">
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">#</span>
          <span className="font-semibold text-sm">{topicName}</span>
        </div>

        <div className="relative ml-2" ref={popupRef}>
          <button
            type="button"
            onClick={() => setShowOnline((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full inline-block",
                onlineCount === 0 ? "bg-red-500" : "bg-green-500"
              )}
            />
            {onlineCount} Online
          </button>

          {showOnline && onlineUserNames.length > 0 && (
            <div className="absolute top-7 left-0 w-48 bg-popover border border-border rounded-lg shadow-lg z-50 py-2 overflow-hidden">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-3 pb-1.5">
                Online now
              </p>
              {onlineUserNames.map((name) => (
                <div
                  key={name}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                  {name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex w-full md:w-auto md:items-center overflow-hidden">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex cursor-pointer items-center gap-1.5 px-3 md:px-3 lg:px-4 py-3 text-xs font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
              activeTab === tab.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
            )}
            title={tab.label}
          >
            {tab.icon}
            <span className="hidden lg:inline">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
