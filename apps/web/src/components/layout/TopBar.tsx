import { Search, HelpCircle, Bell, Clock } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export default function TopBar() {
  const user = useAuthStore((s) => s.user);

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <div className="h-10 bg-slack-top text-sidebar-text flex items-center px-4 gap-2 shrink-0 relative overflow-hidden">
      <div className="font-bold text-lg">WebZoo</div>
      {/* Search area container - absolutely centered */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-4">
        <div className="flex items-center gap-1 max-w-[700px] w-full pointer-events-auto">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-sidebar-text/80 hover:text-sidebar-text hover:bg-white/10 hidden md:flex flex-shrink-0"
          >
            <Clock size={14} />
          </Button>

          <div className="relative flex-1 group">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sidebar-text/70"
            />
            <input
              placeholder="Search Webzoo"
              className="h-6 bg-white/20 border-none text-[13px] text-white placeholder:text-white/60 focus:ring-1 focus:ring-white/40 ring-0 outline-none w-full pl-8 pr-10 rounded-md transition-all font-light"
            />
            <HelpCircle
              size={14}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sidebar-text/70 cursor-pointer hover:text-white"
            />
          </div>
        </div>
      </div>

      {/* Right side tools */}
      <div className="flex items-center gap-2 ml-auto z-10">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-sidebar-text/80 hover:text-sidebar-text hover:bg-white/10"
        >
          <Bell size={16} />
        </Button>
        <div className="flex items-center gap-2 pl-1">
          <Avatar className="h-7 w-7 rounded-md border border-white/20">
            <AvatarFallback className="text-[10px] bg-sky-600 text-white font-bold rounded-md">
              {user ? getInitials(user.name) : "?"}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </div>
  );
}
