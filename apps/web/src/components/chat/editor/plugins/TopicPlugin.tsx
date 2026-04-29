import { useCallback, useEffect, useRef, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
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
import { $createMentionNode } from '../nodes/MentionNode';
import SuggestionDropdown, { SuggestionItem } from '../ui/SuggestionDropdown';
import { MentionSuggestion } from '../utils/schema';
import { Hash } from 'lucide-react';

interface Props {
  onSearch: (query: string) => Promise<MentionSuggestion[]>;
}

const TRIGGER_REGEX = /#([a-zA-Z0-9-_]*)$/;

export default function TopicPlugin({ onSearch }: Props) {
  const [editor] = useLexicalComposerContext();
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = useCallback(() => {
    setIsOpen(false);
    setSuggestions([]);
    setSelectedIndex(0);
    setAnchorRect(null);
  }, []);

  const getAnchorRect = useCallback((): DOMRect | null => {
    const selection = window.getSelection();
    if (!selection || selection.count === 0) return null;
    return selection.getRangeAt(0).getBoundingClientRect();
  }, []);

  useEffect(() => {
    return editor.registerNodeTransform(TextNode, (node) => {
      const text = node.getTextContent();
      const match = TRIGGER_REGEX.exec(text);
      if (match) {
        const q = match[1];
        setIsOpen(true);
        setSelectedIndex(0);
        const rect = getAnchorRect();
        if (rect) setAnchorRect(rect);

        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(async () => {
          const results = await onSearch(q);
          setSuggestions(
            results.map((r) => ({
              id: r.id,
              label: r.label,
              sublabel: 'Topic',
              icon: <Hash size={14} />,
              type: 'topic',
            }))
          );
        }, 150);
      } else {
        if (isOpen) close();
      }
    });
  }, [editor, onSearch, isOpen, close, getAnchorRect]);

  const insertTopic = useCallback(
    (item: SuggestionItem) => {
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;
        const anchor = selection.anchor;
        const anchorNode = anchor.getNode();
        if (!$isTextNode(anchorNode)) return;
        const textContent = anchorNode.getTextContent();
        const match = TRIGGER_REGEX.exec(textContent);
        if (!match) return;
        const before = textContent.slice(0, match.index);
        anchorNode.setTextContent(before);
        const mentionNode = $createMentionNode('topic', item.id, item.label);
        anchorNode.insertAfter(mentionNode);
        const { $createTextNode } = require('lexical');
        const spaceNode = $createTextNode(' ');
        mentionNode.insertAfter(spaceNode);
        spaceNode.select();
      });
      close();
    },
    [editor, close]
  );

  useEffect(() => {
    if (!isOpen) return;

    const removeDown = editor.registerCommand(
      KEY_ARROW_DOWN_COMMAND,
      () => {
        setSelectedIndex((i) => (i + 1) % Math.max(suggestions.length, 1));
        return true;
      },
      COMMAND_PRIORITY_HIGH
    );
    const removeUp = editor.registerCommand(
      KEY_ARROW_UP_COMMAND,
      () => {
        setSelectedIndex((i) =>
          (i + suggestions.length - 1) % Math.max(suggestions.length, 1)
        );
        return true;
      },
      COMMAND_PRIORITY_HIGH
    );
    const removeEnter = editor.registerCommand(
      KEY_ENTER_COMMAND,
      () => {
        if (suggestions[selectedIndex]) {
          insertTopic(suggestions[selectedIndex]);
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_HIGH
    );
    const removeTab = editor.registerCommand(
      KEY_TAB_COMMAND,
      () => {
        if (suggestions[selectedIndex]) {
          insertTopic(suggestions[selectedIndex]);
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
  }, [isOpen, suggestions, selectedIndex, insertTopic, editor, close]);

  if (!isOpen || suggestions.length === 0) return null;

  return (
    <SuggestionDropdown
      items={suggestions}
      selectedIndex={selectedIndex}
      onSelect={insertTopic}
      onClose={close}
      anchorRect={anchorRect}
      header="Topics"
    />
  );
}
