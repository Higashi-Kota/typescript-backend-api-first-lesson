import type { StorageService } from '@beauty-salon-backend/domain'
import { storageConfig } from '../../config/index.js'
import { MinioStorageProvider } from './providers/minio.provider.js'
import { R2StorageProvider } from './providers/r2.provider.js'

export type StorageProvider = 'minio' | 'r2'

export function createStorageService(
  provider?: StorageProvider
): StorageService {
  const selectedProvider = provider ?? storageConfig.provider

  switch (selectedProvider) {
    case 'minio':
      return new MinioStorageProvider({
        endpoint: storageConfig.endpoint,
        bucket: storageConfig.bucket,
        region: storageConfig.region,
        credentials: storageConfig.credentials,
      })

    case 'r2': {
      // Extract account ID from endpoint if provided
      const accountId = storageConfig.endpoint.match(
        /https:\/\/([^.]+)\.r2\.cloudflarestorage\.com/
      )?.[1]

      return new R2StorageProvider({
        endpoint: storageConfig.endpoint,
        bucket: storageConfig.bucket,
        credentials: storageConfig.credentials,
        accountId,
      })
    }

    default:
      throw new Error(`Unknown storage provider: ${selectedProvider}`)
  }
}

export function createStorageServiceWithDefaults(): StorageService {
  try {
    return createStorageService()
  } catch (error) {
    console.error('Failed to create configured storage provider:', error)
    // Default to MinIO in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('Falling back to MinIO with default configuration')
      return new MinioStorageProvider({
        endpoint: 'http://localhost:9000',
        bucket: 'beauty-salon',
        region: 'us-east-1',
        credentials: {
          accessKeyId: 'minioadmin',
          secretAccessKey: 'minioadmin',
        },
      })
    }
    throw error
  }
}
