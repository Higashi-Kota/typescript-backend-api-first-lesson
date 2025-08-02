import { randomUUID } from 'node:crypto'
import type { Readable } from 'node:stream'
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  type PutObjectCommandInput,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type {
  FileMetadata,
  FileType,
  Result,
  SignedUrlOptions,
  SignedUrlResult,
  StorageError,
  StorageObject,
  StorageService,
  UploadFileInput,
  UploadResult,
} from '@beauty-salon-backend/domain'
import { AttachmentId, err, ok } from '@beauty-salon-backend/domain'

export interface R2Config {
  endpoint: string
  bucket: string
  credentials: {
    accessKeyId: string
    secretAccessKey: string
  }
  accountId?: string
}

export class R2StorageProvider implements StorageService {
  private readonly provider = 'r2'
  private readonly client: S3Client
  private readonly bucket: string

  constructor(private readonly config: R2Config) {
    this.bucket = config.bucket

    // Cloudflare R2 endpoint format
    const endpoint =
      config.endpoint || `https://${config.accountId}.r2.cloudflarestorage.com`

    this.client = new S3Client({
      endpoint,
      region: 'auto', // R2 always uses 'auto'
      credentials: config.credentials,
    })
  }

  private generateKey(filename: string, path?: string): string {
    const uuid = randomUUID()
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
    const key = path
      ? `${path}/${uuid}/${sanitizedFilename}`
      : `${uuid}/${sanitizedFilename}`
    return key
  }

