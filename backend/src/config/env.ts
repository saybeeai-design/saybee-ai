import 'dotenv/config';

type EnvGroup = {
  keys: string[];
  name: string;
};

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

const baseRequiredKeys = [
  'DATABASE_URL',
  'JWT_SECRET',
  'GROQ_API_KEY',
];

const productionRequiredGroups: EnvGroup[] = [
  {
    name: 'AI providers',
    keys: [
      'GROQ_API_KEY',
      'GEMINI_API_KEY',
      'OPENROUTER_API_KEY',
      'OPENAI_API_KEY',
      'GOOGLE_TTS_API_KEY',
      'SERPER_API_KEY',
    ],
  },
  {
    name: 'Payments',
    keys: ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET'],
  },
  {
    name: 'Google OAuth',
    keys: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_CALLBACK_URL'],
  },
  {
    name: 'SMTP',
    keys: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'],
  },
  {
    name: 'AWS S3',
    keys: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'AWS_S3_BUCKET_NAME'],
  },
  {
    name: 'Observability',
    keys: ['SENTRY_DSN'],
  },
  {
    name: 'Frontend boundary',
    keys: ['FRONTEND_URL', 'CORS_ORIGIN'],
  },
];

const optionalNonProductionGroups: EnvGroup[] = [
  {
    name: 'Gemini or OpenRouter',
    keys: ['GEMINI_API_KEY', 'OPENROUTER_API_KEY'],
  },
];

const validateAbsoluteUrl = (envVar: string, value: string): string | null => {
  try {
    const parsedUrl = new URL(value);
    return ['http:', 'https:'].includes(parsedUrl.protocol) ? null : 'must use http or https';
  } catch {
    return 'must be a valid absolute URL';
  }
};

const validateCorsOrigins = (origins: string): string[] =>
  origins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .flatMap((origin) => {
      const error = validateAbsoluteUrl('CORS_ORIGIN', origin);
      return error ? [`CORS_ORIGIN ${error}: ${origin}`] : [];
    });

const collectMissing = (keys: string[]): string[] => keys.filter((key) => !process.env[key]?.trim());

function failConfiguration(errors: string[]): never {
  console.error('[Config] Backend environment validation failed:');
  for (const error of errors) {
    console.error(`[Config] - ${error}`);
  }
  process.exit(1);
}

export function validateBackendEnv(): void {
  const errors: string[] = [];
  const requiredKeys = isTest ? ['DATABASE_URL', 'JWT_SECRET'] : baseRequiredKeys;

  const missingBaseKeys = collectMissing(requiredKeys);
  if (missingBaseKeys.length > 0) {
    errors.push(`Missing required variables: ${missingBaseKeys.join(', ')}`);
  }

  if (!isTest && collectMissing(optionalNonProductionGroups[0].keys).length === optionalNonProductionGroups[0].keys.length) {
    errors.push('Configure at least one Gemini provider variable: GEMINI_API_KEY or OPENROUTER_API_KEY');
  }

  if (isProduction) {
    for (const group of productionRequiredGroups) {
      const missing = collectMissing(group.keys);
      if (missing.length > 0) {
        errors.push(`${group.name} missing: ${missing.join(', ')}`);
      }
    }
  }

  if (process.env.FRONTEND_URL) {
    const error = validateAbsoluteUrl('FRONTEND_URL', process.env.FRONTEND_URL);
    if (error) {
      errors.push(`FRONTEND_URL ${error}`);
    }
  }

  if (process.env.GOOGLE_CALLBACK_URL) {
    const error = validateAbsoluteUrl('GOOGLE_CALLBACK_URL', process.env.GOOGLE_CALLBACK_URL);
    if (error) {
      errors.push(`GOOGLE_CALLBACK_URL ${error}`);
    }
  }

  if (process.env.CORS_ORIGIN) {
    const corsErrors = validateCorsOrigins(process.env.CORS_ORIGIN);
    if (corsErrors.length > 0) {
      errors.push(...corsErrors);
    }
  }

  if (errors.length > 0) {
    failConfiguration(errors);
  }
}

export const getEnv = (key: string): string => {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

validateBackendEnv();
