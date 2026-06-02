import { Search, HelpCircle, Bell, Clock, LogOut, Menu } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface TopBarProps {
  onToggleSidebar: () => void;
}

export default function TopBar({ onToggleSidebar }: TopBarProps) {
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
    <div className="h-14 bg-secondary text-foreground flex items-center px-4 md:px-6 gap-3 shrink-0 relative border-b border-border z-20">
      {/* Mobile Hamburger menu */}
      <button 
        type="button" 
        onClick={onToggleSidebar}
        className="md:hidden p-1.5 hover:bg-muted border border-border rounded-full text-foreground/80 active:scale-95 transition-all flex-shrink-0"
      >
        <Menu size={18} />
      </button>

      <div className="font-sans font-semibold text-sm md:text-base tracking-normal text-foreground flex-shrink-0 flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 bg-whatsapp-teal rounded-full animate-pulse" />
        WebZoo <span className="hidden sm:inline text-xs text-muted-foreground font-normal ml-1">Workspace</span>
      </div>
      
      {/* Search area container - absolutely centered */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-4">
        <div className="hidden sm:flex items-center gap-1 max-w-[420px] w-full pointer-events-auto">
          <div className="relative flex-1 group">
            <Search
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              placeholder="Search or start new chat..."
              className="h-9 bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground focus:border-whatsapp-teal focus:ring-1 focus:ring-whatsapp-teal ring-0 outline-none w-full pl-10 pr-10 rounded-full transition-all tracking-normal"
            />
          </div>
        </div>
      </div>

      {/* Right side tools */}
      <div className="flex items-center gap-3 ml-auto z-10">
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full"
        >
          <Bell size={16} />
        </Button>
        <div className="flex items-center gap-2 pl-1">
          <Avatar className="h-8 w-8 rounded-full border border-border">
            <AvatarFallback className="text-[10px] bg-whatsapp-teal/20 text-whatsapp-teal font-semibold rounded-full uppercase">
              {user ? getInitials(user.name) : "?"}
            </AvatarFallback>
          </Avatar>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all rounded-full"
            title="LOGOUT"
          >
            <LogOut size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