  private async streamToBuffer(
    stream: ReadableStream | Buffer
  ): Promise<Buffer> {
    if (Buffer.isBuffer(stream)) {
      return stream
    }

    const chunks: Uint8Array[] = []
    const reader = stream.getReader()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          break
        }
        chunks.push(value)
      }
      return Buffer.concat(chunks)
    } finally {
      reader.releaseLock()
    }
  }

  async upload(
    input: UploadFileInput
  ): Promise<Result<UploadResult, StorageError>> {
    try {
      const key = this.generateKey(input.metadata.filename, input.path)
      const buffer = await this.streamToBuffer(input.file)

      const putObjectInput: PutObjectCommandInput = {
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: input.metadata.contentType,
        ContentLength: input.metadata.size,
        Metadata: {
          originalFilename: input.metadata.filename,
          fileType: input.metadata.type,
          ...(input.tags || {}),
        },
      }

      await this.client.send(new PutObjectCommand(putObjectInput))

      const result: UploadResult = {
        id: AttachmentId.create(randomUUID()),
        key,
        url: `${this.config.endpoint}/${this.bucket}/${key}`,
        size: input.metadata.size,
        uploadedAt: new Date(),
      }

      return ok(result)
    } catch (error) {
      console.error('R2 upload error:', error)

      if (error instanceof Error) {
        if (error.message.includes('ECONNREFUSED')) {
          return err({
            type: 'networkError',
            message: 'Cannot connect to Cloudflare R2',
          })
        }

        if (error.message.includes('InvalidAccessKeyId')) {
          return err({
            type: 'accessDenied',
            reason: 'Invalid R2 access credentials',
          })
        }

        return err({
          type: 'providerError',
          provider: this.provider,
          message: error.message,
        })
      }

      return err({
        type: 'providerError',
        provider: this.provider,
        message: 'Unknown error occurred during upload',
      })
    }
  }

  async download(
    key: string
  ): Promise<Result<{ data: Buffer; metadata: FileMetadata }, StorageError>> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })

      const response = await this.client.send(command)

      if (!response.Body) {
        return err({
          type: 'notFound',
          key,
        })
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = []
      const stream = response.Body as Readable

      for await (const chunk of stream) {
        chunks.push(chunk)
      }

      const buffer = Buffer.concat(chunks)

      const metadata: FileMetadata = {
        filename:
          response.Metadata?.originalFilename ??
          key.split('/').pop() ??
          'unknown',
        contentType: response.ContentType ?? 'application/octet-stream',
        size: response.ContentLength ?? buffer.length,
        type: (response.Metadata?.fileType as unknown as FileType) ?? 'other',
      }

      return ok({ data: buffer, metadata })
    } catch (error) {
      console.error('R2 download error:', error)

      if (
        (error as { name?: string })?.name === 'NoSuchKey' ||
        (error as { $metadata?: { httpStatusCode?: number } })?.$metadata
          ?.httpStatusCode === 404
      ) {
        return err({
          type: 'notFound',
          key,
        })
      }

      return err({
        type: 'providerError',
        provider: this.provider,
        message:
          (error as { message?: string })?.message ||
          'Unknown error occurred during download',
      })
    }
  }

  async delete(key: string): Promise<Result<void, StorageError>> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      )

      return ok(undefined)
    } catch (error) {
      console.error('R2 delete error:', error)

      if (
        (error as { name?: string })?.name === 'NoSuchKey' ||
        (error as { $metadata?: { httpStatusCode?: number } })?.$metadata
          ?.httpStatusCode === 404
      ) {
        // Treat as success if already deleted
        return ok(undefined)
      }

      return err({
        type: 'providerError',
        provider: this.provider,
        message:
          (error as { message?: string })?.message ||
          'Unknown error occurred during deletion',
      })
    }
  }

  async exists(key: string): Promise<Result<boolean, StorageError>> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      )

      return ok(true)
    } catch (error) {
      if (
        (error as { name?: string })?.name === 'NoSuchKey' ||
        (error as { $metadata?: { httpStatusCode?: number } })?.$metadata
          ?.httpStatusCode === 404
      ) {
        return ok(false)
      }

      console.error('R2 exists check error:', error)

      return err({
        type: 'providerError',
        provider: this.provider,
        message:
          (error as { message?: string })?.message ||
          'Unknown error occurred during existence check',
      })
    }
  }

  async getSignedUploadUrl(
    key: string,
    options?: SignedUrlOptions
  ): Promise<Result<SignedUrlResult, StorageError>> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })

      const expiresIn = options?.expiresIn ?? 3600 // 1 hour default
      const url = await getSignedUrl(this.client, command, { expiresIn })

      return ok({
        url,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
      })
    } catch (error) {
      console.error('R2 signed upload URL error:', error)

      return err({
        type: 'providerError',
        provider: this.provider,
        message: 'Failed to generate signed upload URL',
      })
    }
  }

  async getSignedDownloadUrl(
    key: string,
    options?: SignedUrlOptions
  ): Promise<Result<SignedUrlResult, StorageError>> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ResponseContentDisposition: options?.contentDisposition
          ? `${options.contentDisposition}; filename="${options.filename || key.split('/').pop()}"`
          : undefined,
      })

      const expiresIn = options?.expiresIn ?? 3600 // 1 hour default
      const url = await getSignedUrl(this.client, command, { expiresIn })

      return ok({
        url,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
      })
    } catch (error) {
      console.error('R2 signed download URL error:', error)

      return err({
        type: 'providerError',
        provider: this.provider,
        message: 'Failed to generate signed download URL',
      })
    }
  }

  async getMetadata(key: string): Promise<Result<StorageObject, StorageError>> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })

      const response = await this.client.send(command)

      const metadata: FileMetadata = {
        filename:
          response.Metadata?.originalFilename ??
          key.split('/').pop() ??
          'unknown',
        contentType: response.ContentType ?? 'application/octet-stream',
        size: response.ContentLength ?? 0,
        type: (response.Metadata?.fileType as unknown as FileType) ?? 'other',
      }

      const storageObject: StorageObject = {
        id: AttachmentId.create(
          response.Metadata?.attachmentId || randomUUID()
        ),
        key,
        metadata,
        uploadedAt: response.LastModified || new Date(),
        tags: response.Metadata,
      }

      return ok(storageObject)
    } catch (error) {
      console.error('R2 metadata error:', error)

      if (
        (error as { name?: string })?.name === 'NoSuchKey' ||
        (error as { $metadata?: { httpStatusCode?: number } })?.$metadata
          ?.httpStatusCode === 404
      ) {
        return err({
          type: 'notFound',
          key,
        })
      }

      return err({
        type: 'providerError',
        provider: this.provider,
        message:
          (error as { message?: string })?.message ||
          'Unknown error occurred while fetching metadata',
      })
    }
  }

  async updateTags(
    _key: string,
    _tags: Record<string, string>
  ): Promise<Result<void, StorageError>> {
    try {
      // R2 doesn't support object tagging directly
      // Tags are stored as metadata during upload
      console.warn(
        'R2: Tag update not supported. Tags must be set during upload.'
      )

      return ok(undefined)
    } catch (error) {
      console.error('R2 update tags error:', error)

      return err({
        type: 'providerError',
        provider: this.provider,
        message: 'Tag updates are not supported in R2',
      })
    }
  }

  getProvider(): string {
    return this.provider
  }

  async isHealthy(): Promise<boolean> {
    try {
      // Try to list objects with limit 1 to check connectivity
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: '.health-check',
        })
      )
      return true
    } catch (error) {
      // If bucket exists but key doesn't, that's still healthy
      if (
        (error as { name?: string })?.name === 'NoSuchKey' ||
        (error as { $metadata?: { httpStatusCode?: number } })?.$metadata
          ?.httpStatusCode === 404
      ) {
        return true
      }
      // Check for access denied which means connection is OK but credentials might be wrong
      if ((error as { name?: string })?.name === 'AccessDenied') {
        console.warn('R2 health check: Access denied - check credentials')
        return false
      }
      return false
    }
  }
}
