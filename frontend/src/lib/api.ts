import axios from 'axios';
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || '',
  tracesSampleRate: 1.0,
});

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token from localStorage to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, clear token and redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    Sentry.captureException(err);
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('saybeeai_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Typed API helpers ─────────────────────────────────────────────────────────

export const authAPI = {
  signup: (data: { name: string; email: string; password: string }) =>
    api.post('/auth/signup', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
};

export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data: { name?: string; password?: string }) =>
    api.put('/users/profile', data),
};

export const resumeAPI = {
  upload: (formData: FormData) =>
    api.post('/resumes/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  list: () => api.get('/resumes'),
  delete: (id: string) => api.delete(`/resumes/${id}`),
};

export const interviewAPI = {
  start: (data: { resumeId: string; category: string; language: string }) =>
    api.post('/interviews/start', data),
  list: () => api.get('/interviews'),
  get: (id: string) => api.get(`/interviews/${id}`),
  finish: (id: string, score?: number) => api.post(`/interviews/${id}/finish`, { score }),
  generateQuestion: (id: string, speakQuestion = false) =>
    api.post(`/interviews/${id}/generate-question`, { speakQuestion }),
  nextTurn: (id: string, data: { questionId: string; answerContent: string; speakNextQuestion?: boolean }) =>
    api.post(`/interviews/${id}/next-turn`, data),
};

export const questionAPI = {
  submitAnswer: (id: string, data: { content: string; transcriptText?: string }) =>
    api.post(`/questions/${id}/answer`, data),
  evaluate: (id: string) => api.post(`/questions/${id}/evaluate`),
};

export const aiAPI = {
  transcribe: (formData: FormData) =>
    api.post('/ai/transcribe', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  speak: (text: string, language = 'English') =>
    api.post('/ai/speak', { text, language }),
};
