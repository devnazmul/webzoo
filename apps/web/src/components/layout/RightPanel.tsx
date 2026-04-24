import { X, UserPlus, Phone, Search, MoreHorizontal, ChevronDown, Hash } from "lucide-react";
import { useTopicStore } from "@/store/topic.store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RightPanelProps {
  onClose: () => void;
  onlineCount: number;
}

export default function RightPanel({ onClose, onlineCount }: RightPanelProps) {
  const activeTopic = useTopicStore((s) => s.activeTopic);

  if (!activeTopic) return null;

  return (
    <div className="w-80 flex flex-col bg-white border-l border-[#E2E2E2] shrink-0 animate-in slide-in-from-right duration-200">
      <div className="h-12 border-b border-[#E2E2E2] flex items-center px-4 justify-between">
        <span className="font-bold text-[15px] text-main-text">Details</span>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-main-dim hover:text-main-text hover:bg-[#F8F8F8]">
          <X size={18} />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Channel Name */}
          <div className="space-y-1">
             <div className="flex items-center gap-1">
              <Hash size={14} className="text-main-dim" />
              <span className="font-bold text-base text-main-text">{activeTopic.name}</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: UserPlus, label: "Add" },
              { icon: Search, label: "Find" },
              { icon: Phone, label: "Call" },
              { icon: MoreHorizontal, label: "More" },
            ].map((action) => (
              <button key={action.label} className="flex flex-col items-center gap-1 group">
                <div className="w-9 h-9 rounded-full bg-[#F8F8F8] flex items-center justify-center text-main-text group-hover:bg-[#E2E2E2] transition-colors">
                  <action.icon size={18} />
                </div>
                <span className="text-[11px] text-main-dim group-hover:text-main-text">{action.label}</span>
              </button>
            ))}
          </div>

          <div className="h-px bg-[#E2E2E2]" />

          {/* About Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-main-text cursor-pointer group">
              <span className="font-bold text-[13px]">About</span>
              <ChevronDown size={16} className="text-main-dim group-hover:text-main-text" />
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-bold text-main-dim uppercase tracking-wider mb-1">Topic</p>
                <p className="text-[13px] text-main-text leading-relaxed">
                  Main discussion about work and our life
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-main-dim uppercase tracking-wider mb-1">Description</p>
                <p className="text-[13px] text-main-text leading-relaxed">
                  We live, we love, we grow together. Everything will be good if we stay together.
                </p>
              </div>
            </div>
          </div>

          <div className="h-px bg-[#E2E2E2]" />

          {/* Members Section Placeholder */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-main-text cursor-pointer group">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[13px]">Members</span>
                <span className="text-main-dim text-[13px]">{onlineCount}</span>
              </div>
              <ChevronDown size={16} className="text-main-dim group-hover:text-main-text" />
            </div>
          </div>

          <div className="h-px bg-[#E2E2E2]" />

          {/* Pinned Messages Placeholder */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-main-text cursor-pointer group">
              <span className="font-bold text-[13px]">Pinned Messages</span>
              <ChevronDown size={16} className="text-main-dim group-hover:text-main-text" />
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
