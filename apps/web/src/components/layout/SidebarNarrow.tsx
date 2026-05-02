import { useWorkspaceStore } from "@/store/workspace.store";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

interface SidebarNarrowProps {
  onCreateWorkspace: () => void;
}

export default function SidebarNarrow({
  onCreateWorkspace,
}: SidebarNarrowProps) {
  const { workspaces, activeWorkspace, setActiveWorkspace } =
    useWorkspaceStore();

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <div className="w-[68px] flex flex-col items-center py-6 gap-6 shrink-0 bg-black/40 backdrop-blur-md border-r border-ghost-border">
      {workspaces.map((ws) => (
        <div key={ws.id} className="relative group flex items-center">
          {activeWorkspace?.id === ws.id && (
            <div className="absolute left-[-2px] w-1 h-8 bg-spectral-white rounded-r-full shadow-[0_0_10px_rgba(240,240,250,0.5)]" />
          )}
          <button
            onClick={() => setActiveWorkspace(ws)}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-bold industrial uppercase tracking-tighter transition-all border border-ghost-border",
              activeWorkspace?.id === ws.id
                ? "bg-spectral-white text-space-black scale-110"
                : "bg-ghost-surface text-spectral-white/70 hover:bg-spectral-white/20 hover:text-white",
            )}
            title={ws.name}
          >
            {getInitials(ws.name)}
          </button>
        </div>
      ))}

      <button
        onClick={onCreateWorkspace}
        className="w-10 h-10 rounded-full bg-ghost-surface border border-dashed border-ghost-border hover:bg-spectral-white/10 transition-all flex items-center justify-center text-spectral-white/50 hover:text-white"
        title="Add Workspace"
      >
        <Plus size={18} />
      </button>
    </div>

  );
}
