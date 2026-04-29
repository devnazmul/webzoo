// ─── Serialized AST Node Types ───────────────────────────────────────────────
// These are the JSON structures produced by the serializer
// and consumed by the deserializer. They match Lexical's
// internal node model but are framework-agnostic.

export type SerializedTextNode = {
  type: 'text';
  text: string;
  format: number; // bitmask: bold=1, italic=2, strikethrough=4, code=8, underline=16
  version: 1;
};

export type SerializedMentionNode = {
  type: 'mention';
  mentionType: 'user' | 'topic';
  id: string;
  label: string;
  version: 1;
};

export type SerializedEmojiNode = {
  type: 'emoji';
  emoji: string;
  shortcode: string;
  version: 1;
};

export type SerializedCommandNode = {
  type: 'command';
  command: string;
  label: string;
  version: 1;
};

export type SerializedLineBreakNode = {
  type: 'linebreak';
  version: 1;
};

export type SerializedParagraphNode = {
  type: 'paragraph';
  children: SerializedInlineNode[];
  version: 1;
};

export type SerializedListItemNode = {
  type: 'listitem';
  children: SerializedInlineNode[];
  value: number;
  checked?: boolean;
  version: 1;
};

export type SerializedListNode = {
  type: 'list';
  listType: 'bullet' | 'number';
  children: SerializedListItemNode[];
  version: 1;
};

export type SerializedCodeNode = {
  type: 'code';
  language: string;
  children: SerializedTextNode[];
  version: 1;
};

export type SerializedQuoteNode = {
  type: 'quote';
  children: SerializedInlineNode[];
  version: 1;
};

export type SerializedFileNode = {
  type: 'file';
  fileId: string;       // local UUID before upload
  name: string;
  mimeType: string;
  size: number;
  previewUrl: string | null; // base64 or object URL for images
  version: 1;
};

// Inline nodes are nodes that can appear inside block nodes
export type SerializedInlineNode =
  | SerializedTextNode
  | SerializedMentionNode
  | SerializedEmojiNode
  | SerializedCommandNode
  | SerializedLineBreakNode;

// Block nodes are top-level nodes
export type SerializedBlockNode =
  | SerializedParagraphNode
  | SerializedListNode
  | SerializedCodeNode
  | SerializedQuoteNode
  | SerializedFileNode;

// The full document AST
export type SerializedDocument = {
  type: 'root';
  children: SerializedBlockNode[];
  version: 1;
};

// ─── Suggestion Item Types ────────────────────────────────────────────────────

export type MentionSuggestion = {
  id: string;
  label: string;
  type: 'user' | 'topic';
  avatar?: string;
};

export type SlashCommand = {
  id: string;
  label: string;
  description: string;
  icon?: string;
};

// ─── Editor Output ────────────────────────────────────────────────────────────

export type EditorOutput = {
  document: SerializedDocument;
  plainText: string;   // for search indexing and notifications
  hasContent: boolean;
  files: SerializedFileNode[];
  mentions: SerializedMentionNode[];
};
