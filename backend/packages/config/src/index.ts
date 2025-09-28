import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export const env = createEnv({
  server: {
    // Node Environment
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    HOST: z.string().default('0.0.0.0'),
    API_PREFIX: z.string().default('/api'),
    API_VERSION: z.string().default('v1'),

    // Database
    DATABASE_URL: z
      .string()
      .url()
      .default('postgres://postgres:postgres@localhost:5432/beauty_salon'),
    DATABASE_POOL_MIN: z.coerce.number().int().min(0).default(2),
    DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
    DATABASE_POOL_SIZE: z.coerce.number().int().positive().default(20),
    DATABASE_CONNECTION_TIMEOUT: z.coerce
      .number()
      .int()
      .positive()
      .default(30000),

    // JWT & Authentication
    JWT_SECRET: z
      .string()
      .min(32)
      .default('development-secret-key-minimum-32-characters'),
    JWT_EXPIRES_IN: z.string().default('7d'),
    JWT_REFRESH_SECRET: z
      .string()
      .min(32)
      .default('development-refresh-secret-minimum-32-chars'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

    // Session
    SESSION_SECRET: z
      .string()
      .min(32)
      .default('development-session-secret-minimum-32-chars'),
    SESSION_COOKIE_NAME: z.string().default('beauty_salon_session'),
    SESSION_COOKIE_MAX_AGE: z.coerce
      .number()
      .int()
      .positive()
      .default(86400000),
    SESSION_COOKIE_SECURE: z.coerce.boolean().default(false),
    SESSION_COOKIE_SAME_SITE: z.enum(['strict', 'lax', 'none']).default('lax'),

    // Security
    BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(20).default(12),
    ENCRYPTION_KEY: z.string().length(32).optional(),
    CSRF_SECRET: z.string().optional(),

    // Password Reset
    PASSWORD_RESET_TOKEN_EXPIRES_IN: z.coerce
      .number()
      .int()
      .positive()
      .default(3600),
    PASSWORD_RESET_URL: z
      .string()
      .url()
      .default('http://localhost:3001/reset-password'),

    // Email Verification
    EMAIL_VERIFICATION_TOKEN_EXPIRES_IN: z.coerce
      .number()
      .int()
      .positive()
      .default(86400),
    EMAIL_VERIFICATION_URL: z
      .string()
      .url()
      .default('http://localhost:3001/verify-email'),

    // Two Factor Auth
    TWO_FACTOR_ISSUER: z.string().default('Beauty Salon'),
    TWO_FACTOR_WINDOW: z.coerce.number().int().positive().default(2),

    // CORS
    CORS_ORIGIN: z.string().default('http://localhost:3001'),
    CORS_CREDENTIALS: z.coerce.boolean().default(true),
    CORS_MAX_AGE: z.coerce.number().int().positive().default(86400),

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
    RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),
    RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS: z.coerce.boolean().default(false),
    RATE_LIMIT_SKIP_FAILED_REQUESTS: z.coerce.boolean().default(false),

    // Logging
    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),
    LOG_FILE_PATH: z.string().optional(),
    LOG_FILE_MAX_SIZE: z.coerce.number().int().positive().default(10485760),
    LOG_FILE_MAX_FILES: z.coerce.number().int().positive().default(5),

    // Email Provider
    EMAIL_PROVIDER: z
      .enum(['development', 'mailhog', 'mailgun'])
      .default('mailhog'),
    EMAIL_FROM_ADDRESS: z
      .string()
      .email()
      .default('noreply@beauty-salon.local'),
    EMAIL_FROM_NAME: z.string().default('Beauty Salon'),
    EMAIL_REPLY_TO: z.string().email().optional(),

    // MailHog
    MAILHOG_HOST: z.string().default('localhost'),
    MAILHOG_PORT: z.coerce.number().int().positive().default(1025),

    // Mailgun
    MAILGUN_API_KEY: z.string().optional(),
    MAILGUN_DOMAIN: z.string().optional(),
    MAILGUN_REGION: z.enum(['US', 'EU']).default('US'),
    MAILGUN_TEST_MODE: z.coerce.boolean().default(false),
    MAILGUN_WEBHOOK_SIGNING_KEY: z.string().optional(),

    // Storage Provider
    STORAGE_PROVIDER: z.enum(['minio', 'r2']).default('minio'),

    // MinIO
    MINIO_ENDPOINT: z.string().url().default('http://localhost:9000'),
    MINIO_BUCKET: z.string().default('beauty-salon-dev'),
    MINIO_REGION: z.string().default('us-east-1'),
    MINIO_ACCESS_KEY_ID: z.string().default('minioadmin'),
    MINIO_SECRET_ACCESS_KEY: z.string().default('minioadmin'),

    // Cloudflare R2
    R2_ENDPOINT: z.string().url().optional(),
    R2_BUCKET: z.string().optional(),
    R2_ACCOUNT_ID: z.string().optional(),
    R2_ACCESS_KEY_ID: z.string().optional(),
    R2_SECRET_ACCESS_KEY: z.string().optional(),

    // Storage Common
    STORAGE_ENDPOINT: z.string().url().optional(),
    STORAGE_MAX_FILE_SIZE: z.coerce
      .number()
      .int()
      .positive()
      .default(524288000),
    STORAGE_ALLOWED_EXTENSIONS: z
      .string()
      .default('jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx'),
    STORAGE_UPLOAD_URL_EXPIRES_IN: z.coerce
      .number()
      .int()
      .positive()
      .default(3600),
    STORAGE_DOWNLOAD_URL_EXPIRES_IN: z.coerce
      .number()
      .int()
      .positive()
      .default(86400),

    // SMTP Configuration
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    SMTP_FROM: z.string().email().optional(),

    // S3 Storage Configuration
    S3_ENDPOINT: z.string().url().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    S3_BUCKET: z.string().optional(),
    S3_REGION: z.string().default('us-east-1'),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  skipValidation: process.env.NODE_ENV === 'test',
})

export const isProduction = env.NODE_ENV === 'production'
export const isDevelopment = env.NODE_ENV === 'development'
export const isTest = env.NODE_ENV === 'test'
