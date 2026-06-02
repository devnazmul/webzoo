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
    <div className="w-[68px] relative shrink-0 bg-[#e3e6e9] dark:bg-[#182229] border-r border-border/80 flex flex-col justify-between h-full">
      <div
        className="overflow-y-auto overflow-x-hidden flex-1 flex flex-col items-center py-6 gap-5 max-h-[calc(100vh-80px)] scrollbar-none"
      >
        {workspaces.map((ws) => {
          const isActive = activeWorkspace?.id === ws.id;
          return (
            <div key={ws.id} className="relative group flex items-center justify-center w-full">
              {isActive && (
                <div className="absolute left-0 w-1.5 h-7 bg-whatsapp-teal rounded-r-full shadow-sm" />
              )}
              <button
                onClick={() => setActiveWorkspace(ws)}
                className={cn(
                  "w-11 h-11 rounded-full flex items-center justify-center text-xs font-bold font-sans tracking-wide transition-all duration-200 cursor-pointer shadow-xs border",
                  isActive
                    ? "bg-whatsapp-teal text-white border-whatsapp-teal scale-105"
                    : "bg-background dark:bg-[#111b21] text-foreground border-border hover:bg-accent/15 hover:border-whatsapp-teal/30",
                )}
                title={ws.name}
              >
                {getInitials(ws.name)}
              </button>
            </div>
          );
        })}
      </div>

      <div
        className="flex justify-center items-center py-4 bg-inherit border-t border-border/50 shrink-0"
      >
        <button
          onClick={onCreateWorkspace}
          className="w-11 h-11 rounded-full bg-background dark:bg-[#111b21] border border-dashed border-border hover:border-whatsapp-teal hover:text-whatsapp-teal transition-all flex items-center justify-center text-muted-foreground/80 cursor-pointer"
          title="Add Workspace"
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
}
