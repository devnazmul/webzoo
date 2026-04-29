import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getRoot,
  COMMAND_PRIORITY_HIGH,
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
        // Shift+Enter = new line (default behavior)
        if (event?.shiftKey) return false;

        // Enter = send if there is content
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
      COMMAND_PRIORITY_HIGH
    );
  }, [editor, onSend]);

  return null;
}
