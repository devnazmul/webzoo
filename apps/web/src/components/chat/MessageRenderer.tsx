import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Props {
  content: string;
}

function highlightMentions(text: string): React.ReactNode[] {
  // Split on @mention and #topic patterns
  const parts = text.split(/(@[a-zA-Z0-9 ]+|#[a-zA-Z0-9-_]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      return (
        <span
          key={i}
          className="inline-flex items-center px-1 py-0.5 rounded text-xs font-semibold"
          style={{
            background: 'hsl(222, 47%, 22%)',
            color: 'hsl(213, 80%, 75%)',
          }}
        >
          {part}
        </span>
      );
    }
    if (part.startsWith('#')) {
      return (
        <span
          key={i}
          className="inline-flex items-center px-1 py-0.5 rounded text-xs font-semibold"
          style={{
            background: 'hsl(142, 30%, 15%)',
            color: 'hsl(142, 60%, 65%)',
          }}
        >
          {part}
        </span>
      );
    }
    return part;
  });
}

export default function MessageRenderer({ content }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ node, className, children, ...props }: any) {
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
              className="bg-[hsl(222,47%,15%)] text-[hsl(213,31%,85%)] rounded px-1 py-0.5 font-mono text-[13px]"
              {...props}
            >
              {children}
            </code>
          );
        },
        p({ children }) {
          // Process children to highlight mentions inside paragraphs
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
          return (
            <strong className="font-semibold text-foreground">
              {children}
            </strong>
          );
        },
        em({ children }) {
          return <em className="italic">{children}</em>;
        },
        del({ children }) {
          return <del className="line-through opacity-70">{children}</del>;
        },
        ul({ children }) {
          return (
            <ul className="list-disc pl-4 my-1 space-y-0.5 text-sm">
              {children}
            </ul>
          );
        },
        ol({ children }) {
          return (
            <ol className="list-decimal pl-4 my-1 space-y-0.5 text-sm">
              {children}
            </ol>
          );
        },
        li({ children }) {
          return (
            <li className="text-foreground/90 leading-relaxed">
              {children}
            </li>
          );
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
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              {children}
            </a>
          );
        },
        h1({ children }) {
          return (
            <h1 className="text-lg font-bold text-foreground mt-2 mb-1">
              {children}
            </h1>
          );
        },
        h2({ children }) {
          return (
            <h2 className="text-base font-semibold text-foreground mt-2 mb-1">
              {children}
            </h2>
          );
        },
        h3({ children }) {
          return (
            <h3 className="text-sm font-semibold text-foreground mt-1 mb-0.5">
              {children}
            </h3>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
