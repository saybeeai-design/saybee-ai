const LOCAL_BACKEND_URL = 'http://localhost:5000';
const PRODUCTION_BACKEND_URL = 'https://saybee-ai.onrender.com';

const normalizeUrl = (value: string): string => value.trim().replace(/\/+$/, '');

export const getBackendBaseUrl = (): string => {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (configuredUrl) {
    return normalizeUrl(configuredUrl).replace(/\/api$/, '');
  }

  return process.env.NODE_ENV === 'production' ? PRODUCTION_BACKEND_URL : LOCAL_BACKEND_URL;
};

export const getApiBaseUrl = (): string => `${getBackendBaseUrl()}/api`;
