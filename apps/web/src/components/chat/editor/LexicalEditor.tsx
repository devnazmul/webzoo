import { useCallback, useRef, useState } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { CodeNode, CodeHighlightNode } from "@lexical/code";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import {
  $getRoot,
  EditorState,
  $createParagraphNode,
  $createTextNode,
  $getSelection,
  $isRangeSelection,
} from "lexical";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import { Smile, SendHorizonal, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MentionNode } from "./nodes/MentionNode";
import { EmojiNode } from "./nodes/EmojiNode";
import { FileNode } from "./nodes/FileNode";
import MentionPlugin from "./plugins/MentionPlugin";
import TopicPlugin from "./plugins/TopicPlugin";
import SlashCommandPlugin from "./plugins/SlashCommandPlugin";
import EmojiPlugin from "./plugins/EmojiPlugin";
import ToolbarPlugin from "./plugins/ToolbarPlugin";
import SendPlugin from "./plugins/SendPlugin";
import FilePlugin from "./plugins/FilePlugin";
import FilePreview from "./ui/FilePreview";
import { serializeEditor } from "./utils/serializer";
import { SerializedFileNode, MentionSuggestion } from "./utils/schema";
import { getSocket } from "@/lib/socket";

// ─── Theme ────────────────────────────────────────────────────────────────────

const editorTheme = {
  paragraph: "lexical-paragraph",
  text: {
    bold: "lexical-bold",
    italic: "lexical-italic",
    strikethrough: "lexical-strikethrough",
    underline: "lexical-underline",
    code: "lexical-code-inline",
  },
  list: {
    ul: "lexical-ul",
    ol: "lexical-ol",
    listitem: "lexical-listitem",
  },
  code: "lexical-code-block",
  quote: "lexical-quote",
  heading: {
    h1: "lexical-h1",
    h2: "lexical-h2",
    h3: "lexical-h3",
  },
};

// ─── Initial config ───────────────────────────────────────────────────────────

const initialConfig = {
  namespace: "WebZooMessageEditor",
  theme: editorTheme,
  nodes: [
    HeadingNode,
    QuoteNode,
    ListNode,
    ListItemNode,
    CodeNode,
    CodeHighlightNode,
    AutoLinkNode,
    LinkNode,
    MentionNode,
    EmojiNode,
    FileNode,
  ],
  onError: (error: Error) => {
    console.error("[LexicalEditor]", error);
  },
};

// ─── Inner editor (has access to editor context) ──────────────────────────────

interface InnerProps {
  topicId: string;
  topicName: string;
  onSend: (content: string) => Promise<void>;
  onMentionSearch: (
    query: string,
    type: "user" | "topic",
  ) => Promise<MentionSuggestion[]>;
  onTopicSearch: (query: string) => Promise<MentionSuggestion[]>;
}

