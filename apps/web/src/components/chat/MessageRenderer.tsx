import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Props {
  content: string;
}

// ─── Lexical AST renderer ─────────────────────────────

interface LexicalTextNode {
  type: 'text';
  text: string;
  format?: number;
}

interface LexicalMentionNode {
  type: 'mention';
  mentionType: 'user' | 'topic';
  label: string;
  id: string;
}

interface LexicalEmojiNode {
  type: 'emoji';
  emoji: string;
}

interface LexicalLineBreakNode {
  type: 'linebreak';
}

type LexicalInlineNode =
  | LexicalTextNode
  | LexicalMentionNode
  | LexicalEmojiNode
  | LexicalLineBreakNode;

interface LexicalParagraphNode {
  type: 'paragraph';
  children: LexicalInlineNode[];
}

interface LexicalListItemNode {
  type: 'listitem';
  children: LexicalInlineNode[];
}

interface LexicalListNode {
  type: 'list';
  listType: 'bullet' | 'number';
  children: LexicalListItemNode[];
}

interface LexicalCodeNode {
  type: 'code';
  language: string;
  children: LexicalTextNode[];
}

interface LexicalQuoteNode {
  type: 'quote';
  children: LexicalInlineNode[];
}

interface LexicalFileNode {
  type: 'file';
  name: string;
  mimeType: string;
  size: number;
  previewUrl: string | null;
}

type LexicalBlockNode =
  | LexicalParagraphNode
  | LexicalListNode
  | LexicalCodeNode
  | LexicalQuoteNode
  | LexicalFileNode;

interface LexicalDocument {
  type: 'root';
  children: LexicalBlockNode[];
}

