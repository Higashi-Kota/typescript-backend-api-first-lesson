/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MODE: 'production' | 'staging' | 'development' | 'test'
  readonly VITE_APP_TITLE: string
  readonly VITE_APP_VERSION: `${number}.${number}.${number}`
  readonly VITE_FRONTEND_BASE_URL: string
  readonly VITE_BACKEND_BASE_URL: string
}
