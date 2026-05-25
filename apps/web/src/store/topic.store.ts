import { create } from 'zustand';
import { Topic } from '@webzoo/shared';

interface TopicState {
  topics: Topic[];
  activeTopic: Topic | null;
  unreadCounts: Record<string, number>;
  setTopics: (topics: Topic[]) => void;
  setActiveTopic: (topic: Topic) => void;
  setUnreadCounts: (counts: Record<string, number>) => void;
  incrementUnread: (topicId: string) => void;
  clearUnread: (topicId: string) => void;
}

export const useTopicStore = create<TopicState>((set) => ({
  topics: [],
  activeTopic: null,
  unreadCounts: {},
  setTopics: (topics) => set({ topics }),
  setActiveTopic: (topic) => set({ activeTopic: topic }),
  setUnreadCounts: (counts) => set({ unreadCounts: counts }),
  incrementUnread: (topicId) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [topicId]: (state.unreadCounts[topicId] ?? 0) + 1,
      },
    })),
  clearUnread: (topicId) =>
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [topicId]: 0 },
    })),
}));
