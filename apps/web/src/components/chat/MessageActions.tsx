import { useState, useRef, useEffect } from 'react';
import { Smile, Reply, CheckSquare, MoreHorizontal, Trash2 } from 'lucide-react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { Message } from '@webzoo/shared';
import { cn } from '@/lib/utils';

interface Props {
  message: Message;
  isOwn: boolean;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onCreateTask: () => void;
  onDeleteForMe: () => void;
  onDeleteForEveryone: () => void;
}

export default function MessageActions({
  message,
  isOwn,
  onReact,
  onReply,
  onCreateTask,
  onDeleteForMe,
  onDeleteForEveryone,
}: Props) {
  const [showEmoji, setShowEmoji] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  function handleEmojiClick(data: EmojiClickData) {
    onReact(data.emoji);
    setShowEmoji(false);
  }

  return (
    <div className="flex items-center gap-0.5 bg-background border border-border rounded-lg shadow-sm px-1 py-0.5">
      {/* Emoji */}
      <div ref={emojiRef} className="relative">
        <button
          type="button"
          onClick={() => { setShowEmoji((v) => !v); setShowMenu(false); }}
          title="Add reaction"
          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <Smile size={15} />
        </button>
        {showEmoji && (
          <>
            {/* Mobile background blur backdrop */}
            <div 
              className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[9998] md:hidden"
              onClick={() => setShowEmoji(false)}
            />
            <div 
              className="fixed bottom-0 left-0 right-0 md:absolute md:bottom-auto md:right-0 md:top-8 z-[9999] flex justify-center md:block p-3 md:p-0 bg-popover md:bg-transparent rounded-t-2xl md:rounded-none border-t md:border-none border-border shadow-[0_-8px_30px_rgb(0,0,0,0.12)] md:shadow-none animate-in slide-in-from-bottom duration-200"
            >
              <div className="w-full max-w-[320px] md:max-w-none">
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  theme={Theme.AUTO}
                  width="100%"
                  height={320}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Reply */}
      <button
        type="button"
        onClick={onReply}
        title="Reply"
        className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <Reply size={15} />
      </button>

      {/* Create task */}
      <button
        type="button"
        onClick={onCreateTask}
        title="Create task"
        className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <CheckSquare size={15} />
      </button>

      {/* More menu */}
      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => { setShowMenu((v) => !v); setShowEmoji(false); }}
          title="More"
          className={cn(
            'p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors',
            showMenu && 'bg-accent text-foreground'
          )}
        >
          <MoreHorizontal size={15} />
        </button>
        {showMenu && (
          <div className="absolute right-0 top-8 w-44 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden py-1">
            <button
              type="button"
              onClick={() => { onDeleteForMe(); setShowMenu(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-muted transition-colors"
            >
              <Trash2 size={13} className="text-muted-foreground" />
              Delete for me
            </button>
            {isOwn && (
              <button
                type="button"
                onClick={() => { onDeleteForEveryone(); setShowMenu(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-muted text-destructive transition-colors"
              >
                <Trash2 size={13} />
                Delete for everyone
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
