import { create } from 'zustand';
import { Topic } from '@webzoo/shared';

interface TopicState {
  topics: Topic[];
  activeTopic: Topic | null;
  setTopics: (topics: Topic[]) => void;
  setActiveTopic: (topic: Topic) => void;
}

export const useTopicStore = create<TopicState>((set) => ({
  topics: [],
  activeTopic: null,
  setTopics: (topics) => set({ topics }),
  setActiveTopic: (topic) => set({ activeTopic: topic }),
}));
