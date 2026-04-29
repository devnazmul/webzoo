import {
  $createParagraphNode,
  $createTextNode,
  $createLineBreakNode,
  $getRoot,
  $insertNodes,
  LexicalEditor,
  TextNode,
  ParagraphNode,
} from 'lexical';
import {
  $createListNode,
  $createListItemNode,
} from '@lexical/list';
import { $createCodeNode } from '@lexical/code';
import { $createQuoteNode } from '@lexical/rich-text';
import { $createMentionNode } from '../nodes/MentionNode';
import { $createEmojiNode } from '../nodes/EmojiNode';
import { $createFileNode } from '../nodes/FileNode';
import {
  SerializedBlockNode,
  SerializedDocument,
  SerializedInlineNode,
} from './schema';

function deserializeInlineNode(
  node: SerializedInlineNode
): TextNode | ReturnType<typeof $createMentionNode> | ReturnType<typeof $createEmojiNode> | ReturnType<typeof $createLineBreakNode> | null {
  switch (node.type) {
    case 'text': {
      const textNode = $createTextNode(node.text);
      textNode.setFormat(node.format);
      return textNode;
    }
    case 'mention':
      return $createMentionNode(node.mentionType, node.id, node.label);
    case 'emoji':
      return $createEmojiNode(node.emoji, node.shortcode);
    case 'linebreak':
      return $createLineBreakNode();
    default:
      return null;
  }
}

function deserializeBlockNode(node: SerializedBlockNode): ParagraphNode | ReturnType<typeof $createListNode> | ReturnType<typeof $createCodeNode> | ReturnType<typeof $createQuoteNode> | ReturnType<typeof $createFileNode> | null {
  switch (node.type) {
    case 'paragraph': {
      const para = $createParagraphNode();
      for (const child of node.children) {
        const inlineNode = deserializeInlineNode(child);
        if (inlineNode) para.append(inlineNode);
      }
      return para;
    }
    case 'list': {
      const list = $createListNode(
        node.listType === 'number' ? 'number' : 'bullet'
      );
      for (const item of node.children) {
        const listItem = $createListItemNode();
        for (const child of item.children) {
          const inlineNode = deserializeInlineNode(child);
          if (inlineNode) listItem.append(inlineNode);
        }
        list.append(listItem);
      }
      return list;
    }
    case 'code': {
      const code = $createCodeNode(node.language);
      for (const child of node.children) {
        const textNode = $createTextNode(child.text);
        textNode.setFormat(child.format);
        code.append(textNode);
      }
      return code;
    }
    case 'quote': {
      const quote = $createQuoteNode();
      for (const child of node.children) {
        const inlineNode = deserializeInlineNode(child);
        if (inlineNode) quote.append(inlineNode);
      }
      return quote;
    }
    case 'file':
      return $createFileNode(
        node.fileId,
        node.name,
        node.mimeType,
        node.size,
        node.previewUrl
      );
    default:
      return null;
  }
}

export function deserializeDocument(
  editor: LexicalEditor,
  document: SerializedDocument
): void {
  editor.update(() => {
    const root = $getRoot();
    root.clear();
    for (const block of document.children) {
      const blockNode = deserializeBlockNode(block);
      if (blockNode) root.append(blockNode);
    }
  });
}
