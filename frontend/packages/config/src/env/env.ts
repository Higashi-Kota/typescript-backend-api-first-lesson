export type RuntimeMode =
  | 'production'
  | 'staging'
  | 'development'
  | 'test'
  | 'localhost'

export const env = {
  VITE_MODE: {
    /**
     * @see https://vitejs.dev/guide/env-and-mode.html#modes
     */
    description: '実行時のモードになります',
    value: import.meta.env.MODE as RuntimeMode,
  },
  VITE_APP_TITLE: {
    description: 'アプリ名になります',
    value: String(import.meta.env.VITE_APP_TITLE),
  },
  VITE_APP_VERSION: {
    description: 'アプリのバージョンになります',
    value: import.meta.env.VITE_APP_VERSION as `${number}.${number}.${number}`,
  },
  VITE_FRONTEND_BASE_URL: {
    description: 'フロントエンドのベースURLになります',
    value: String(import.meta.env.VITE_FRONTEND_BASE_URL),
  },
  VITE_BACKEND_BASE_URL: {
    description: 'バックエンドのベースURLになります',
    value: String(import.meta.env.VITE_BACKEND_BASE_URL),
  },
} as const
