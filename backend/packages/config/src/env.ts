import { loadEnvConfig } from './env-loader'

export type Environment =
  | 'production'
  | 'staging'
  | 'development'
  | 'test'
  | 'localhost'

// Load environment configuration
loadEnvConfig()

/**
 * Type-safe environment configuration with proper inference.
 * All environment variables are required to be defined.
 */
export const env = {
  // Node Environment
  NODE_ENV: {
    description: 'Application runtime environment',
    value: process.env.NODE_ENV as Environment,
    required: true,
  },
  PORT: {
    description: 'Server port number',
    value: Number(process.env.PORT),
    required: true,
  },
  HOST: {
    description: 'Server host address',
    value: String(process.env.HOST),
    required: true,
  },
  API_PREFIX: {
    description: 'API route prefix',
    value: String(process.env.API_PREFIX),
    required: true,
  },
  API_VERSION: {
    description: 'API version',
    value: String(process.env.API_VERSION),
    required: true,
  },

  // Database Configuration
  DATABASE_URL: {
    description: 'PostgreSQL connection string',
    value: String(process.env.DATABASE_URL),
    required: true,
  },
  DATABASE_POOL_MIN: {
    description: 'Minimum database pool connections',
    value: Number(process.env.DATABASE_POOL_MIN),
    required: true,
  },
  DATABASE_POOL_MAX: {
    description: 'Maximum database pool connections',
    value: Number(process.env.DATABASE_POOL_MAX),
    required: true,
  },
  DATABASE_CONNECTION_TIMEOUT: {
    description: 'Database connection timeout in seconds',
    value: Number(process.env.DATABASE_CONNECTION_TIMEOUT),
    required: true,
  },

  // JWT & Authentication
  JWT_SECRET: {
    description: 'JWT signing secret',
    value: String(process.env.JWT_SECRET),
    required: true,
  },
  JWT_EXPIRES_IN: {
    description: 'JWT token expiration time',
    value: String(process.env.JWT_EXPIRES_IN),
    required: true,
  },
  JWT_REFRESH_SECRET: {
    description: 'JWT refresh token secret',
    value: String(process.env.JWT_REFRESH_SECRET),
    required: true,
  },
  JWT_REFRESH_EXPIRES_IN: {
    description: 'JWT refresh token expiration time',
    value: String(process.env.JWT_REFRESH_EXPIRES_IN),
    required: true,
  },

  // Session
  SESSION_SECRET: {
    description: 'Express session secret',
    value: String(process.env.SESSION_SECRET),
    required: true,
  },
  SESSION_COOKIE_NAME: {
    description: 'Session cookie name',
    value: String(process.env.SESSION_COOKIE_NAME),
    required: true,
  },
  SESSION_COOKIE_MAX_AGE: {
    description: 'Session cookie max age in milliseconds',
    value: Number(process.env.SESSION_COOKIE_MAX_AGE),
    required: true,
  },
  SESSION_COOKIE_SECURE: {
    description: 'Whether to use secure cookies',
    value: String(process.env.SESSION_COOKIE_SECURE) === 'true',
    required: true,
  },
  SESSION_COOKIE_SAME_SITE: {
    description: 'SameSite cookie attribute',
    value: String(process.env.SESSION_COOKIE_SAME_SITE) as
      | 'strict'
      | 'lax'
      | 'none',
    required: true,
  },

  // Security
  BCRYPT_ROUNDS: {
    description: 'Bcrypt hashing rounds',
    value: Number(process.env.BCRYPT_ROUNDS),
    required: true,
  },
  ENCRYPTION_KEY: {
    description: 'General encryption key',
    value: String(process.env.ENCRYPTION_KEY),
    required: true,
  },
  CSRF_SECRET: {
    description: 'CSRF protection secret',
    value: String(process.env.CSRF_SECRET),
    required: true,
  },

  // Password Reset
  PASSWORD_RESET_TOKEN_EXPIRES_IN: {
    description: 'Password reset token expiration time',
    value: String(process.env.PASSWORD_RESET_TOKEN_EXPIRES_IN),
    required: true,
  },
  PASSWORD_RESET_URL: {
    description: 'Password reset URL template',
    value: String(process.env.PASSWORD_RESET_URL),
    required: true,
  },

  // Email Verification
  EMAIL_VERIFICATION_TOKEN_EXPIRES_IN: {
    description: 'Email verification token expiration time',
    value: String(process.env.EMAIL_VERIFICATION_TOKEN_EXPIRES_IN),
    required: true,
  },
  EMAIL_VERIFICATION_URL: {
    description: 'Email verification URL template',
    value: String(process.env.EMAIL_VERIFICATION_URL),
    required: true,
  },

  // Two Factor Auth
  TWO_FACTOR_ISSUER: {
    description: 'Two-factor authentication issuer name',
    value: String(process.env.TWO_FACTOR_ISSUER),
    required: true,
  },
  TWO_FACTOR_WINDOW: {
    description: 'Two-factor authentication time window',
    value: Number(process.env.TWO_FACTOR_WINDOW),
    required: true,
  },

  // CORS
  CORS_ORIGIN: {
    description: 'CORS allowed origins',
    value: String(process.env.CORS_ORIGIN),
    required: true,
  },
  CORS_CREDENTIALS: {
    description: 'Allow credentials in CORS',
    value: String(process.env.CORS_CREDENTIALS) === 'true',
    required: true,
  },
  CORS_MAX_AGE: {
    description: 'CORS preflight cache duration',
    value: Number(process.env.CORS_MAX_AGE),
    required: true,
  },

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: {
    description: 'Rate limit time window in milliseconds',
    value: Number(process.env.RATE_LIMIT_WINDOW_MS),
    required: true,
  },
  RATE_LIMIT_MAX_REQUESTS: {
    description: 'Maximum requests per window',
    value: Number(process.env.RATE_LIMIT_MAX_REQUESTS),
    required: true,
  },
  RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS: {
    description: 'Skip successful requests from rate limiting',
    value: String(process.env.RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS) === 'true',
    required: true,
  },
  RATE_LIMIT_SKIP_FAILED_REQUESTS: {
    description: 'Skip failed requests from rate limiting',
    value: String(process.env.RATE_LIMIT_SKIP_FAILED_REQUESTS) === 'true',
    required: true,
  },

  // Logging
  LOG_LEVEL: {
    description: 'Application log level',
    value: String(process.env.LOG_LEVEL) as
      | 'error'
      | 'warn'
      | 'info'
      | 'http'
      | 'verbose'
      | 'debug'
      | 'silly',
    required: true,
  },
  LOG_FORMAT: {
    description: 'Log output format',
    value: String(process.env.LOG_FORMAT) as 'json' | 'simple' | 'combined',
    required: true,
  },
  LOG_FILE_PATH: {
    description: 'Log file output path',
    value: String(process.env.LOG_FILE_PATH),
    required: true,
  },
  LOG_FILE_MAX_SIZE: {
    description: 'Maximum log file size',
    value: String(process.env.LOG_FILE_MAX_SIZE),
    required: true,
  },
  LOG_FILE_MAX_FILES: {
    description: 'Maximum number of log files to keep',
    value: String(process.env.LOG_FILE_MAX_FILES),
    required: true,
  },

  // Email Provider
  EMAIL_PROVIDER: {
    description: 'Email service provider',
    value: String(process.env.EMAIL_PROVIDER) as 'mailhog' | 'mailgun' | 'smtp',
    required: true,
  },
  EMAIL_FROM_ADDRESS: {
    description: 'Default from email address',
    value: String(process.env.EMAIL_FROM_ADDRESS),
    required: true,
  },
  EMAIL_FROM_NAME: {
    description: 'Default from name',
    value: String(process.env.EMAIL_FROM_NAME),
    required: true,
  },
  EMAIL_REPLY_TO: {
    description: 'Reply-to email address',
    value: String(process.env.EMAIL_REPLY_TO),
    required: true,
  },

  // Mailhog Configuration
  MAILHOG_HOST: {
    description: 'Mailhog SMTP host',
    value: String(process.env.MAILHOG_HOST),
    required: true,
  },
  MAILHOG_PORT: {
    description: 'Mailhog SMTP port',
    value: Number(process.env.MAILHOG_PORT),
    required: true,
  },

  // Mailgun Configuration
  MAILGUN_API_KEY: {
    description: 'Mailgun API key',
    value: String(process.env.MAILGUN_API_KEY),
    required: true,
  },
  MAILGUN_DOMAIN: {
    description: 'Mailgun domain',
    value: String(process.env.MAILGUN_DOMAIN),
    required: true,
  },
  MAILGUN_REGION: {
    description: 'Mailgun region',
    value: String(process.env.MAILGUN_REGION) as 'US' | 'EU' | 'us' | 'eu',
    required: true,
  },
  MAILGUN_TEST_MODE: {
    description: 'Mailgun test mode',
    value: String(process.env.MAILGUN_TEST_MODE) === 'true',
    required: true,
  },
  MAILGUN_WEBHOOK_SIGNING_KEY: {
    description: 'Mailgun webhook signing key',
    value: String(process.env.MAILGUN_WEBHOOK_SIGNING_KEY),
    required: true,
  },

  // Storage Provider
  STORAGE_PROVIDER: {
    description: 'Storage service provider',
    value: String(process.env.STORAGE_PROVIDER) as
      | 'minio'
      | 'r2'
      | 's3'
      | 'local',
    required: true,
  },
  STORAGE_ENDPOINT: {
    description: 'Storage service endpoint',
    value: String(process.env.STORAGE_ENDPOINT),
    required: true,
  },
  STORAGE_MAX_FILE_SIZE: {
    description: 'Maximum file size in bytes',
    value: Number(process.env.STORAGE_MAX_FILE_SIZE),
    required: true,
  },
  STORAGE_ALLOWED_EXTENSIONS: {
    description: 'Allowed file extensions',
    value: String(process.env.STORAGE_ALLOWED_EXTENSIONS),
    required: true,
  },
  STORAGE_UPLOAD_URL_EXPIRES_IN: {
    description: 'Upload URL expiration in seconds',
    value: Number(process.env.STORAGE_UPLOAD_URL_EXPIRES_IN),
    required: true,
  },
  STORAGE_DOWNLOAD_URL_EXPIRES_IN: {
    description: 'Download URL expiration in seconds',
    value: Number(process.env.STORAGE_DOWNLOAD_URL_EXPIRES_IN),
    required: true,
  },

  // MinIO Configuration
  MINIO_ENDPOINT: {
    description: 'MinIO endpoint URL',
    value: String(process.env.MINIO_ENDPOINT),
    required: true,
  },
  MINIO_BUCKET: {
    description: 'MinIO bucket name',
    value: String(process.env.MINIO_BUCKET),
    required: true,
  },
  MINIO_REGION: {
    description: 'MinIO region',
    value: String(process.env.MINIO_REGION),
    required: true,
  },
  MINIO_ACCESS_KEY_ID: {
    description: 'MinIO access key',
    value: String(process.env.MINIO_ACCESS_KEY_ID),
    required: true,
  },
  MINIO_SECRET_ACCESS_KEY: {
    description: 'MinIO secret key',
    value: String(process.env.MINIO_SECRET_ACCESS_KEY),
    required: true,
  },

  // R2 Configuration
  R2_ENDPOINT: {
    description: 'Cloudflare R2 endpoint',
    value: String(process.env.R2_ENDPOINT),
    required: true,
  },
  R2_BUCKET: {
    description: 'R2 bucket name',
    value: String(process.env.R2_BUCKET),
    required: true,
  },
  R2_ACCOUNT_ID: {
    description: 'Cloudflare account ID',
    value: String(process.env.R2_ACCOUNT_ID),
    required: true,
  },
  R2_ACCESS_KEY_ID: {
    description: 'R2 access key',
    value: String(process.env.R2_ACCESS_KEY_ID),
    required: true,
  },
  R2_SECRET_ACCESS_KEY: {
    description: 'R2 secret key',
    value: String(process.env.R2_SECRET_ACCESS_KEY),
    required: true,
  },

  // S3 Configuration
  S3_ENDPOINT: {
    description: 'S3-compatible endpoint',
    value: String(process.env.S3_ENDPOINT),
    required: true,
  },
  S3_ACCESS_KEY_ID: {
    description: 'S3 access key',
    value: String(process.env.S3_ACCESS_KEY_ID),
    required: true,
  },
  S3_SECRET_ACCESS_KEY: {
    description: 'S3 secret key',
    value: String(process.env.S3_SECRET_ACCESS_KEY),
    required: true,
  },
  S3_BUCKET: {
    description: 'S3 bucket name',
    value: String(process.env.S3_BUCKET),
    required: true,
  },
  S3_REGION: {
    description: 'S3 region',
    value: String(process.env.S3_REGION),
    required: true,
  },

  // CDN Configuration
  CDN_BASE_URL: {
    description: 'CDN base URL',
    value: String(process.env.CDN_BASE_URL),
    required: true,
  },
  CDN_ENABLE: {
    description: 'Enable CDN',
    value: String(process.env.CDN_ENABLE) === 'true',
    required: true,
  },

  // Frontend URL
  FRONTEND_URL: {
    description: 'Frontend application URL',
    value: String(process.env.FRONTEND_URL),
    required: true,
  },

  // SMTP Configuration
  SMTP_HOST: {
    description: 'SMTP server host',
    value: String(process.env.SMTP_HOST),
    required: true,
  },
  SMTP_PORT: {
    description: 'SMTP server port',
    value: Number(process.env.SMTP_PORT),
    required: true,
  },
  SMTP_USER: {
    description: 'SMTP username',
    value: String(process.env.SMTP_USER),
    required: true,
  },
  SMTP_PASSWORD: {
    description: 'SMTP password',
    value: String(process.env.SMTP_PASSWORD),
    required: true,
  },
  SMTP_FROM: {
    description: 'SMTP from address',
    value: String(process.env.SMTP_FROM),
    required: true,
  },

  // Test Container Configuration
  TESTCONTAINERS_RYUK_DISABLED: {
    description: 'Disable Testcontainers Ryuk',
    value: String(process.env.TESTCONTAINERS_RYUK_DISABLED) === 'true',
    required: true,
  },
  DOCKER_CONFIG: {
    description: 'Docker configuration path',
    value: String(process.env.DOCKER_CONFIG),
    required: true,
  },

  // Database extras
  POSTGRES_DB: {
    description: 'Postgres database name',
    value: String(process.env.POSTGRES_DB),
    required: true,
  },
  POSTGRES_USER: {
    description: 'Postgres user',
    value: String(process.env.POSTGRES_USER),
    required: true,
  },
  POSTGRES_PASSWORD: {
    description: 'Postgres password',
    value: String(process.env.POSTGRES_PASSWORD),
    required: true,
  },
  POSTGRES_PORT: {
    description: 'Postgres port',
    value: String(process.env.POSTGRES_PORT),
    required: true,
  },
  DB_HOST: {
    description: 'Database host',
    value: String(process.env.DB_HOST),
    required: true,
  },
  DATABASE_POOL_SIZE: {
    description: 'Database pool size',
    value: Number(process.env.DATABASE_POOL_SIZE),
    required: true,
  },

  // External Service Ports
  MAILHOG_SMTP_PORT: {
    description: 'Mailhog SMTP port',
    value: String(process.env.MAILHOG_SMTP_PORT),
    required: true,
  },
  MAILHOG_WEB_PORT: {
    description: 'Mailhog web port',
    value: String(process.env.MAILHOG_WEB_PORT),
    required: true,
  },
  MINIO_API_PORT: {
    description: 'MinIO API port',
    value: String(process.env.MINIO_API_PORT),
    required: true,
  },
  MINIO_CONSOLE_PORT: {
    description: 'MinIO console port',
    value: String(process.env.MINIO_CONSOLE_PORT),
    required: true,
  },
} as const

// Export the environment value directly for convenience
export const environment = env.NODE_ENV.value

// Export convenience booleans
export const isProduction = environment === 'production'
export const isDevelopment = environment === 'development'
export const isTest = environment === 'test'
export const isStaging = environment === 'staging'
export const isLocalhost = environment === 'localhost'

// Type helper to extract the value type from the env object
export type EnvValue<K extends keyof typeof env> = (typeof env)[K]['value']

// Validate required environment variables at startup
export function validateEnv(): void {
  const missingVars: string[] = []

  for (const [key, config] of Object.entries(env)) {
    if (
      config.required &&
      (config.value === undefined || config.value === null)
    ) {
      missingVars.push(key)
    }
  }

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
        `Please check your .env.${environment} file`,
    )
  }
}
