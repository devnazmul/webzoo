import { create } from 'zustand';

export interface DMConversation {
  id: string;
  participants: { id: string; name: string }[];
  lastMessage?: { content: string; createdAt: string };
  unreadCount: number;
}

export interface DMMessage {
  id: string;
  content: string;
  conversationId: string;
  authorId: string;
  author: { id: string; name: string };
  createdAt: string;
}

interface DMState {
  conversations: DMConversation[];
  activeConversation: DMConversation | null;
  setConversations: (convs: DMConversation[]) => void;
  setActiveConversation: (conv: DMConversation | null) => void;
  incrementUnread: (convId: string) => void;
  clearUnread: (convId: string) => void;
  updateLastMessage: (convId: string, content: string, createdAt: string) => void;
}

export const useDMStore = create<DMState>((set) => ({
  conversations: [],
  activeConversation: null,
  setConversations: (conversations) => set({ conversations }),
  setActiveConversation: (activeConversation) => set({ activeConversation }),
  incrementUnread: (convId) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === convId ? { ...c, unreadCount: c.unreadCount + 1 } : c
      ),
    })),
  clearUnread: (convId) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === convId ? { ...c, unreadCount: 0 } : c
      ),
    })),
  updateLastMessage: (convId, content, createdAt) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === convId ? { ...c, lastMessage: { content, createdAt } } : c
      ),
    })),
}));
