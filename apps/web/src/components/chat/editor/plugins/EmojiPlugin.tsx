import { useCallback, useEffect, useRef, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  TextNode,
  $createTextNode,
} from 'lexical';
import { $createEmojiNode } from '../nodes/EmojiNode';

// Basic shortcode to emoji map — extend as needed
const EMOJI_MAP: Record<string, string> = {
  smile: '😊',
  laugh: '😂',
  heart: '❤️',
  thumbsup: '👍',
  thumbsdown: '👎',
  fire: '🔥',
  check: '✅',
  x: '❌',
  wave: '👋',
  clap: '👏',
  eyes: '👀',
  rocket: '🚀',
  star: '⭐',
  warning: '⚠️',
  info: 'ℹ️',
  question: '❓',
  tada: '🎉',
  bug: '🐛',
  wrench: '🔧',
  lock: '🔒',
};

const SHORTCODE_REGEX = /:([a-zA-Z0-9_]+):$/;

export default function EmojiPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerNodeTransform(TextNode, (node) => {
      const text = node.getTextContent();
      const match = SHORTCODE_REGEX.exec(text);
      if (!match) return;

      const shortcode = match[1].toLowerCase();
      const emoji = EMOJI_MAP[shortcode];
      if (!emoji) return;

      editor.update(() => {
        const latestNode = node.getLatest();
        const fullText = latestNode.getTextContent();
        const matchStart = fullText.lastIndexOf(`:${match[1]}:`);
        if (matchStart === -1) return;

        const before = fullText.slice(0, matchStart);
        const after = fullText.slice(matchStart + match[0].length);

        latestNode.setTextContent(before);

        const emojiNode = $createEmojiNode(emoji, shortcode);
        latestNode.insertAfter(emojiNode);

        if (after) {
          const afterNode = $createTextNode(after);
          emojiNode.insertAfter(afterNode);
          afterNode.select();
        } else {
          const spaceNode = $createTextNode(' ');
          emojiNode.insertAfter(spaceNode);
          spaceNode.select();
        }
      });
    });
  }, [editor]);

  return null;
}
