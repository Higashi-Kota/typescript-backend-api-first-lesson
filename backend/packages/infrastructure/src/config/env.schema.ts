import { z } from 'zod'

const nodeEnvSchema = z
  .enum(['development', 'test', 'staging', 'production'])
  .default('development')

export const envSchema = z.object({
  // Node Environment
  NODE_ENV: nodeEnvSchema,

  // Server Configuration
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    .default('info'),

  // Database Configuration
  DATABASE_URL: z.string().url().or(z.string().startsWith('postgres://')),
  DATABASE_POOL_MIN: z.coerce.number().int().positive().default(2),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),

  // JWT Configuration
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_ACCESS_TOKEN_EXPIRY_MINUTES: z.coerce
    .number()
    .int()
    .positive()
    .default(15),
  JWT_REFRESH_TOKEN_EXPIRY_DAYS: z.coerce.number().int().positive().default(7),
  JWT_ISSUER: z.string().default('beauty-salon-backend'),
  JWT_AUDIENCE: z.string().default('beauty-salon-users'),

  // CORS Configuration
  CORS_ORIGIN: z.string().default('http://localhost:3001'),
  CORS_ALLOWED_ORIGINS: z.string().optional(),

  // Email Configuration
  EMAIL_PROVIDER: z
    .enum(['development', 'mailhog', 'mailgun'])
    .default('development'),
  EMAIL_DEVELOPMENT_MODE: z.coerce.boolean().default(false),
  FROM_EMAIL: z.string().email().default('noreply@beauty-salon.local'),
  FROM_NAME: z.string().default('Beauty Salon'),

  // MailHog Configuration (Development)
  MAILHOG_HOST: z.string().default('localhost'),
  MAILHOG_PORT: z.coerce.number().int().positive().default(1025),

  // Mailgun Configuration (Production)
  MAILGUN_API_KEY: z.string().optional(),
  MAILGUN_DOMAIN: z.string().optional(),

  // SMTP Configuration (Alternative)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),

  // Storage Configuration
  STORAGE_PROVIDER: z.enum(['minio', 'r2']).default('minio'),
  STORAGE_ENDPOINT: z
    .string()
    .url()
    .or(z.string())
    .default('http://localhost:9000'),
  STORAGE_BUCKET: z.string().default('beauty-salon'),
  STORAGE_REGION: z.string().default('us-east-1'),
  STORAGE_ACCESS_KEY: z.string().default('minioadmin'),
  STORAGE_SECRET_KEY: z.string().default('minioadmin'),

  // Security Configuration
  ARGON2_MEMORY_COST: z.coerce.number().int().positive().default(65536),
  ARGON2_TIME_COST: z.coerce.number().int().positive().default(3),
  ARGON2_PARALLELISM: z.coerce.number().int().positive().default(4),
  ARGON2_OUTPUT_LENGTH: z.coerce.number().int().positive().default(32),

  // Password Policy
  PASSWORD_MIN_LENGTH: z.coerce.number().int().positive().default(12),
  PASSWORD_MAX_LENGTH: z.coerce.number().int().positive().default(128),
  PASSWORD_REQUIRE_UPPERCASE: z.coerce.boolean().default(true),
  PASSWORD_REQUIRE_LOWERCASE: z.coerce.boolean().default(true),
  PASSWORD_REQUIRE_DIGIT: z.coerce.boolean().default(true),
  PASSWORD_REQUIRE_SPECIAL: z.coerce.boolean().default(true),
  PASSWORD_CHECK_COMMON: z.coerce.boolean().default(true),

  // Encryption Configuration
  ENCRYPTION_KEY: z.string().length(64).optional(),
})

export type EnvConfig = z.infer<typeof envSchema>

export const validateEnv = (
  env: Record<string, string | undefined>
): EnvConfig => {
  const result = envSchema.safeParse(env)

  if (!result.success) {
    console.error('Environment validation failed:')
    console.error(result.error.format())
    throw new Error('Invalid environment configuration')
  }

  // Additional validation
  const config = result.data

  // Validate email provider configuration
  if (config.EMAIL_PROVIDER === 'mailgun') {
    if (!config.MAILGUN_API_KEY || !config.MAILGUN_DOMAIN) {
      throw new Error(
        'MAILGUN_API_KEY and MAILGUN_DOMAIN are required when EMAIL_PROVIDER is mailgun'
      )
    }
  }

  // Auto-select email provider based on environment
  if (!env.EMAIL_PROVIDER) {
    if (config.NODE_ENV === 'development') {
      config.EMAIL_PROVIDER = 'mailhog'
    } else if (
      config.NODE_ENV === 'staging' ||
      config.NODE_ENV === 'production'
    ) {
      config.EMAIL_PROVIDER = 'mailgun'
    }
  }

  // Auto-select storage provider based on environment
  if (!env.STORAGE_PROVIDER) {
    if (config.NODE_ENV === 'development') {
      config.STORAGE_PROVIDER = 'minio'
    } else if (
      config.NODE_ENV === 'staging' ||
      config.NODE_ENV === 'production'
    ) {
      config.STORAGE_PROVIDER = 'r2'
    }
  }

  // Generate encryption key if not provided
  if (!config.ENCRYPTION_KEY && config.NODE_ENV !== 'development') {
    throw new Error(
      'ENCRYPTION_KEY is required in non-development environments'
    )
  }

  return config
}
