import { localStorage } from '@beauty-salon-frontend/stores'
import {
  isEmpty,
  isNullOrUndefined,
} from '@beauty-salon-frontend/utils/typeUtil'

interface CacheItem {
  id: string
  expiresAt: number
}

export type TokenCacheItem = CacheItem

interface CheckCacheType<T> {
  buffer: number
  expiryTime: number
  fetchFn: () => Promise<T | undefined>
}

type SessionState = {
  cacheKey: string
  cacheId: string | undefined
}

export class SessionManager<T extends CacheItem, U = undefined> {
  private readonly state: SessionState

  constructor(cacheKey: string) {
    this.state = {
      cacheKey,
      cacheId: undefined,
    }
  }

  getCacheId(): SessionState['cacheId'] {
    return this.state.cacheId
  }

  setCacheId(id: string | undefined): void {
    this.state.cacheId = id ?? ''
  }

  getCache(): T | null {
    const cache = localStorage.get<T>(this.state.cacheKey)

    return !isNullOrUndefined(cache) ? JSON.parse(String(cache)) : null
  }

  setCache(cache: T): void {
    localStorage.set(this.state.cacheKey, JSON.stringify(cache))
  }

  clearCache(): void {
    localStorage.remove(this.state.cacheKey)
  }

  isCacheExpired(buffer = 0): boolean {
    const cache = this.getCache()

    if (!cache) return true

    return Date.now() > cache.expiresAt - buffer
  }

  async checkCache({
    buffer,
    expiryTime,
    fetchFn,
  }: CheckCacheType<U>): Promise<void> {
    const cache = this.getCache()

    if (
      !this.isCacheExpired(buffer) &&
      !isNullOrUndefined(cache?.id) &&
      !isEmpty(cache.id)
    ) {
      this.setCacheId(cache.id)
    } else {
      await fetchFn()
      const id = this.getCacheId()
      if (!isNullOrUndefined(id)) {
        this.setCache({
          id,
          expiresAt: Date.now() + expiryTime,
        } as T)
      }
    }
  }
}
