import { create } from 'zustand';

export interface TaskStatus {
  id: string;
  name: string;
  color: string;
  position: number;
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  statusId: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assigneeId?: string;
  assignee?: { id: string; name: string };
  dueDate?: string;
  topicId: string;
  workspaceId: string;
  subtasks: SubTask[];
  createdAt: string;
}

interface TaskState {
  statuses: TaskStatus[];
  tasks: Task[];
  setStatuses: (statuses: TaskStatus[]) => void;
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  clearTasks: () => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  statuses: [],
  tasks: [],
  setStatuses: (statuses) => set({ statuses }),
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((s) => ({ tasks: [...s.tasks, task] })),
  updateTask: (task) =>
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === task.id ? task : t)) })),
  clearTasks: () => set({ tasks: [] }),
}));