interface LexicalPayload {
  document: LexicalDocument;
  plainText: string;
  mentions: LexicalMentionNode[];
  files: LexicalFileNode[];
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderInlineNode(
  node: LexicalInlineNode,
  index: number
): React.ReactNode {
  switch (node.type) {
    case 'text': {
      let text: React.ReactNode = node.text;
      const fmt = node.format ?? 0;
      if (fmt & 1) text = <strong key={index}>{text}</strong>;
      if (fmt & 2) text = <em key={index}>{text}</em>;
      if (fmt & 4) text = <del key={index}>{text}</del>;
      if (fmt & 8)
        text = (
          <code
            key={index}
            className="bg-muted text-foreground rounded px-1 py-0.5 font-mono text-[13px]"
          >
            {text}
          </code>
        );
      return <span key={index}>{text}</span>;
    }
    case 'mention':
      return (
        <span
          key={index}
          className={
            node.mentionType === 'user' ? 'mention mention-user' : 'mention mention-topic'
          }
        >
          {node.mentionType === 'user' ? `@${node.label}` : `#${node.label}`}
        </span>
      );
    case 'emoji':
      return <span key={index}>{node.emoji}</span>;
    case 'linebreak':
      return <br key={index} />;
    default:
      return null;
  }
}

function renderBlock(block: LexicalBlockNode, index: number): React.ReactNode {
  switch (block.type) {
    case 'paragraph':
      return (
        <p
          key={index}
          className="mb-0 leading-relaxed text-sm text-foreground/90 flex flex-wrap items-center gap-x-0.5"
        >
          {block.children.map((child, i) => renderInlineNode(child, i))}
        </p>
      );
    case 'list':
      return block.listType === 'bullet' ? (
        <ul key={index} className="list-disc pl-4 my-1 space-y-0.5 text-sm">
          {block.children.map((item, i) => (
            <li key={i} className="text-foreground/90">
              {item.children.map((child, j) => renderInlineNode(child, j))}
            </li>
          ))}
        </ul>
      ) : (
        <ol key={index} className="list-decimal pl-4 my-1 space-y-0.5 text-sm">
          {block.children.map((item, i) => (
            <li key={i} className="text-foreground/90">
              {item.children.map((child, j) => renderInlineNode(child, j))}
            </li>
          ))}
        </ol>
      );
    case 'code':
      return (
        <SyntaxHighlighter
          key={index}
          style={oneDark}
          language={block.language || 'text'}
          PreTag="div"
          customStyle={{
            margin: '6px 0',
            borderRadius: '6px',
            fontSize: '13px',
            padding: '10px 14px',
          }}
        >
          {block.children.map((c) => c.text).join('')}
        </SyntaxHighlighter>
      );
    case 'quote':
      return (
        <blockquote
          key={index}
          className="border-l-2 border-muted-foreground pl-3 my-1 text-muted-foreground italic text-sm"
        >
          {block.children.map((child, i) => renderInlineNode(child, i))}
        </blockquote>
      );
    case 'file':
      return (
        <div
          key={index}
          className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2 my-1 max-w-xs"
        >
          {block.mimeType.startsWith('image/') && block.previewUrl ? (
            <img
              src={block.previewUrl}
              alt={block.name}
              className="w-10 h-10 rounded object-cover"
            />
          ) : (
            <div className="w-8 h-8 bg-background rounded flex items-center justify-center text-xs font-bold text-muted-foreground">
              {block.name.split('.').pop()?.toUpperCase() ?? 'FILE'}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-medium truncate">{block.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatBytes(block.size)}
            </p>
          </div>
        </div>
      );
    default:
      return null;
  }
}

function LexicalRenderer({ payload }: { payload: LexicalPayload }) {
  return (
    <div className="space-y-0.5">
      {payload.document.children.map((block, i) => renderBlock(block, i))}
    </div>
  );
}

function isLexicalPayload(content: string): boolean {
  try {
    const parsed = JSON.parse(content);
    return parsed?.document?.type === 'root';
  } catch {
    return false;
  }
}

function highlightMentions(text: string): React.ReactNode[] {
  const parts = text.split(/(@[a-zA-Z0-9 ]+|#[a-zA-Z0-9-_]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      return (
        <span key={i} className="mention mention-user">
          {part}
        </span>
      );
    }
    if (part.startsWith('#')) {
      return (
        <span key={i} className="mention mention-topic">
          {part}
        </span>
      );
    }
    return part;
  });
}

export default function MessageRenderer({ content }: Props) {
  // Try to parse as Lexical JSON first
  if (isLexicalPayload(content)) {
    try {
      const payload: LexicalPayload = JSON.parse(content);
      return <LexicalRenderer payload={payload} />;
    } catch {
      // Fall through to markdown
    }
  }

  // Fall back to Markdown for old messages
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || '');
          const isBlock = !!match;
          return isBlock ? (
            <SyntaxHighlighter
              style={oneDark}
              language={match[1]}
              PreTag="div"
              customStyle={{
                margin: '6px 0',
                borderRadius: '6px',
                fontSize: '13px',
                padding: '10px 14px',
              }}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code
              className="bg-muted text-foreground rounded px-1 py-0.5 font-mono text-[13px]"
              {...props}
            >
              {children}
            </code>
          );
        },
        p({ children }) {
          const processed = Array.isArray(children)
            ? children.flatMap((child) =>
                typeof child === 'string' ? highlightMentions(child) : [child]
              )
            : typeof children === 'string'
            ? highlightMentions(children)
            : children;
          return (
            <p className="mb-0 leading-relaxed text-sm text-foreground/90 flex flex-wrap items-center gap-x-0.5">
              {processed}
            </p>
          );
        },
        strong({ children }) {
          return <strong className="font-semibold text-foreground">{children}</strong>;
        },
        em({ children }) {
          return <em className="italic">{children}</em>;
        },
        ul({ children }) {
          return <ul className="list-disc pl-4 my-1 space-y-0.5 text-sm">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="list-decimal pl-4 my-1 space-y-0.5 text-sm">{children}</ol>;
        },
        li({ children }) {
          return <li className="text-foreground/90 leading-relaxed">{children}</li>;
        },
        blockquote({ children }) {
          return (
            <blockquote className="border-l-2 border-muted-foreground pl-3 my-1 text-muted-foreground italic text-sm">
              {children}
            </blockquote>
          );
        },
        a({ href, children }) {
          return (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
              {children}
            </a>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
