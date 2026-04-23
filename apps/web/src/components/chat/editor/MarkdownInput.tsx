import { useState, useRef, useEffect } from 'react';
import { getSocket } from '@/lib/socket';
import { Button } from '@/components/ui/button';
import {
  Bold, Italic, Strikethrough, Code,
  CodeSquare, List, ListOrdered, SendHorizonal,
  Smile, Eye, EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import MessageRenderer from '../MessageRenderer';

interface SuggestionItem {
  id: string;
  label: string;
}

interface SlashCommand {
  id: string;
  label: string;
  description: string;
  syntax: string;
}

const SLASH_COMMANDS: SlashCommand[] = [
  { id: 'bold', label: 'Bold', description: 'Bold text', syntax: '**text**' },
  { id: 'italic', label: 'Italic', description: 'Italic text', syntax: '_text_' },
  { id: 'strike', label: 'Strikethrough', description: 'Strike text', syntax: '~~text~~' },
  { id: 'code', label: 'Inline code', description: 'Inline code', syntax: '`code`' },
  { id: 'codeblock', label: 'Code block', description: 'Code block', syntax: '```\ncode\n```' },
  { id: 'bullet', label: 'Bullet list', description: 'Bullet list', syntax: '- item' },
  { id: 'numbered', label: 'Numbered list', description: 'Numbered list', syntax: '1. item' },
];

interface Props {
  topicId: string;
  topicName: string;
  users: SuggestionItem[];
  topics: SuggestionItem[];
  onSend: (content: string) => Promise<void>;
}

type SuggestionType = 'user' | 'topic' | 'slash' | null;

export default function MarkdownInput({
  topicId,
  topicName,
  users,
  topics,
  onSend,
}: Props) {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [suggestionType, setSuggestionType] = useState<SuggestionType>(null);
  const [suggestionQuery, setSuggestionQuery] = useState('');
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [triggerPos, setTriggerPos] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTyping = useRef(false);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const [emojiPos, setEmojiPos] = useState({ bottom: 0, left: 0 });

  // Auto resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  }, [content]);

  function getSuggestions(): SuggestionItem[] | SlashCommand[] {
    if (suggestionType === 'user') {
      return users
        .filter((u) =>
          u.label.toLowerCase().includes(suggestionQuery.toLowerCase())
        )
        .slice(0, 6);
    }
    if (suggestionType === 'topic') {
      return topics
        .filter((t) =>
          t.label.toLowerCase().includes(suggestionQuery.toLowerCase())
        )
        .slice(0, 6);
    }
    if (suggestionType === 'slash') {
      return SLASH_COMMANDS.filter((c) =>
        c.label.toLowerCase().includes(suggestionQuery.toLowerCase())
      ).slice(0, 7);
    }
    return [];
  }

  const suggestions = getSuggestions();

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    const cursor = e.target.selectionStart;
    setContent(val);
    handleTypingIndicator();

    const textBeforeCursor = val.slice(0, cursor);
    const atMatch = textBeforeCursor.match(/@([a-zA-Z0-9 ]*)$/);
    const hashMatch = textBeforeCursor.match(/#([a-zA-Z0-9-_]*)$/);
    const slashMatch = textBeforeCursor.match(/\/([a-zA-Z]*)$/);

    if (atMatch) {
      setSuggestionType('user');
      setSuggestionQuery(atMatch[1]);
      setTriggerPos(cursor - atMatch[0].length);
      setSuggestionIndex(0);
    } else if (hashMatch) {
      setSuggestionType('topic');
      setSuggestionQuery(hashMatch[1]);
      setTriggerPos(cursor - hashMatch[0].length);
      setSuggestionIndex(0);
    } else if (slashMatch) {
      setSuggestionType('slash');
      setSuggestionQuery(slashMatch[1]);
      setTriggerPos(cursor - slashMatch[0].length);
      setSuggestionIndex(0);
    } else {
      setSuggestionType(null);
    }
  }

  function applySuggestion(item: SuggestionItem | SlashCommand) {
    const ta = textareaRef.current;
    if (!ta) return;
    const cursor = ta.selectionStart;
    const before = content.slice(0, triggerPos);
    const after = content.slice(cursor);

    let insertion = '';
    if (suggestionType === 'user') {
      insertion = `@${(item as SuggestionItem).label} `;
    } else if (suggestionType === 'topic') {
      insertion = `#${(item as SuggestionItem).label} `;
    } else if (suggestionType === 'slash') {
      insertion = (item as SlashCommand).syntax + ' ';
    }

    const newContent = before + insertion + after;
    setContent(newContent);
    setSuggestionType(null);

    setTimeout(() => {
      const newCursor = before.length + insertion.length;
      ta.focus();
      ta.setSelectionRange(newCursor, newCursor);
    }, 0);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Handle suggestion navigation
    if (suggestionType && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSuggestionIndex((i) => (i + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSuggestionIndex((i) =>
          (i + suggestions.length - 1) % suggestions.length
        );
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        applySuggestion(suggestions[suggestionIndex] as any);
        return;
      }
      if (e.key === 'Escape') {
        setSuggestionType(null);
        return;
      }
    }

    const ta = textareaRef.current;
    if (!ta) return;
    const cursor = ta.selectionStart;
    const textBeforeCursor = content.slice(0, cursor);
    const lines = textBeforeCursor.split('\n');
    const currentLine = lines[lines.length - 1];

    // Shift+Enter — continue list or insert newline
    if (e.key === 'Enter' && e.shiftKey) {
      // Match numbered list with content
      const numberedMatch = currentLine.match(/^(\d+)\.\s(.+)/);
      // Match bullet list with content
      const bulletMatch = currentLine.match(/^([-*])\s(.+)/);
      // Empty list item — exit list
      const emptyNumbered = currentLine.match(/^(\d+)\.\s*$/);
      const emptyBullet = currentLine.match(/^([-*])\s*$/);

      if (emptyNumbered || emptyBullet) {
        e.preventDefault();
        const newContent =
          content.slice(0, cursor - currentLine.length) +
          content.slice(cursor);
        setContent(newContent);
        setTimeout(() => {
          const newCursor = cursor - currentLine.length;
          ta.setSelectionRange(newCursor, newCursor);
        }, 0);
        return;
      }

      if (numberedMatch) {
        e.preventDefault();
        const nextNumber = parseInt(numberedMatch[1], 10) + 1;
        const continuation = `\n${nextNumber}. `;
        const newContent =
          content.slice(0, cursor) + continuation + content.slice(cursor);
        setContent(newContent);
        setTimeout(() => {
          const newCursor = cursor + continuation.length;
          ta.setSelectionRange(newCursor, newCursor);
        }, 0);
        return;
      }

      if (bulletMatch) {
        e.preventDefault();
        const continuation = `\n${bulletMatch[1]} `;
        const newContent =
          content.slice(0, cursor) + continuation + content.slice(cursor);
        setContent(newContent);
        setTimeout(() => {
          const newCursor = cursor + continuation.length;
          ta.setSelectionRange(newCursor, newCursor);
        }, 0);
        return;
      }

      // Default Shift+Enter — insert plain newline
      e.preventDefault();
      const newContent =
        content.slice(0, cursor) + '\n' + content.slice(cursor);
      setContent(newContent);
      setTimeout(() => {
        ta.setSelectionRange(cursor + 1, cursor + 1);
      }, 0);
      return;
    }

    // Enter alone — send message
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleTypingIndicator() {
    const socket = getSocket();
    if (!isTyping.current) {
      isTyping.current = true;
      socket.emit('typing:start', topicId);
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      isTyping.current = false;
      socket.emit('typing:stop', topicId);
    }, 1500);
  }

  async function handleSend() {
    const trimmed = content.trim();
    if (!trimmed || sending) return;
    setSending(true);
    const socket = getSocket();
    if (typingTimer.current) clearTimeout(typingTimer.current);
    isTyping.current = false;
    socket.emit('typing:stop', topicId);
    try {
      await onSend(trimmed);
      setContent('');
      setSuggestionType(null);
      setPreviewMode(false);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  function insertSyntax(syntax: string, wrap?: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = content.slice(start, end);
    let newContent: string;
    let newCursor: number;

    if (wrap) {
      const wrapped = `${wrap}${selected || 'text'}${wrap}`;
      newContent = content.slice(0, start) + wrapped + content.slice(end);
      newCursor =
        start + wrap.length + (selected || 'text').length + wrap.length;
    } else {
      newContent = content.slice(0, start) + syntax + content.slice(end);
      newCursor = start + syntax.length;
    }

    setContent(newContent);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(newCursor, newCursor);
    }, 0);
  }

  function onEmojiClick(emojiData: EmojiClickData) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const newContent =
      content.slice(0, start) + emojiData.emoji + content.slice(start);
    setContent(newContent);
    setShowEmoji(false);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(
        start + emojiData.emoji.length,
        start + emojiData.emoji.length
      );
    }, 0);
  }

  function handleEmojiButtonClick() {
    if (emojiButtonRef.current) {
      const rect = emojiButtonRef.current.getBoundingClientRect();
      setEmojiPos({
        bottom: window.innerHeight - rect.top + 8,
        left: rect.left,
      });
    }
    setShowEmoji((v) => !v);
  }

  // Render input content with inline mention highlights
  // Used in preview mode
  function renderInputPreview() {
    if (!content) {
      return (
        <p className="text-muted-foreground text-sm">
          Message #{topicName}... (Markdown supported)
        </p>
      );
    }
    return <MessageRenderer content={content} />;
  }

  const toolbarBtn = (
    onClick: () => void,
    icon: React.ReactNode,
    title: string,
    active?: boolean
  ) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'p-1.5 rounded transition-colors',
        active
          ? 'bg-accent text-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
      )}
    >
      {icon}
    </button>
  );

  return (
    <div className="px-4 py-3 border-t border-border">
      {/* Suggestion dropdown — rendered above the input */}
      {suggestionType && suggestions.length > 0 && (
        <div className="mb-2 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          {suggestionType === 'slash' && (
            <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground border-b border-border">
              Commands
            </div>
          )}
          {(suggestions as any[]).map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => applySuggestion(item)}
              className={cn(
                'flex items-center gap-3 w-full px-3 py-2 text-sm text-left transition-colors',
                index === suggestionIndex
                  ? 'bg-accent text-accent-foreground'
                  : 'text-popover-foreground hover:bg-accent/50'
              )}
            >
              {suggestionType === 'slash' ? (
                <>
                  <code className="text-xs bg-secondary px-1.5 py-0.5 rounded font-mono">
                    {(item as SlashCommand).syntax.split('\n')[0]}
                  </code>
                  <div>
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {(item as SlashCommand).description}
                    </div>
                  </div>
                </>
              ) : (
                <span>
                  {suggestionType === 'user' ? '@' : '#'}
                  {item.label}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Editor box */}
      <div className="border border-border rounded-lg bg-secondary">
        {/* Toolbar */}
        <div className="flex items-center gap-0.5 px-2 pt-2 pb-1 border-b border-border/50 flex-wrap">
          {toolbarBtn(
            () => insertSyntax('', '**'),
            <Bold size={14} />, 'Bold (**text**)'
          )}
          {toolbarBtn(
            () => insertSyntax('', '_'),
            <Italic size={14} />, 'Italic (_text_)'
          )}
          {toolbarBtn(
            () => insertSyntax('', '~~'),
            <Strikethrough size={14} />, 'Strikethrough'
          )}
          <div className="w-px h-4 bg-border mx-1" />
          {toolbarBtn(
            () => insertSyntax('', '`'),
            <Code size={14} />, 'Inline code'
          )}
          {toolbarBtn(
            () => insertSyntax('```\n\n```'),
            <CodeSquare size={14} />, 'Code block'
          )}
          <div className="w-px h-4 bg-border mx-1" />
          {toolbarBtn(
            () => insertSyntax('- '),
            <List size={14} />, 'Bullet list'
          )}
          {toolbarBtn(
            () => insertSyntax('1. '),
            <ListOrdered size={14} />, 'Numbered list'
          )}
          <div className="w-px h-4 bg-border mx-1" />
          <button
            ref={emojiButtonRef}
            type="button"
            onClick={handleEmojiButtonClick}
            title="Emoji"
            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          >
            <Smile size={14} />
          </button>
          <div className="w-px h-4 bg-border mx-1" />
          {/* Preview toggle */}
          {toolbarBtn(
            () => setPreviewMode((v) => !v),
            previewMode ? <EyeOff size={14} /> : <Eye size={14} />,
            previewMode ? 'Back to editing' : 'Preview',
            previewMode
          )}
          <span className="text-xs text-muted-foreground ml-1 hidden sm:block">
            @ mention · # topic · / commands
          </span>
        </div>

        {/* Write mode */}
        {!previewMode && (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={`Message #${topicName}... (Markdown supported)`}
            className="w-full bg-transparent text-sm resize-none outline-none text-foreground placeholder:text-muted-foreground px-3 py-2 min-h-[40px] max-h-40"
            rows={1}
          />
        )}

        {/* Preview mode */}
        {previewMode && (
          <div
            className="px-3 py-2 min-h-[40px] max-h-40 overflow-y-auto cursor-text"
            onClick={() => setPreviewMode(false)}
          >
            {renderInputPreview()}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-3 pb-2 pt-1">
          <p className="text-xs text-muted-foreground">
            Enter to send · Shift+Enter for new line / next list item
          </p>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={!content.trim() || sending}
            onClick={handleSend}
            className="h-7 w-7"
          >
            <SendHorizonal size={16} />
          </Button>
        </div>
      </div>

      {/* Emoji picker — fixed position */}
      {showEmoji && (
        <div
          className="fixed z-[999]"
          style={{ bottom: emojiPos.bottom, left: emojiPos.left }}
        >
          <EmojiPicker
            onEmojiClick={onEmojiClick}
            theme={Theme.DARK}
            width={300}
            height={380}
          />
        </div>
      )}
    </div>
  );
}
