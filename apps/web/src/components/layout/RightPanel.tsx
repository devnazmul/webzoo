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
    <div className="w-80 flex flex-col bg-black/30 backdrop-blur-xl border-l border-ghost-border shrink-0 animate-in slide-in-from-right duration-300">
      <div className="h-12 border-b border-ghost-border flex items-center px-6 justify-between bg-black/20">
        <span className="font-industrial font-bold text-[12px] uppercase tracking-[2px] text-spectral-white">Telemetry Details</span>
        <Button variant="ghost" size="icon-sm" onClick={onClose} className="text-spectral-white/50 hover:text-white">
          <X size={18} />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-8">
          {/* Channel Name */}
          <div className="space-y-1">
             <div className="flex items-center gap-2">
              <Hash size={16} className="text-spectral-white/50" />
              <span className="font-industrial font-bold text-lg text-spectral-white uppercase tracking-wider">{activeTopic.name}</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: UserPlus, label: "ADD" },
              { icon: Search, label: "FIND" },
              { icon: Phone, label: "LINK" },
              { icon: MoreHorizontal, label: "DATA" },
            ].map((action) => (
              <button key={action.label} className="flex flex-col items-center gap-2 group">
                <div className="w-10 h-10 rounded-full bg-spectral-white/5 border border-ghost-border flex items-center justify-center text-spectral-white/70 group-hover:bg-spectral-white/20 group-hover:text-white transition-all">
                  <action.icon size={16} />
                </div>
                <span className="text-[9px] font-bold tracking-widest text-spectral-white/40 group-hover:text-spectral-white/70">{action.label}</span>
              </button>
            ))}
          </div>

          <div className="h-px bg-ghost-border" />

          {/* About Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between text-spectral-white cursor-pointer group">
              <span className="font-industrial font-bold text-[11px] uppercase tracking-[1.5px]">Mission Objective</span>
              <ChevronDown size={14} className="text-spectral-white/30 group-hover:text-white" />
            </div>
            <div className="space-y-5">
              <div>
                <p className="text-[9px] font-bold text-spectral-white/30 uppercase tracking-[2px] mb-2">Subject</p>
                <p className="text-[13px] text-spectral-white/70 leading-relaxed font-medium">
                  Primary coordination for project Essence.
                </p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-spectral-white/30 uppercase tracking-[2px] mb-2">Protocol</p>
                <p className="text-[13px] text-spectral-white/70 leading-relaxed font-medium">
                  Strict adherence to industrial standards and cinematic excellence is mandatory for all transmissions.
                </p>
              </div>
            </div>
          </div>

          <div className="h-px bg-ghost-border" />

          {/* Members Section Placeholder */}
          <div className="space-y-4">
            <div className="flex items-center justify-between text-spectral-white cursor-pointer group">
              <div className="flex items-center gap-3">
                <span className="font-industrial font-bold text-[11px] uppercase tracking-[1.5px]">Active Personnel</span>
                <span className="text-spectral-white/30 text-[11px] font-bold border border-ghost-border px-2 rounded-full">{onlineCount}</span>
              </div>
              <ChevronDown size={14} className="text-spectral-white/30 group-hover:text-white" />
            </div>
          </div>

          <div className="h-px bg-ghost-border" />

          {/* Pinned Messages Placeholder */}
          <div className="space-y-4">
            <div className="flex items-center justify-between text-spectral-white cursor-pointer group">
              <span className="font-industrial font-bold text-[11px] uppercase tracking-[1.5px]">Archived Data</span>
              <ChevronDown size={14} className="text-spectral-white/30 group-hover:text-white" />
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>

  );
}
