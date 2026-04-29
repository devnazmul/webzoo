import { useCallback, useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
} from 'lexical';
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
  $isListNode,
} from '@lexical/list';
import { $isCodeNode } from '@lexical/code';
import { $createCodeNode } from '@lexical/code';
import { $getNearestNodeOfType } from '@lexical/utils';
import { $isHeadingNode } from '@lexical/rich-text';
import { cn } from '@/lib/utils';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  CodeSquare,
  List,
  ListOrdered,
  Undo,
  Redo,
  Quote,
} from 'lucide-react';
import { $createQuoteNode } from '@lexical/rich-text';

interface ToolbarState {
  isBold: boolean;
  isItalic: boolean;
  isStrikethrough: boolean;
  isCode: boolean;
  isCodeBlock: boolean;
  isBulletList: boolean;
  isNumberedList: boolean;
  canUndo: boolean;
  canRedo: boolean;
}

const DEFAULT_STATE: ToolbarState = {
  isBold: false,
  isItalic: false,
  isStrikethrough: false,
  isCode: false,
  isCodeBlock: false,
  isBulletList: false,
  isNumberedList: false,
  canUndo: false,
  canRedo: false,
};

interface Props {
  onEmojiPickerToggle: () => void;
  onFileSelect: () => void;
  showEmojiPicker: boolean;
}

export default function ToolbarPlugin({
  onEmojiPickerToggle,
  onFileSelect,
  showEmojiPicker,
}: Props) {
  const [editor] = useLexicalComposerContext();
  const [state, setState] = useState<ToolbarState>(DEFAULT_STATE);

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;

    const anchorNode = selection.anchor.getNode();
    const element =
      anchorNode.getKey() === 'root'
        ? anchorNode
        : anchorNode.getTopLevelElementOrThrow();

    const elementKey = element.getKey();
    const elementDOM = editor.getElementByKey(elementKey);

    setState({
      isBold: selection.hasFormat('bold'),
      isItalic: selection.hasFormat('italic'),
      isStrikethrough: selection.hasFormat('strikethrough'),
      isCode: selection.hasFormat('code'),
      isCodeBlock: $isCodeNode(element),
      isBulletList:
        $isListNode(element) && element.getListType() === 'bullet',
      isNumberedList:
        $isListNode(element) && element.getListType() === 'number',
      canUndo: false,
      canRedo: false,
    });
  }, [editor]);

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        updateToolbar();
        return false;
      },
      COMMAND_PRIORITY_CRITICAL
    );
  }, [editor, updateToolbar]);

  useEffect(() => {
    return editor.registerCommand(
      CAN_UNDO_COMMAND,
      (canUndo) => {
        setState((s) => ({ ...s, canUndo }));
        return false;
      },
      COMMAND_PRIORITY_CRITICAL
    );
  }, [editor]);

  useEffect(() => {
    return editor.registerCommand(
      CAN_REDO_COMMAND,
      (canRedo) => {
        setState((s) => ({ ...s, canRedo }));
        return false;
      },
      COMMAND_PRIORITY_CRITICAL
    );
  }, [editor]);

  const btn = (
    active: boolean,
    onClick: () => void,
    icon: React.ReactNode,
    title: string,
    disabled = false
  ) => (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'p-1.5 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
        active
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
      )}
    >
      {icon}
    </button>
  );

  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border flex-wrap bg-muted/30">
      {/* Undo / Redo */}
      {btn(
        false,
        () => editor.dispatchCommand(UNDO_COMMAND, undefined),
        <Undo size={14} />,
        'Undo (Ctrl+Z)',
        !state.canUndo
      )}
      {btn(
        false,
        () => editor.dispatchCommand(REDO_COMMAND, undefined),
        <Redo size={14} />,
        'Redo (Ctrl+Y)',
        !state.canRedo
      )}
      <div className="w-px h-4 bg-border mx-1" />

      {/* Text formatting */}
      {btn(
        state.isBold,
        () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold'),
        <Bold size={14} />,
        'Bold (Ctrl+B)'
      )}
      {btn(
        state.isItalic,
        () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic'),
        <Italic size={14} />,
        'Italic (Ctrl+I)'
      )}
      {btn(
        state.isStrikethrough,
        () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough'),
        <Strikethrough size={14} />,
        'Strikethrough'
      )}
      {btn(
        state.isCode,
        () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code'),
        <Code size={14} />,
        'Inline Code'
      )}
      <div className="w-px h-4 bg-border mx-1" />

      {/* Block formatting */}
      {btn(
        state.isCodeBlock,
        () =>
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              const codeNode = $createCodeNode();
              selection.insertNodes([codeNode]);
            }
          }),
        <CodeSquare size={14} />,
        'Code Block'
      )}
      {btn(
        state.isBulletList,
        () =>
          state.isBulletList
            ? editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
            : editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined),
        <List size={14} />,
        'Bullet List'
      )}
      {btn(
        state.isNumberedList,
        () =>
          state.isNumberedList
            ? editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
            : editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined),
        <ListOrdered size={14} />,
        'Numbered List'
      )}
      {btn(
        false,
        () =>
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              const quoteNode = $createQuoteNode();
              selection.insertNodes([quoteNode]);
            }
          }),
        <Quote size={14} />,
        'Block Quote'
      )}
    </div>
  );
}
