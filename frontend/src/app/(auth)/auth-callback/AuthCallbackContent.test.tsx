import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import AuthCallbackContent from './AuthCallbackContent';

const push = vi.fn();
const setAuth = vi.fn();
const getProfile = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('@/store/globalStore', () => ({
  useAuthStore: () => ({ setAuth }),
}));

vi.mock('@/lib/api', () => ({
  userAPI: {
    getProfile: () => getProfile(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

describe('AuthCallbackContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('completes Google auth flow and redirects to dashboard', async () => {
    getProfile.mockResolvedValue({ data: { user: { id: 'u1', email: 'u1@test.com' } } });

    render(<AuthCallbackContent token="token123" error={null} />);

    await waitFor(() => {
      expect(setAuth).toHaveBeenCalledWith('token123', { id: 'u1', email: 'u1@test.com' });
      expect(push).toHaveBeenCalledWith('/dashboard');
    });
  });
});
