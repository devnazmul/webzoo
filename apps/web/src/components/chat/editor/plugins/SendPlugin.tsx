import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getRoot,
  COMMAND_PRIORITY_LOW,
  KEY_ENTER_COMMAND,
} from 'lexical';

interface Props {
  onSend: () => void;
}

export default function SendPlugin({ onSend }: Props) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event: KeyboardEvent | null) => {
        // Shift+Enter = new line (always allow)
        if (event?.shiftKey) return false;

        // Enter = send only if there is content
        // Use LOW priority so MentionPlugin and other
        // HIGH priority handlers get first chance
        let hasContent = false;
        editor.getEditorState().read(() => {
          const root = $getRoot();
          hasContent = root.getTextContent().trim().length > 0;
        });

        if (hasContent) {
          event?.preventDefault();
          onSend();
          return true;
        }

        return false;
      },
      COMMAND_PRIORITY_LOW
    );
  }, [editor, onSend]);

  return null;
}
