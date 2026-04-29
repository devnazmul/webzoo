import {
  $getRoot,
  $isElementNode,
  $isTextNode,
  $isLineBreakNode,
  LexicalEditor,
  LexicalNode,
} from 'lexical';
import { $isListNode } from '@lexical/list';
import { $isListItemNode } from '@lexical/list';
import { $isCodeNode } from '@lexical/code';
import { $isQuoteNode } from '@lexical/rich-text';
import { $isHeadingNode } from '@lexical/rich-text';
import { $isMentionNode } from '../nodes/MentionNode';
import { $isEmojiNode } from '../nodes/EmojiNode';
import { $isFileNode } from '../nodes/FileNode';
import {
  SerializedBlockNode,
  SerializedDocument,
  SerializedEmojiNode,
  SerializedFileNode,
  SerializedInlineNode,
  SerializedListItemNode,
  SerializedMentionNode,
  EditorOutput,
} from './schema';

function serializeInlineNode(node: LexicalNode): SerializedInlineNode | null {
  if ($isLineBreakNode(node)) {
    return { type: 'linebreak', version: 1 };
  }

  if ($isMentionNode(node)) {
    return {
      type: 'mention',
      mentionType: node.__mentionType,
      id: node.__id,
      label: node.__label,
      version: 1,
    } as SerializedMentionNode;
  }

  if ($isEmojiNode(node)) {
    return {
      type: 'emoji',
      emoji: node.__emoji,
      shortcode: node.__shortcode,
      version: 1,
    } as SerializedEmojiNode;
  }

  if ($isTextNode(node)) {
    return {
      type: 'text',
      text: node.getTextContent(),
      format: node.getFormat(),
      version: 1,
    };
  }

  return null;
}

function serializeChildren(node: LexicalNode): SerializedInlineNode[] {
  if (!$isElementNode(node)) return [];
  const result: SerializedInlineNode[] = [];
  for (const child of node.getChildren()) {
    const serialized = serializeInlineNode(child);
    if (serialized) result.push(serialized);
  }
  return result;
}

function serializeBlockNode(node: LexicalNode): SerializedBlockNode | null {
  if ($isFileNode(node)) {
    return {
      type: 'file',
      fileId: node.__fileId,
      name: node.__name,
      mimeType: node.__mimeType,
      size: node.__size,
      previewUrl: node.__previewUrl,
      version: 1,
    } as SerializedFileNode;
  }

  if ($isListNode(node)) {
    const items: SerializedListItemNode[] = [];
    for (const child of node.getChildren()) {
      if ($isListItemNode(child)) {
        items.push({
          type: 'listitem',
          children: serializeChildren(child),
          value: child.getValue(),
          checked: child.getChecked(),
          version: 1,
        });
      }
    }
    return {
      type: 'list',
      listType: node.getListType() === 'number' ? 'number' : 'bullet',
      children: items,
      version: 1,
    };
  }

  if ($isCodeNode(node)) {
    const textChildren = node.getChildren().filter($isTextNode);
    return {
      type: 'code',
      language: node.getLanguage() ?? '',
      children: textChildren.map((n) => ({
        type: 'text' as const,
        text: n.getTextContent(),
        format: n.getFormat(),
        version: 1 as const,
      })),
      version: 1,
    };
  }

  if ($isQuoteNode(node)) {
    return {
      type: 'quote',
      children: serializeChildren(node),
      version: 1,
    };
  }

  // Default: paragraph (also handles heading as paragraph)
  if ($isElementNode(node)) {
    return {
      type: 'paragraph',
      children: serializeChildren(node),
      version: 1,
    };
  }

  return null;
}

export function serializeEditor(editor: LexicalEditor): EditorOutput {
  let document: SerializedDocument = {
    type: 'root',
    children: [],
    version: 1,
  };

  let plainText = '';
  const files: SerializedFileNode[] = [];
  const mentions: SerializedMentionNode[] = [];

  editor.getEditorState().read(() => {
    const root = $getRoot();
    const blocks: SerializedBlockNode[] = [];

    for (const child of root.getChildren()) {
      const block = serializeBlockNode(child);
      if (block) {
        blocks.push(block);
        if (block.type === 'file') {
          files.push(block as SerializedFileNode);
        }
      }
    }

    document = { type: 'root', children: blocks, version: 1 };

    // Build plain text and collect mentions
    plainText = root.getTextContent();

    const collectMentions = (node: LexicalNode) => {
      if ($isMentionNode(node)) {
        mentions.push({
          type: 'mention',
          mentionType: node.__mentionType,
          id: node.__id,
          label: node.__label,
          version: 1,
        });
      }
      if ($isElementNode(node)) {
        for (const child of node.getChildren()) {
          collectMentions(child);
        }
      }
    };
    collectMentions(root);
  });

  return {
    document,
    plainText: plainText.trim(),
    hasContent: plainText.trim().length > 0 || files.length > 0,
    files,
    mentions,
  };
}
