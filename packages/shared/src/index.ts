// Shared types across web, mobile, and server

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  createdAt: string;
}

export interface WorkspaceMember {
  userId: string;
  workspaceId: string;
  role: 'OWNER' | 'MEMBER';
}

export interface Topic {
  id: string;
  name: string;
  workspaceId: string;
  createdAt: string;
}

export interface Message {
  id: string;
  content: string;
  topicId: string;
  authorId: string;
  author: Pick<User, 'id' | 'name'>;
  createdAt: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  status: 'error';
  message: string;
}
