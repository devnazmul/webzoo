import {
  EditorConfig,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
  DecoratorNode,
} from 'lexical';
import { SerializedMentionNode } from '../utils/schema';

export type MentionNodeType = Spread<
  {
    mentionType: 'user' | 'topic';
    id: string;
    label: string;
  },
  SerializedLexicalNode
>;

export class MentionNode extends DecoratorNode<null> {
  __mentionType: 'user' | 'topic';
  __id: string;
  __label: string;

  static getType(): string {
    return 'mention';
  }

  static clone(node: MentionNode): MentionNode {
    return new MentionNode(
      node.__mentionType,
      node.__id,
      node.__label,
      node.__key
    );
  }

  constructor(
    mentionType: 'user' | 'topic',
    id: string,
    label: string,
    key?: NodeKey
  ) {
    super(key);
    this.__mentionType = mentionType;
    this.__id = id;
    this.__label = label;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const span = document.createElement('span');
    span.className =
      this.__mentionType === 'user'
        ? 'mention mention-user'
        : 'mention mention-topic';
    span.setAttribute('data-mention-id', this.__id);
    span.setAttribute('data-mention-type', this.__mentionType);
    span.contentEditable = 'false';
    span.textContent =
      this.__mentionType === 'user'
        ? `@${this.__label}`
        : `#${this.__label}`;
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

  isKeyboardSelectable(): boolean {
    return true;
  }

  getTextContent(): string {
    return this.__mentionType === 'user'
      ? `@${this.__label}`
      : `#${this.__label}`;
  }

  exportJSON(): SerializedMentionNode {
    return {
      type: 'mention',
      mentionType: this.__mentionType,
      id: this.__id,
      label: this.__label,
      version: 1,
    };
  }

  static importJSON(data: SerializedMentionNode): MentionNode {
    return new MentionNode(data.mentionType, data.id, data.label);
  }
}

export function $createMentionNode(
  mentionType: 'user' | 'topic',
  id: string,
  label: string
): MentionNode {
  return new MentionNode(mentionType, id, label);
}

export function $isMentionNode(
  node: LexicalNode | null | undefined
): node is MentionNode {
  return node instanceof MentionNode;
}
