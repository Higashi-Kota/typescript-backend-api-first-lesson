import path from 'node:path'
import { config as dotenvConfig } from 'dotenv'
import { type EnvConfig, validateEnv } from './env.schema.js'

// Load environment variables from root .env file
dotenvConfig({ path: path.resolve(process.cwd(), '../../../.env') })

// Validate and export configuration
export const config: EnvConfig = validateEnv(process.env)

// Export specific configuration groups for convenience
export const serverConfig = {
  port: config.PORT,
  logLevel: config.LOG_LEVEL,
  nodeEnv: config.NODE_ENV,
} as const

export const databaseConfig = {
  url: config.DATABASE_URL,
  poolMin: config.DATABASE_POOL_MIN,
  poolMax: config.DATABASE_POOL_MAX,
} as const

export const jwtConfig = {
  secret: config.JWT_SECRET,
  expiresIn: config.JWT_EXPIRES_IN,
  accessTokenExpiryMinutes: config.JWT_ACCESS_TOKEN_EXPIRY_MINUTES,
  refreshTokenExpiryDays: config.JWT_REFRESH_TOKEN_EXPIRY_DAYS,
  issuer: config.JWT_ISSUER,
  audience: config.JWT_AUDIENCE,
} as const

export const corsConfig = {
  origin: config.CORS_ORIGIN,
  allowedOrigins: config.CORS_ALLOWED_ORIGINS?.split(',') ?? [
    config.CORS_ORIGIN,
  ],
} as const

export const emailConfig = {
  provider: config.EMAIL_PROVIDER,
  developmentMode: config.EMAIL_DEVELOPMENT_MODE,
  from: {
    email: config.FROM_EMAIL,
    name: config.FROM_NAME,
  },
  mailhog: {
    host: config.MAILHOG_HOST,
    port: config.MAILHOG_PORT,
  },
  mailgun: {
    apiKey: config.MAILGUN_API_KEY,
    domain: config.MAILGUN_DOMAIN,
  },
  smtp: {
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    user: config.SMTP_USER,
    password: config.SMTP_PASSWORD,
  },
} as const

export const storageConfig = {
  provider: config.STORAGE_PROVIDER,
  endpoint: config.STORAGE_ENDPOINT,
  bucket: config.STORAGE_BUCKET,
  region: config.STORAGE_REGION,
  credentials: {
    accessKeyId: config.STORAGE_ACCESS_KEY,
    secretAccessKey: config.STORAGE_SECRET_KEY,
  },
} as const

export const securityConfig = {
  argon2: {
    memoryCost: config.ARGON2_MEMORY_COST,
    timeCost: config.ARGON2_TIME_COST,
    parallelism: config.ARGON2_PARALLELISM,
    outputLength: config.ARGON2_OUTPUT_LENGTH,
  },
  password: {
    minLength: config.PASSWORD_MIN_LENGTH,
    maxLength: config.PASSWORD_MAX_LENGTH,
    requireUppercase: config.PASSWORD_REQUIRE_UPPERCASE,
    requireLowercase: config.PASSWORD_REQUIRE_LOWERCASE,
    requireDigit: config.PASSWORD_REQUIRE_DIGIT,
    requireSpecial: config.PASSWORD_REQUIRE_SPECIAL,
    checkCommon: config.PASSWORD_CHECK_COMMON,
  },
  encryptionKey: config.ENCRYPTION_KEY,
} as const

// Helper functions
export const isDevelopment = () => config.NODE_ENV === 'development'
export const isTest = () => config.NODE_ENV === 'test'
export const isStaging = () => config.NODE_ENV === 'staging'
export const isProduction = () => config.NODE_ENV === 'production'
