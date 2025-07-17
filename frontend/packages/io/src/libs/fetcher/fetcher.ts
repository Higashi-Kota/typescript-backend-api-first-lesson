import { env } from '@beauty-salon-frontend/config'

// グローバル設定を管理するクラス
class FetchConfig {
  private baseURL: string
  private timeout: number
  private defaultHeaders: Record<string, string> = {}
  private headerProvider: (() => Record<string, string>) | null = null

  constructor() {
    this.baseURL = `${env.VITE_BACKEND_BASE_URL.value}/v1`
    this.timeout = 30000 // 30秒のタイムアウト
  }

  setAuthorizationHeader(token: string) {
    this.defaultHeaders.Authorization = `Bearer ${token}`
  }

  setGlobalHeaders(headers: Record<string, string>) {
    Object.assign(this.defaultHeaders, headers)
  }

  // 動的ヘッダープロバイダーを設定
  setHeaderProvider(provider: () => Record<string, string>) {
    this.headerProvider = provider
  }

  getBaseURL() {
    return this.baseURL
  }

  getTimeout() {
    return this.timeout
  }

  // ヘッダーを実行時に動的に取得
  getDefaultHeaders() {
    const staticHeaders = { ...this.defaultHeaders }
    const dynamicHeaders = this.headerProvider ? this.headerProvider() : {}
    return { ...staticHeaders, ...dynamicHeaders }
  }
}

// グローバルインスタンス
const fetchConfig = new FetchConfig()

// 動的ヘッダー用のストレージ
let currentAuthToken: string | null = null
let currentGlobalHeaders: Record<string, string> = {}

// ヘッダープロバイダーを設定
fetchConfig.setHeaderProvider(() => {
  const headers: Record<string, string> = { ...currentGlobalHeaders }
  if (currentAuthToken) {
    headers.Authorization = `Bearer ${currentAuthToken}`
  }
  return headers
})

// Axios互換のconfigインターフェース
interface FetchRequestConfig {
  url?: string
  method?: string
  baseURL?: string
  headers?: Record<string, string>
  // biome-ignore lint/suspicious/noExplicitAny: flexible data type for API requests
  data?: any
  // biome-ignore lint/suspicious/noExplicitAny: flexible params type for query strings
  params?: Record<string, any>
  timeout?: number
  signal?: AbortSignal
}

// キャンセル可能なPromise型
export interface CancellablePromise<T> extends Promise<T> {
  cancel: () => void
}

// URLパラメータを構築する関数
// biome-ignore lint/suspicious/noExplicitAny: flexible params type for URL building
const buildURL = (url: string, params?: Record<string, any>): string => {
  if (!params) return url

  const urlObj = new URL(url, fetchConfig.getBaseURL())
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      urlObj.searchParams.append(key, String(value))
    }
  }

  return urlObj.toString()
}

// タイムアウト処理付きfetch
const fetchWithTimeout = async (
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  // 既存のsignalとタイムアウト用のsignalを統合
  const existingSignal = options.signal
  if (existingSignal) {
    existingSignal.addEventListener('abort', () => controller.abort())
  }

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (controller.signal.aborted) {
      throw new Error('Request timeout')
    }
    throw error
  }
}

// Axios風のエラーハンドリング
class HTTPError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public response: Response
  ) {
    super(`HTTP Error: ${status} ${statusText}`)
    this.name = 'HTTPError'
  }
}

