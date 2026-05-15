const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (value: string): boolean => EMAIL_REGEX.test(value.trim());

export const isValidPassword = (value: string): boolean => value.length >= 8;

export const sanitizeName = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  return value.trim().slice(0, 120);
};

export const assertNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;
