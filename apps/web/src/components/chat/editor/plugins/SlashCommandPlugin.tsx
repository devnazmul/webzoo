import { useCallback, useEffect, useRef, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $createParagraphNode,
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_HIGH,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
  TextNode,
} from 'lexical';
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from '@lexical/list';
import { $createCodeNode } from '@lexical/code';
import { $createQuoteNode } from '@lexical/rich-text';
import SuggestionDropdown, { SuggestionItem } from '../ui/SuggestionDropdown';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  CodeSquare,
  List,
  ListOrdered,
  Quote,
} from 'lucide-react';

const SLASH_COMMANDS: SuggestionItem[] = [
  {
    id: 'bold',
    label: 'Bold',
    sublabel: 'Make text bold',
    icon: <Bold size={14} />,
  },
  {
    id: 'italic',
    label: 'Italic',
    sublabel: 'Make text italic',
    icon: <Italic size={14} />,
  },
  {
    id: 'strike',
    label: 'Strikethrough',
    sublabel: 'Strike through text',
    icon: <Strikethrough size={14} />,
  },
  {
    id: 'code',
    label: 'Inline Code',
    sublabel: 'Insert inline code',
    icon: <Code size={14} />,
  },
  {
    id: 'codeblock',
    label: 'Code Block',
    sublabel: 'Insert a code block',
    icon: <CodeSquare size={14} />,
  },
  {
    id: 'bullet',
    label: 'Bullet List',
    sublabel: 'Create a bulleted list',
    icon: <List size={14} />,
  },
  {
    id: 'numbered',
    label: 'Numbered List',
    sublabel: 'Create a numbered list',
    icon: <ListOrdered size={14} />,
  },
  {
    id: 'quote',
    label: 'Quote',
    sublabel: 'Insert a block quote',
    icon: <Quote size={14} />,
  },
];

const TRIGGER_REGEX = /\/([a-zA-Z]*)$/;

export default function SlashCommandPlugin() {
  const [editor] = useLexicalComposerContext();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  const filteredCommands = SLASH_COMMANDS.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase())
  );

  const close = useCallback(() => {
    setIsOpen(false);
    setSelectedIndex(0);
    setAnchorRect(null);
    setQuery('');
  }, []);

  const getAnchorRect = useCallback((): DOMRect | null => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    return selection.getRangeAt(0).getBoundingClientRect();
  }, []);

  useEffect(() => {
    return editor.registerNodeTransform(TextNode, (node) => {
      const text = node.getTextContent();
      const match = TRIGGER_REGEX.exec(text);
      if (match) {
        setQuery(match[1]);
        setIsOpen(true);
        setSelectedIndex(0);
        const rect = getAnchorRect();
        if (rect) setAnchorRect(rect);
      } else {
        if (isOpen) close();
      }
    });
  }, [editor, isOpen, close, getAnchorRect]);

  const executeCommand = useCallback(
    (item: SuggestionItem) => {
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;
        const anchor = selection.anchor;
        const anchorNode = anchor.getNode();
        if (!$isTextNode(anchorNode)) return;

        // Remove the slash trigger text
        const text = anchorNode.getTextContent();
        const match = TRIGGER_REGEX.exec(text);
        if (match) {
          const before = text.slice(0, match.index);
          anchorNode.setTextContent(before);
          anchorNode.select();
        }
      });

      // Apply the command
      switch (item.id) {
        case 'bold':
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              selection.formatText('bold');
            }
          });
          break;
        case 'italic':
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              selection.formatText('italic');
            }
          });
          break;
        case 'strike':
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              selection.formatText('strikethrough');
            }
          });
          break;
        case 'code':
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              selection.formatText('code');
            }
          });
          break;
        case 'codeblock':
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              const codeNode = $createCodeNode();
              selection.insertNodes([codeNode]);
            }
          });
          break;
        case 'bullet':
          editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
          break;
        case 'numbered':
          editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
          break;
        case 'quote':
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              const quoteNode = $createQuoteNode();
              const textNode = $createTextNode('');
              quoteNode.append(textNode);
              selection.insertNodes([quoteNode]);
              textNode.select();
            }
          });
          break;
      }

      close();
      editor.focus();
    },
    [editor, close]
  );

  useEffect(() => {
    if (!isOpen) return;

    const removeDown = editor.registerCommand(
      KEY_ARROW_DOWN_COMMAND,
      () => {
        setSelectedIndex((i) =>
          (i + 1) % Math.max(filteredCommands.length, 1)
        );
        return true;
      },
      COMMAND_PRIORITY_HIGH
    );
    const removeUp = editor.registerCommand(
      KEY_ARROW_UP_COMMAND,
      () => {
        setSelectedIndex((i) =>
          (i + filteredCommands.length - 1) %
          Math.max(filteredCommands.length, 1)
        );
        return true;
      },
      COMMAND_PRIORITY_HIGH
    );
    const removeEnter = editor.registerCommand(
      KEY_ENTER_COMMAND,
      () => {
        if (filteredCommands[selectedIndex]) {
          executeCommand(filteredCommands[selectedIndex]);
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_HIGH
    );
    const removeTab = editor.registerCommand(
      KEY_TAB_COMMAND,
      () => {
        if (filteredCommands[selectedIndex]) {
          executeCommand(filteredCommands[selectedIndex]);
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_HIGH
    );
    const removeEscape = editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      () => { close(); return true; },
      COMMAND_PRIORITY_HIGH
    );

    return () => {
      removeDown();
      removeUp();
      removeEnter();
      removeTab();
      removeEscape();
    };
  }, [
    isOpen,
    filteredCommands,
    selectedIndex,
    executeCommand,
    editor,
    close,
  ]);

  if (!isOpen) return null;

  return (
    <SuggestionDropdown
      items={filteredCommands}
      selectedIndex={selectedIndex}
      onSelect={executeCommand}
      onClose={close}
      anchorRect={anchorRect}
      header="Commands"
      emptyMessage="No matching commands"
    />
  );
}
