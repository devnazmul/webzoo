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
    <div className="w-[68px] flex flex-col items-center py-4 gap-4 shrink-0 bg-slack-top border-r border-white/5">
      {workspaces.map((ws) => (
        <div key={ws.id} className="relative group flex items-center">
          {activeWorkspace?.id === ws.id && (
            <div className="absolute left-[-14px] w-1.5 h-8 bg-white rounded-r-md" />
          )}
          <button
            onClick={() => setActiveWorkspace(ws)}
            className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center text-[13px] font-black transition-all group-hover:rounded-xl",
              activeWorkspace?.id === ws.id
                ? "bg-white text-slack-narrow shadow-lg scale-110"
                : "bg-white/10 text-sidebar-text/70 hover:bg-white/20",
            )}
            title={ws.name}
          >
            {getInitials(ws.name)}
          </button>
        </div>
      ))}

      <button
        onClick={onCreateWorkspace}
        className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 hover:rounded-xl transition-all flex items-center justify-center text-sidebar-text/50 hover:text-white"
        title="Add Workspace"
      >
        <Plus size={20} />
      </button>
    </div>
  );
}
