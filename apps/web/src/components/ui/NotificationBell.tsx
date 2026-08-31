import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { getSocket } from '@/lib/socket';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
  actorName?: string;
  workspaceId?: string;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadNotifications();

    // Request browser notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const socket = getSocket();
    socket.on('notification:new', (n: Notification) => {
      setNotifications((prev) => [n, ...prev].slice(0, 20));
      setUnreadCount((c) => c + 1);

      // Play beep sound
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); // 800Hz beep
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime); // Low volume
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.15); // 150ms beep
      } catch (e) {
        console.error('AudioContext error:', e);
      }

      // Show browser push notification if permitted
      if ('Notification' in window && Notification.permission === 'granted') {
        const pushNotif = new window.Notification('New WebZoo Notification', {
          body: n.message,
          icon: '/favicon.ico', // Assuming there's a favicon or you can provide a generic icon
        });
        
        // Focus the window when clicking the notification
        pushNotif.onclick = () => {
          window.focus();
          pushNotif.close();
        };
      }
    });

    return () => {
      socket.off('notification:new');
    };
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function loadNotifications() {
    try {
      const [notifRes, countRes] = await Promise.all([
        api.get('/notifications'),
        api.get('/notifications/unread-count'),
      ]);
      setNotifications(notifRes.data.data.notifications ?? []);
      setUnreadCount(countRes.data.data.count ?? 0);
    } catch {}
  }

  async function markAllRead() {
    try {
      await api.post('/notifications/mark-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  }

  async function deleteNotification(id: string) {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => {
        const removed = prev.find((n) => n.id === id);
        const next = prev.filter((n) => n.id !== id);
        if (removed && !removed.read) setUnreadCount((c) => Math.max(0, c - 1));
        return next;
      });
    } catch {}
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Notifications"
        className="relative h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center px-0.5">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-10 left-0 w-80 bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Bell size={28} className="mb-2 opacity-20" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    'flex items-start gap-3 px-4 py-3 border-b border-border/50 last:border-0 transition-colors',
                    !n.read ? 'bg-primary/5' : 'hover:bg-muted/50'
                  )}
                >
                  {!n.read && (
                    <span className="mt-1.5 flex-shrink-0 w-2 h-2 rounded-full bg-primary" />
                  )}
                  {n.read && <span className="mt-1.5 flex-shrink-0 w-2 h-2" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatTime(n.createdAt)}
                    </p>
                    {n.type === 'WORKSPACE_INVITE' && (
                      <div className="flex gap-2 mt-2">
                        <button
                          className="px-2 py-1 bg-whatsapp-teal text-white text-xs rounded shadow-sm hover:bg-whatsapp-teal/90"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              // Accept the invite using a direct API if possible, or workspace join
                              // Note: We need a backend route to accept by workspaceId for already-registered users
                              await api.post(`/workspaces/${n.workspaceId}/join`);
                              deleteNotification(n.id);
                              
                              // Reload to refresh workspaces in AppShell
                              window.location.reload();
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                        >
                          Accept
                        </button>
                        <button
                          className="px-2 py-1 bg-muted text-foreground text-xs rounded hover:bg-muted/80"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(n.id);
                          }}
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteNotification(n.id)}
                    className="flex-shrink-0 text-muted-foreground hover:text-foreground text-xs mt-0.5"
                    title="Dismiss"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
