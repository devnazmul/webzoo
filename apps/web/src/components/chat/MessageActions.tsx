import { useState } from 'react';
import { Smile, Reply, CheckSquare, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { Message } from '@webzoo/shared';

interface Props {
  message: Message;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onCreateTask: () => void;
}

export default function MessageActions({
  message,
  onReact,
  onReply,
  onCreateTask,
}: Props) {
  const [showEmoji, setShowEmoji] = useState(false);

  function handleEmojiClick(data: EmojiClickData) {
    onReact(data.emoji);
    setShowEmoji(false);
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-0.5 bg-background border border-border rounded-lg shadow-sm px-1 py-0.5">
        <button
          type="button"
          onClick={() => setShowEmoji((v) => !v)}
          title="Add reaction"
          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <Smile size={15} />
        </button>
        <button
          type="button"
          onClick={onReply}
          title="Reply"
          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <Reply size={15} />
        </button>
        <button
          type="button"
          onClick={onCreateTask}
          title="Create task"
          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <CheckSquare size={15} />
        </button>
        <button
          type="button"
          title="More actions"
          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <MoreHorizontal size={15} />
        </button>
      </div>

      {showEmoji && (
        <div className="fixed z-[9999]"
          style={{
            bottom: 'auto',
            right: 0,
          }}
        >
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme={Theme.AUTO}
            width={300}
            height={380}
          />
        </div>
      )}
    </div>
  );
}