// orval互換のオーバーロード: 第一引数がstring（URL）の場合
export function customInstance<T>(
  url: string,
  options?: RequestInit
): CancellablePromise<T>
// 既存のインターフェース: 第一引数がFetchRequestConfigの場合
export function customInstance<T>(
  config: FetchRequestConfig,
  options?: FetchRequestConfig
): CancellablePromise<T>
// 実装
export function customInstance<T>(
  urlOrConfig: string | FetchRequestConfig,
  options?: RequestInit | FetchRequestConfig
): CancellablePromise<T> {
  const controller = new AbortController()

  // RequestInitをFetchRequestConfigに変換する関数
  const convertRequestInit = (
    init?: RequestInit | FetchRequestConfig
  ): FetchRequestConfig => {
    if (!init) return {}

    // FetchRequestConfigの場合はそのまま返す
    if ('url' in init || 'params' in init || 'baseURL' in init) {
      return init as FetchRequestConfig
    }

    // RequestInitの場合は変換
    const requestInit = init as RequestInit
    const config: FetchRequestConfig = {}

    if (requestInit.method) config.method = requestInit.method
    if (requestInit.headers) {
      // HeadersInitをRecord<string, string>に変換
      if (requestInit.headers instanceof Headers) {
        config.headers = {}
        requestInit.headers.forEach((value, key) => {
          if (config.headers != null) {
            config.headers[key] = value
          }
        })
      } else if (Array.isArray(requestInit.headers)) {
        config.headers = {}
        for (const [key, value] of requestInit.headers) {
          config.headers[key] = value
        }
      } else {
        config.headers = requestInit.headers as Record<string, string>
      }
    }
    if (requestInit.body) config.data = requestInit.body
    if (requestInit.signal) config.signal = requestInit.signal

    return config
  }

  // 第一引数がstringの場合、configオブジェクトに変換
  const config: FetchRequestConfig =
    typeof urlOrConfig === 'string'
      ? { url: urlOrConfig, ...convertRequestInit(options) }
      : urlOrConfig

  const mergedConfig = config
  const {
    url = '',
    method = 'GET',
    baseURL = fetchConfig.getBaseURL(),
    headers = {},
    data,
    params,
    timeout = fetchConfig.getTimeout(),
    signal,
  } = mergedConfig

  // URLを構築
  const fullURL = url.startsWith('http')
    ? buildURL(url, params)
    : buildURL(`${baseURL}${url}`, params)

  // この時点で動的にヘッダーを取得
  const mergedHeaders = {
    ...fetchConfig.getDefaultHeaders(), // 動的に評価される
    ...headers,
  }

  // リクエストボディを処理
  let body: string | FormData | undefined
  let finalHeaders = mergedHeaders

  if (data) {
    if (data instanceof FormData) {
      body = data
      // FormDataの場合、Content-Typeは自動設定されるので除外
      const { 'Content-Type': _, ...headersWithoutContentType } = mergedHeaders
      finalHeaders = headersWithoutContentType
    } else {
      body = JSON.stringify(data)
      if (!mergedHeaders['Content-Type']) {
        finalHeaders = {
          ...mergedHeaders,
          'Content-Type': 'application/json',
        }
      }
    }
  }

  // 既存のAbortSignalがある場合、それも監視
  if (signal) {
    signal.addEventListener('abort', () => controller.abort())
  }

  const fetchOptions: RequestInit = {
    method: method.toUpperCase(),
    headers: finalHeaders,
    body,
    signal: controller.signal,
  }

  const promise = fetchWithTimeout(fullURL, fetchOptions, timeout).then(
    async (response) => {
      if (!response.ok) {
        throw new HTTPError(response.status, response.statusText, response)
      }

      // レスポンスの Content-Type を確認
      const contentType = response.headers.get('content-type') || ''

      if (contentType.includes('application/json')) {
        return response.json()
      }
      if (contentType.includes('text/')) {
        return response.text()
      }
      return response.blob()
    }
  ) as CancellablePromise<T>

  // キャンセル機能を追加
  promise.cancel = () => {
    controller.abort()
  }

  return promise
}

export const setAuthorizationHeader = (token: string) => {
  currentAuthToken = token
}

export const setGlobalHeaders = (headers: Record<string, string>) => {
  currentGlobalHeaders = { ...currentGlobalHeaders, ...headers }
}

// Default export for orval
export default customInstance
