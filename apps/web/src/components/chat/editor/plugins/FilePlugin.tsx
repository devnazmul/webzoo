import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect, useRef } from 'react';
import { $getRoot, $createParagraphNode } from 'lexical';
import { $createFileNode } from '../nodes/FileNode';
import { uploadFile, UploadedFile } from '@/lib/upload';

interface Props {
  onFilesChange?: (files: UploadedFile[]) => void;
}

export default function FilePlugin({ onFilesChange }: Props) {
  const [editor] = useLexicalComposerContext();
  const uploadedFiles = useRef<UploadedFile[]>([]);

  useEffect(() => {
    // Expose a trigger function on the editor's root element
    const root = editor.getRootElement();
    if (!root) return;

    async function handleFiles(files: FileList | File[]) {
      const fileArray = Array.from(files);
      for (const file of fileArray) {
        try {
          const uploaded = await uploadFile(file);
          uploadedFiles.current = [...uploadedFiles.current, uploaded];
          onFilesChange?.(uploadedFiles.current);

          editor.update(() => {
            const root = $getRoot();
            const lastChild = root.getLastChild();
            const fileNode = $createFileNode(
              uploaded.id,
              uploaded.originalName,
              uploaded.mimeType,
              uploaded.size,
              `${import.meta.env.VITE_API_URL ?? 'http://localhost:4000'}${uploaded.url}`
            );
            const para = $createParagraphNode();
            para.append(fileNode);
            if (lastChild) {
              lastChild.insertAfter(para);
            } else {
              root.append(para);
            }
          });
        } catch (err) {
          console.error('Upload failed:', err);
        }
      }
    }

    // File input handler
    function onFileInput(e: Event) {
      const input = e.target as HTMLInputElement;
      if (input.files) handleFiles(input.files);
    }

    // Drag & drop handler on the editor root
    function onDrop(e: DragEvent) {
      e.preventDefault();
      if (e.dataTransfer?.files) handleFiles(e.dataTransfer.files);
    }

    // Dragover handler
    function onDragOver(e: DragEvent) {
      e.preventDefault();
    }

    // Paste handler
    function onPaste(e: ClipboardEvent) {
      if (!e.clipboardData) return;
      const files = Array.from(e.clipboardData.items)
        .filter((i) => i.kind === 'file')
        .map((i) => i.getAsFile())
        .filter(Boolean) as File[];
      if (files.length > 0) {
        e.preventDefault();
        handleFiles(files);
      }
    }

    root.addEventListener('drop', onDrop);
    root.addEventListener('dragover', onDragOver);
    root.addEventListener('paste', onPaste);

    // Store handler ref so toolbar attach button can call it
    (root as any).__handleFiles = handleFiles;

    return () => {
      root.removeEventListener('drop', onDrop);
      root.removeEventListener('dragover', onDragOver);
      root.removeEventListener('paste', onPaste);
      delete (root as any).__handleFiles;
    };
  }, [editor, onFilesChange]);

  return null;
}
