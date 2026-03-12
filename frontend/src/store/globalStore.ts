import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (token, user) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', token);
        }
        set({ token, user, isAuthenticated: true });
      },

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
        }
        set({ token: null, user: null, isAuthenticated: false });
        window.location.href = '/login';
      },

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
    }),
    {
      name: 'saybeeai_auth',
      partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

// ── Interview session store ───────────────────────────────────────────────────
interface InterviewState {
  currentInterviewId: string | null;
  currentQuestionId: string | null;
  stage: string;
  stageIndex: number;
  questionNumber: number;
  isInterviewActive: boolean;
  setInterview: (id: string) => void;
  setCurrentQuestion: (id: string, stage: string, stageIndex: number, qNum: number) => void;
  endInterview: () => void;
}

export const useInterviewStore = create<InterviewState>()((set) => ({
  currentInterviewId: null,
  currentQuestionId: null,
  stage: 'Introduction',
  stageIndex: 0,
  questionNumber: 0,
  isInterviewActive: false,

  setInterview: (id) => set({ currentInterviewId: id, isInterviewActive: true }),

  setCurrentQuestion: (id, stage, stageIndex, qNum) =>
    set({ currentQuestionId: id, stage, stageIndex, questionNumber: qNum }),

  endInterview: () =>
    set({
      currentInterviewId: null,
      currentQuestionId: null,
      isInterviewActive: false,
      stage: 'Introduction',
      stageIndex: 0,
      questionNumber: 0,
    }),
}));
