const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export interface UploadedFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
}

export async function uploadFile(file: File): Promise<UploadedFile> {
  const token = localStorage.getItem('accessToken');
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_URL}/api/workspaces/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token ?? ''}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message ?? 'Upload failed');
  }

  const data = await res.json();
  return data.data.file as UploadedFile;
}
