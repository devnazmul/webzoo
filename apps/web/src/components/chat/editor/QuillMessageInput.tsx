import { useEffect, useRef, useState } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { getSocket } from '@/lib/socket';
import { Button } from '@/components/ui/button';
import { SendHorizonal } from 'lucide-react';

interface SuggestionItem {
  id: string;
  label: string;
}

interface Props {
  topicId: string;
  topicName: string;
  users: SuggestionItem[];
  topics: SuggestionItem[];
  onSend: (content: string) => Promise<void>;
}

export default function QuillMessageInput({
  topicId,
  topicName,
  users,
  topics,
  onSend,
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [sending, setSending] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTyping = useRef(false);

  // Suggestion state
  const [suggestionType, setSuggestionType] = useState<
    'user' | 'topic' | 'slash' | null
  >(null);
  const [suggestionQuery, setSuggestionQuery] = useState('');
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [suggestionPos, setSuggestionPos] = useState({ top: 0, left: 0 });
  const triggerIndex = useRef<number>(0);

  useEffect(() => {
    if (!editorRef.current || quillRef.current) return;

    const quill = new Quill(editorRef.current, {
      theme: 'snow',
      placeholder: `Message #${topicName}...`,
      modules: {
        toolbar: [
          ['bold', 'italic', 'underline', 'strike'],
          ['code', 'code-block'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['clean'],
        ],
        keyboard: {
          bindings: {
            enter: {
              key: 13,
              shiftKey: false,
              handler: () => {
                if (suggestionTypeRef.current && suggestionsRef.current.length > 0) {
                  applySuggestionRef.current?.(
                    suggestionsRef.current[suggestionIndexRef.current]
                  );
                  return false;
                }
                handleSendRef.current?.();
                return false;
              },
            },
            arrowDown: {
              key: 40,
              handler: () => {
                if (suggestionTypeRef.current) {
                  setSuggestionIndex((i) =>
                    (i + 1) % suggestionsRef.current.length
                  );
                  return false;
                }
                return true;
              },
            },
            arrowUp: {
              key: 38,
              handler: () => {
                if (suggestionTypeRef.current) {
                  setSuggestionIndex((i) =>
                    (i + suggestionsRef.current.length - 1) %
                    suggestionsRef.current.length
                  );
                  return false;
                }
                return true;
              },
            },
            escape: {
              key: 27,
              handler: () => {
                setSuggestionType(null);
                return true;
              },
            },
          },
        },
      },
    });

    quillRef.current = quill;

    quill.on('text-change', () => {
      const text = quill.getText();
      setIsEmpty(text.trim().length === 0);
      handleTypingIndicator();
      detectTrigger(quill);
    });

    return () => {
      quillRef.current = null;
    };
  }, []);

  // Refs to access latest state inside Quill callbacks
  const suggestionTypeRef = useRef(suggestionType);
  const suggestionsRef = useRef<SuggestionItem[]>([]);
  const suggestionIndexRef = useRef(suggestionIndex);
  const applySuggestionRef = useRef<((item: SuggestionItem) => void) | null>(null);
  const handleSendRef = useRef<(() => void) | null>(null);

  useEffect(() => { suggestionTypeRef.current = suggestionType; }, [suggestionType]);
  useEffect(() => { suggestionIndexRef.current = suggestionIndex; }, [suggestionIndex]);

  function getSuggestions(): SuggestionItem[] {
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
    return [];
  }

  const suggestions = getSuggestions();
  useEffect(() => { suggestionsRef.current = suggestions; }, [suggestions]);

  function detectTrigger(quill: Quill) {
    const selection = quill.getSelection();
    if (!selection) return;
    const cursor = selection.index;
    const text = quill.getText(0, cursor);

    const atMatch = text.match(/@([a-zA-Z0-9 ]*)$/);
    const hashMatch = text.match(/#([a-zA-Z0-9-_]*)$/);

    if (atMatch) {
      triggerIndex.current = cursor - atMatch[0].length;
      setSuggestionType('user');
      setSuggestionQuery(atMatch[1]);
      setSuggestionIndex(0);
      updateSuggestionPos(quill, triggerIndex.current);
    } else if (hashMatch) {
      triggerIndex.current = cursor - hashMatch[0].length;
      setSuggestionType('topic');
      setSuggestionQuery(hashMatch[1]);
      setSuggestionIndex(0);
      updateSuggestionPos(quill, triggerIndex.current);
    } else {
      setSuggestionType(null);
    }
  }

  function updateSuggestionPos(quill: Quill, index: number) {
    const bounds = quill.getBounds(index);
    if (!bounds || !editorRef.current) return;
    const editorRect = editorRef.current.getBoundingClientRect();
    setSuggestionPos({
      top: editorRect.top + bounds.top - 8,
      left: editorRect.left + bounds.left,
    });
  }

  function applySuggestion(item: SuggestionItem) {
    const quill = quillRef.current;
    if (!quill) return;
    const selection = quill.getSelection();
    if (!selection) return;
    const cursor = selection.index;
    const deleteLength = cursor - triggerIndex.current;
    const prefix = suggestionType === 'user' ? '@' : '#';
    const insertText = `${prefix}${item.label} `;
    quill.deleteText(triggerIndex.current, deleteLength);
    quill.insertText(triggerIndex.current, insertText, {
      bold: false,
      color:
        suggestionType === 'user'
          ? 'hsl(213, 70%, 45%)'
          : 'hsl(142, 50%, 35%)',
    });
    quill.formatText(
      triggerIndex.current,
      insertText.length,
      { color: false }
    );
    quill.setSelection(triggerIndex.current + insertText.length, 0);
    setSuggestionType(null);
  }

  applySuggestionRef.current = applySuggestion;

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
    const quill = quillRef.current;
    if (!quill || sending) return;
    const text = quill.getText().trim();
    if (!text) return;
    const html = quill.getSemanticHTML();
    setSending(true);
    const socket = getSocket();
    if (typingTimer.current) clearTimeout(typingTimer.current);
    isTyping.current = false;
    socket.emit('typing:stop', topicId);
    try {
      await onSend(html);
      quill.setContents([]);
      setIsEmpty(true);
      setSuggestionType(null);
    } finally {
      setSending(false);
      quill.focus();
    }
  }

  handleSendRef.current = handleSend;

  return (
    <div className="px-4 py-3 border-t border-border">
      {/* Suggestion dropdown */}
      {suggestionType && suggestions.length > 0 && (
        <div
          className="fixed z-[999] bg-popover border border-border rounded-lg shadow-lg overflow-hidden min-w-[200px]"
          style={{
            top: suggestionPos.top - suggestions.length * 36 - 16,
            left: suggestionPos.left,
          }}
        >
          <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground border-b border-border">
            {suggestionType === 'user' ? 'Members' : 'Topics'}
          </div>
          {suggestions.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                applySuggestion(item);
              }}
              className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition-colors ${
                index === suggestionIndex
                  ? 'bg-accent text-accent-foreground'
                  : 'text-popover-foreground hover:bg-accent/50'
              }`}
            >
              <span className="text-muted-foreground">
                {suggestionType === 'user' ? '@' : '#'}
              </span>
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Quill editor wrapper */}
      <div className="quill-wrapper border border-border rounded-lg overflow-hidden bg-background">
        <div ref={editorRef} />
        <div className="flex items-center justify-between px-3 py-2 border-t border-border/50 bg-muted/30">
          <p className="text-xs text-muted-foreground">
            Enter to send · Shift+Enter for new line · @ mention · # topic
          </p>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={isEmpty || sending}
            onMouseDown={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="h-7 w-7"
          >
            <SendHorizonal size={16} />
          </Button>
        </div>
      </div>

      {/* Quill style overrides */}
      <style>{`
        .quill-wrapper .ql-toolbar {
          border: none;
          border-bottom: 1px solid hsl(var(--border));
          padding: 6px 8px;
          background: hsl(var(--muted));
        }
        .quill-wrapper .ql-container {
          border: none;
          font-size: 14px;
          font-family: inherit;
        }
        .quill-wrapper .ql-editor {
          min-height: 40px;
          max-height: 160px;
          overflow-y: auto;
          padding: 8px 12px;
          color: hsl(var(--foreground));
        }
        .quill-wrapper .ql-editor.ql-blank::before {
          color: hsl(var(--muted-foreground));
          font-style: normal;
        }
        .quill-wrapper .ql-toolbar .ql-stroke {
          stroke: hsl(var(--muted-foreground));
        }
        .quill-wrapper .ql-toolbar .ql-fill {
          fill: hsl(var(--muted-foreground));
        }
        .quill-wrapper .ql-toolbar button:hover .ql-stroke,
        .quill-wrapper .ql-toolbar button.ql-active .ql-stroke {
          stroke: hsl(var(--foreground));
        }
        .quill-wrapper .ql-toolbar button:hover .ql-fill,
        .quill-wrapper .ql-toolbar button.ql-active .ql-fill {
          fill: hsl(var(--foreground));
        }
        .quill-wrapper .ql-toolbar button:hover,
        .quill-wrapper .ql-toolbar button.ql-active {
          background: hsl(var(--accent));
          border-radius: 4px;
        }
        .dark .quill-wrapper .ql-toolbar {
          background: hsl(222, 47%, 15%);
        }
        .dark .quill-wrapper .ql-editor {
          color: hsl(213, 31%, 91%);
        }
        .dark .quill-wrapper .ql-editor.ql-blank::before {
          color: hsl(215, 20%, 45%);
        }
        .quill-wrapper .ql-editor pre.ql-syntax {
          background: hsl(var(--secondary));
          color: hsl(var(--foreground));
          border-radius: 6px;
          font-family: monospace;
          font-size: 13px;
          padding: 8px 12px;
        }
        .quill-wrapper .ql-editor ul,
        .quill-wrapper .ql-editor ol {
          padding-left: 1.5rem;
        }
      `}</style>
    </div>
  );
}
