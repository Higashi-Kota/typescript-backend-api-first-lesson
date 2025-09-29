/// <reference types="node" />

declare namespace NodeJS {
  interface ProcessEnv {
    // Node Environment (Required)
    readonly NODE_ENV:
      | 'production'
      | 'staging'
      | 'development'
      | 'test'
      | 'localhost'
    readonly PORT: string
    readonly HOST: string
    readonly API_PREFIX: string
    readonly API_VERSION: string

    // Database Configuration (Required)
    readonly DATABASE_URL: string
    readonly DATABASE_POOL_MIN: string
    readonly DATABASE_POOL_MAX: string
    readonly DATABASE_POOL_SIZE: string
    readonly DATABASE_CONNECTION_TIMEOUT: string
    readonly POSTGRES_DB: string
    readonly POSTGRES_USER: string
    readonly POSTGRES_PASSWORD: string
    readonly POSTGRES_PORT: string
    readonly DB_HOST: string

    // JWT & Authentication (Required)
    readonly JWT_SECRET: string
    readonly JWT_EXPIRES_IN: string
    readonly JWT_REFRESH_SECRET: string
    readonly JWT_REFRESH_EXPIRES_IN: string

    // Session (Required)
    readonly SESSION_SECRET: string
    readonly SESSION_COOKIE_NAME: string
    readonly SESSION_COOKIE_MAX_AGE: string
    readonly SESSION_COOKIE_SECURE: string
    readonly SESSION_COOKIE_SAME_SITE: 'strict' | 'lax' | 'none'

    // Security (Required)
    readonly BCRYPT_ROUNDS: string
    readonly ENCRYPTION_KEY: string
    readonly CSRF_SECRET: string

    // Password Reset (Required)
    readonly PASSWORD_RESET_TOKEN_EXPIRES_IN: string
    readonly PASSWORD_RESET_URL: string

    // Email Verification (Required)
    readonly EMAIL_VERIFICATION_TOKEN_EXPIRES_IN: string
    readonly EMAIL_VERIFICATION_URL: string

    // Two Factor Auth (Required)
    readonly TWO_FACTOR_ISSUER: string
    readonly TWO_FACTOR_WINDOW: string

    // CORS (Required)
    readonly CORS_ORIGIN: string
    readonly CORS_CREDENTIALS: string
    readonly CORS_MAX_AGE: string

    // Rate Limiting (Required)
    readonly RATE_LIMIT_WINDOW_MS: string
    readonly RATE_LIMIT_MAX_REQUESTS: string
    readonly RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS: string
    readonly RATE_LIMIT_SKIP_FAILED_REQUESTS: string

    // Logging (Required)
    readonly LOG_LEVEL: string
    readonly LOG_FORMAT: string
    readonly LOG_FILE_PATH: string
    readonly LOG_FILE_MAX_SIZE: string
    readonly LOG_FILE_MAX_FILES: string

    // Email Provider (Required)
    readonly EMAIL_PROVIDER: 'mailhog' | 'mailgun' | 'smtp'
    readonly EMAIL_FROM_ADDRESS: string
    readonly EMAIL_FROM_NAME: string
    readonly EMAIL_REPLY_TO: string
    readonly MAILHOG_HOST: string
    readonly MAILHOG_PORT: string
    readonly MAILGUN_API_KEY: string
    readonly MAILGUN_DOMAIN: string
    readonly MAILGUN_REGION: string
    readonly MAILGUN_TEST_MODE: string
    readonly MAILGUN_WEBHOOK_SIGNING_KEY: string

    // Storage Provider (Required)
    readonly STORAGE_PROVIDER: string
    readonly MINIO_ENDPOINT: string
    readonly MINIO_BUCKET: string
    readonly MINIO_REGION: string
    readonly MINIO_ACCESS_KEY_ID: string
    readonly MINIO_SECRET_ACCESS_KEY: string
    readonly R2_ENDPOINT: string
    readonly R2_BUCKET: string
    readonly R2_ACCOUNT_ID: string
    readonly R2_ACCESS_KEY_ID: string
    readonly R2_SECRET_ACCESS_KEY: string
    readonly STORAGE_ENDPOINT: string
    readonly STORAGE_MAX_FILE_SIZE: string
    readonly STORAGE_ALLOWED_EXTENSIONS: string
    readonly STORAGE_UPLOAD_URL_EXPIRES_IN: string
    readonly STORAGE_DOWNLOAD_URL_EXPIRES_IN: string

    // External Service Ports (Required)
    readonly MAILHOG_SMTP_PORT: string
    readonly MAILHOG_WEB_PORT: string
    readonly MINIO_API_PORT: string
    readonly MINIO_CONSOLE_PORT: string

    // CDN Configuration (Required)
    readonly CDN_BASE_URL: string
    readonly CDN_ENABLE: string

    // Frontend URL (Required)
    readonly FRONTEND_URL: string

    // SMTP Configuration (Required)
    readonly SMTP_HOST: string
    readonly SMTP_PORT: string
    readonly SMTP_USER: string
    readonly SMTP_PASSWORD: string
    readonly SMTP_FROM: string

    // S3 Storage Configuration (Required)
    readonly S3_ENDPOINT: string
    readonly S3_ACCESS_KEY_ID: string
    readonly S3_SECRET_ACCESS_KEY: string
    readonly S3_BUCKET: string
    readonly S3_REGION: string

    // Test Container Configuration (Required)
    readonly TESTCONTAINERS_RYUK_DISABLED: string
    readonly DOCKER_CONFIG: string
  }
}
