import axios from 'axios';

const DEFAULT_CHECKOUT_ERROR = 'Failed to initiate checkout. Please try again.';

export function getPaymentErrorMessage(
  error: unknown,
  fallback = DEFAULT_CHECKOUT_ERROR,
): string {
  if (axios.isAxiosError(error)) {
    const responseMessage =
      typeof error.response?.data?.message === 'string' ? error.response.data.message : null;

    if (error.response?.status === 401) {
      return 'Your session has expired. Please log in again.';
    }

    return responseMessage || error.message || fallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
