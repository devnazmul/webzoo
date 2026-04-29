import {
  EditorConfig,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
  DecoratorNode,
} from 'lexical';
import { SerializedFileNode } from '../utils/schema';

export type FileNodeType = Spread<
  {
    fileId: string;
    name: string;
    mimeType: string;
    size: number;
    previewUrl: string | null;
  },
  SerializedLexicalNode
>;

export class FileNode extends DecoratorNode<null> {
  __fileId: string;
  __name: string;
  __mimeType: string;
  __size: number;
  __previewUrl: string | null;

  static getType(): string {
    return 'file';
  }

  static clone(node: FileNode): FileNode {
    return new FileNode(
      node.__fileId,
      node.__name,
      node.__mimeType,
      node.__size,
      node.__previewUrl,
      node.__key
    );
  }

  constructor(
    fileId: string,
    name: string,
    mimeType: string,
    size: number,
    previewUrl: string | null,
    key?: NodeKey
  ) {
    super(key);
    this.__fileId = fileId;
    this.__name = name;
    this.__mimeType = mimeType;
    this.__size = size;
    this.__previewUrl = previewUrl;
  }

  createDOM(): HTMLElement {
    const div = document.createElement('div');
    div.className = 'file-node';
    div.setAttribute('data-file-id', this.__fileId);
    div.contentEditable = 'false';
    return div;
  }

  updateDOM(): boolean {
    return false;
  }

  decorate(): null {
    return null;
  }

  isInline(): boolean {
    return false;
  }

  isKeyboardSelectable(): boolean {
    return true;
  }

  getTextContent(): string {
    return `[File: ${this.__name}]`;
  }

  exportJSON(): SerializedFileNode {
    return {
      type: 'file',
      fileId: this.__fileId,
      name: this.__name,
      mimeType: this.__mimeType,
      size: this.__size,
      previewUrl: this.__previewUrl,
      version: 1,
    };
  }

  static importJSON(data: SerializedFileNode): FileNode {
    return new FileNode(
      data.fileId,
      data.name,
      data.mimeType,
      data.size,
      data.previewUrl
    );
  }
}

export function $createFileNode(
  fileId: string,
  name: string,
  mimeType: string,
  size: number,
  previewUrl: string | null
): FileNode {
  return new FileNode(fileId, name, mimeType, size, previewUrl);
}

export function $isFileNode(
  node: LexicalNode | null | undefined
): node is FileNode {
  return node instanceof FileNode;
}
