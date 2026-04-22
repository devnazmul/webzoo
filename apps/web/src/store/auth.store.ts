import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: localStorage.getItem('accessToken'),
  setAuth: (user, accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, accessToken });
  },
  clearAuth: () => {
    localStorage.clear();
    set({ user: null, accessToken: null });
  },
  isAuthenticated: () => {
    return !!get().accessToken;
  },
}));

// Rehydrate user from localStorage on load
const stored = localStorage.getItem('user');
if (stored) {
  try {
    const user = JSON.parse(stored);
    useAuthStore.setState({ user });
  } catch {}
}
