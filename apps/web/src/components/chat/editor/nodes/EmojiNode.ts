import {
  EditorConfig,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
  DecoratorNode,
} from 'lexical';
import { SerializedEmojiNode } from '../utils/schema';

export type EmojiNodeType = Spread<
  {
    emoji: string;
    shortcode: string;
  },
  SerializedLexicalNode
>;

export class EmojiNode extends DecoratorNode<null> {
  __emoji: string;
  __shortcode: string;

  static getType(): string {
    return 'emoji';
  }

  static clone(node: EmojiNode): EmojiNode {
    return new EmojiNode(node.__emoji, node.__shortcode, node.__key);
  }

  constructor(emoji: string, shortcode: string, key?: NodeKey) {
    super(key);
    this.__emoji = emoji;
    this.__shortcode = shortcode;
  }

  createDOM(): HTMLElement {
    const span = document.createElement('span');
    span.className = 'emoji-node';
    span.setAttribute('data-shortcode', this.__shortcode);
    span.contentEditable = 'false';
    span.textContent = this.__emoji;
    return span;
  }

  updateDOM(): boolean {
    return false;
  }

  decorate(): null {
    return null;
  }

  isInline(): boolean {
    return true;
  }

  getTextContent(): string {
    return this.__emoji;
  }

  exportJSON(): SerializedEmojiNode {
    return {
      type: 'emoji',
      emoji: this.__emoji,
      shortcode: this.__shortcode,
      version: 1,
    };
  }

  static importJSON(data: SerializedEmojiNode): EmojiNode {
    return new EmojiNode(data.emoji, data.shortcode);
  }
}

export function $createEmojiNode(
  emoji: string,
  shortcode: string
): EmojiNode {
  return new EmojiNode(emoji, shortcode);
}

export function $isEmojiNode(
  node: LexicalNode | null | undefined
): node is EmojiNode {
  return node instanceof EmojiNode;
}
