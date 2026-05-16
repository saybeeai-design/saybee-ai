type LogLevel = 'info' | 'warn' | 'error';

type LogMeta = Record<string, unknown>;

const SECRET_KEY_PATTERN = /(secret|token|password|pass|api[_-]?key|authorization|credential|dsn)/i;

const redact = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => redact(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
        key,
        SECRET_KEY_PATTERN.test(key) ? '[redacted]' : redact(nestedValue),
      ])
    );
  }

  return value;
};

const write = (level: LogLevel, message: string, meta?: LogMeta): void => {
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(meta ? { meta: redact(meta) } : {}),
  };

  const line = JSON.stringify(payload);
  if (level === 'error') {
    console.error(line);
    return;
  }
  if (level === 'warn') {
    console.warn(line);
    return;
  }
  console.log(line);
};

export const logger = {
  info: (message: string, meta?: LogMeta) => write('info', message, meta),
  warn: (message: string, meta?: LogMeta) => write('warn', message, meta),
  error: (message: string, meta?: LogMeta) => write('error', message, meta),
};
