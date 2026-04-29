import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $createParagraphNode,
  $getRoot,
  $insertNodes,
  COMMAND_PRIORITY_HIGH,
  PASTE_COMMAND,
  DROP_COMMAND,
} from 'lexical';
import { $createFileNode } from '../nodes/FileNode';
import { SerializedFileNode } from '../utils/schema';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  onFilesAdded: (files: SerializedFileNode[]) => void;
}

async function fileToPreviewUrl(file: File): Promise<string | null> {
  if (!file.type.startsWith('image/')) return null;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string ?? null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

async function processFiles(
  files: FileList | File[],
  onFilesAdded: (files: SerializedFileNode[]) => void
) {
  const fileArray = Array.from(files);
  const serialized: SerializedFileNode[] = await Promise.all(
    fileArray.map(async (file) => ({
      type: 'file' as const,
      fileId: uuidv4(),
      name: file.name,
      mimeType: file.type,
      size: file.size,
      previewUrl: await fileToPreviewUrl(file),
      version: 1 as const,
    }))
  );
  onFilesAdded(serialized);
}

export default function FilePlugin({ onFilesAdded }: Props) {
  const [editor] = useLexicalComposerContext();

  // Handle paste events with files
  useEffect(() => {
    return editor.registerCommand(
      PASTE_COMMAND,
      (event: ClipboardEvent) => {
        const files = event.clipboardData?.files;
        if (files && files.length > 0) {
          event.preventDefault();
          processFiles(files, onFilesAdded);
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_HIGH
    );
  }, [editor, onFilesAdded]);

  // Handle drag and drop
  useEffect(() => {
    return editor.registerCommand(
      DROP_COMMAND,
      (event: DragEvent) => {
        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
          event.preventDefault();
          processFiles(files, onFilesAdded);
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_HIGH
    );
  }, [editor, onFilesAdded]);

  // Handle dragover on the editor DOM element
  useEffect(() => {
    const editorEl = editor.getRootElement();
    if (!editorEl) return;

    const handleDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    editorEl.addEventListener('dragover', handleDragOver);
    return () => editorEl.removeEventListener('dragover', handleDragOver);
  }, [editor]);

  return null;
}
