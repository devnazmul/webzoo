import { Search, HelpCircle, Bell, Clock, LogOut } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function TopBar() {
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const navigate = useNavigate();

  function handleLogout() {
    clearAuth();
    navigate("/login");
  }

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <div className="h-12 bg-black/40 backdrop-blur-md text-spectral-white flex items-center px-6 gap-4 shrink-0 relative border-b border-ghost-border">
      <div className="font-industrial font-bold text-base uppercase tracking-[1.17px] text-spectral-white">
        WebZoo <span className="text-[10px] opacity-50 tracking-[2px] ml-1">Mission Control</span>
      </div>
      
      {/* Search area container - absolutely centered */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-4">
        <div className="flex items-center gap-1 max-w-[500px] w-full pointer-events-auto">
          <div className="relative flex-1 group">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-spectral-white/50"
            />
            <input
              placeholder="COMMAND SEARCH"
              className="h-8 bg-ghost-surface border border-ghost-border text-[11px] text-spectral-white placeholder:text-spectral-white/30 focus:border-spectral-white focus:bg-ghost-surface/20 ring-0 outline-none w-full pl-10 pr-10 rounded-full transition-all font-bold uppercase tracking-wider"
            />
          </div>
        </div>
      </div>

      {/* Right side tools */}
      <div className="flex items-center gap-3 ml-auto z-10">
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-spectral-white/80 hover:text-white"
        >
          <Bell size={16} />
        </Button>
        <div className="flex items-center gap-2 pl-1">
          <Avatar className="h-8 w-8 rounded-full border border-ghost-border">
            <AvatarFallback className="text-[10px] bg-spectral-white/10 text-spectral-white font-bold rounded-full font-industrial uppercase">
              {user ? getInitials(user.name) : "?"}
            </AvatarFallback>
          </Avatar>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleLogout}
            className="text-spectral-white/40 hover:text-destructive hover:bg-destructive/10 transition-all rounded-full"
            title="INITIATE LOGOUT"
          >
            <LogOut size={16} />
          </Button>
        </div>
      </div>
    </div>


  );
}