function InnerEditor({
  topicId,
  topicName,
  onSend,
  onMentionSearch,
  onTopicSearch,
}: InnerProps) {
  const [editor] = useLexicalComposerContext();
  const [hasContent, setHasContent] = useState(false);
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [files, setFiles] = useState<SerializedFileNode[]>([]);
  const [emojiPos, setEmojiPos] = useState({ bottom: 0, left: 0 });
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTyping = useRef(false);

  function handleTypingIndicator() {
    const socket = getSocket();
    if (!isTyping.current) {
      isTyping.current = true;
      socket.emit("typing:start", topicId);
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      isTyping.current = false;
      socket.emit("typing:stop", topicId);
    }, 1500);
  }

  function handleEditorChange(editorState: EditorState) {
    editorState.read(() => {
      const root = $getRoot();
      const text = root.getTextContent().trim();
      setHasContent(text.length > 0 || files.length > 0);
      if (text.length > 0) handleTypingIndicator();
    });
  }

  const handleSend = useCallback(async () => {
    if (sending) return;
    const output = serializeEditor(editor);
    if (!output.hasContent && files.length === 0) return;

    setSending(true);
    const socket = getSocket();
    if (typingTimer.current) clearTimeout(typingTimer.current);
    isTyping.current = false;
    socket.emit("typing:stop", topicId);

    try {
      // Serialize document to JSON string for storage
      const content = JSON.stringify({
        document: output.document,
        plainText: output.plainText,
        mentions: output.mentions,
        files,
      });
      await onSend(content);

      // Clear editor
      editor.update(() => {
        const root = $getRoot();
        root.clear();

        root.append($createParagraphNode());
      });
      setFiles([]);
      setHasContent(false);
    } finally {
      setSending(false);
      editor.focus();
    }
  }, [editor, sending, files, topicId, onSend]);

  function handleFilesAdded(newFiles: SerializedFileNode[]) {
    setFiles((prev) => [...prev, ...newFiles]);
    setHasContent(true);
  }

  function handleFileRemove(fileId: string) {
    setFiles((prev) => prev.filter((f) => f.fileId !== fileId));
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;
    // Process through FilePlugin logic inline
    const fileArray = Array.from(selectedFiles);
    Promise.all(
      fileArray.map(async (file) => {
        const { v4: uuidv4 } = await import("uuid");
        let previewUrl: string | null = null;
        if (file.type.startsWith("image/")) {
          previewUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (ev) =>
              resolve((ev.target?.result as string) ?? null);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
          });
        }
        return {
          type: "file" as const,
          fileId: uuidv4(),
          name: file.name,
          mimeType: file.type,
          size: file.size,
          previewUrl,
          version: 1 as const,
        };
      }),
    ).then(handleFilesAdded);
    e.target.value = "";
  }

  function handleEmojiClick(data: EmojiClickData) {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        selection.insertText(data.emoji);
      }
    });
    setShowEmoji(false);
    editor.focus();
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

  return (
    <div className="relative">
      {/* File previews */}
      <FilePreview files={files} onRemove={handleFileRemove} />

      {/* Editor container */}
      <div
        data-lexical-editor-wrapper
        className={cn(
          "border border-border rounded-xl bg-background transition-all",
          "focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/20",
        )}
      >
        {/* Toolbar */}
        <ToolbarPlugin
          onEmojiPickerToggle={handleEmojiButtonClick}
          onFileSelect={() => fileInputRef.current?.click()}
          showEmojiPicker={showEmoji}
        />

        {/* Editable area */}
        <div className="relative px-3 py-2 min-h-[44px] max-h-48 overflow-y-auto">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="outline-none text-sm text-foreground leading-relaxed"
                aria-label={`Message #${topicName}`}
              />
            }
            placeholder={
              <div className="absolute top-2 left-3 text-sm text-muted-foreground pointer-events-none select-none">
                Message #{topicName}... (type / for commands, @ to mention)
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-3 pb-2 pt-1 border-t border-border/50">
          <div className="flex items-center gap-1">
            {/* Emoji button */}
            <button
              ref={emojiButtonRef}
              type="button"
              onClick={handleEmojiButtonClick}
              title="Emoji"
              className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
            >
              <Smile size={15} />
            </button>

            {/* File attach button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach file"
              className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
            >
              <Paperclip size={15} />
            </button>

            <span className="text-xs text-muted-foreground ml-2 hidden sm:block opacity-60">
              @ mention · # topic · / commands
            </span>
          </div>

          <Button
            type="button"
            size="icon"
            disabled={(!hasContent && files.length === 0) || sending}
            onClick={handleSend}
            className={cn(
              "h-7 w-7 rounded-lg border transition-all active:scale-95",
              hasContent || files.length > 0
                ? "bg-primary text-primary-foreground border-transparent hover:bg-primary/90"
                : "bg-transparent text-muted-foreground border-border hover:bg-muted",
            )}
          >
            <SendHorizonal
              size={14}
              className={sending ? "animate-pulse" : ""}
            />
          </Button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Emoji picker */}
      {showEmoji && (
        <div
          className="fixed z-[9999]"
          style={{ bottom: emojiPos.bottom, left: emojiPos.left }}
        >
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme={Theme.AUTO}
            width={300}
            height={380}
          />
        </div>
      )}

      {/* Plugins */}
      <HistoryPlugin />
      <ListPlugin />

      <EmojiPlugin />
      <SlashCommandPlugin />
      <MentionPlugin onSearch={onMentionSearch} />
      <TopicPlugin onSearch={onTopicSearch} />
      <FilePlugin onFilesAdded={handleFilesAdded} />
      <SendPlugin onSend={handleSend} />
      <OnChangePlugin onChange={handleEditorChange} />
    </div>
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

interface Props {
  topicId: string;
  topicName: string;
  users: { id: string; label: string }[];
  topics: { id: string; label: string }[];
  onSend: (content: string) => Promise<void>;
}

export default function LexicalEditor({
  topicId,
  topicName,
  users,
  topics,
  onSend,
}: Props) {
  const handleMentionSearch = useCallback(
    async (query: string): Promise<MentionSuggestion[]> => {
      return users
        .filter((u) => u.label.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 6)
        .map((u) => ({ id: u.id, label: u.label, type: "user" as const }));
    },
    [users],
  );

  const handleTopicSearch = useCallback(
    async (query: string): Promise<MentionSuggestion[]> => {
      return topics
        .filter((t) => t.label.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 6)
        .map((t) => ({ id: t.id, label: t.label, type: "topic" as const }));
    },
    [topics],
  );

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <InnerEditor
        topicId={topicId}
        topicName={topicName}
        onSend={onSend}
        onMentionSearch={handleMentionSearch}
        onTopicSearch={handleTopicSearch}
      />
    </LexicalComposer>
  );
}
