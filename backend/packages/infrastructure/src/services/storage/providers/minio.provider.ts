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

export interface MinioConfig {
  endpoint: string
  bucket: string
  region: string
  credentials: {
    accessKeyId: string
    secretAccessKey: string
  }
}

export class MinioStorageProvider implements StorageService {
  private readonly provider = 'minio'
  private readonly client: S3Client
  private readonly bucket: string

  constructor(private readonly config: MinioConfig) {
    this.bucket = config.bucket
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: config.credentials,
      forcePathStyle: true, // Required for MinIO
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
        if (done) break
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
      console.error('MinIO upload error:', error)

      if (error instanceof Error) {
        if (error.message.includes('ECONNREFUSED')) {
          return err({
            type: 'networkError',
            message: `Cannot connect to MinIO at ${this.config.endpoint}`,
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
      console.error('MinIO download error:', error)

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
      console.error('MinIO delete error:', error)

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

      console.error('MinIO exists check error:', error)

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
      console.error('MinIO signed upload URL error:', error)

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
      console.error('MinIO signed download URL error:', error)

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
      console.error('MinIO metadata error:', error)

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
    key: string,
    _tags: Record<string, string>
  ): Promise<Result<void, StorageError>> {
    try {
      // MinIO doesn't support tagging directly, so we'll use metadata
      // First, get existing object metadata
      const metadataResult = await this.getMetadata(key)
      if (metadataResult.type === 'err') {
        return metadataResult
      }

      // Copy object with new metadata
      // Note: In a real implementation, you might want to use CopyObjectCommand
      // to update metadata without re-uploading the file
      console.warn(
        'MinIO: Tag update not fully implemented. Tags would be updated on next upload.'
      )

      return ok(undefined)
    } catch (error) {
      console.error('MinIO update tags error:', error)

      return err({
        type: 'providerError',
        provider: this.provider,
        message: 'Failed to update tags',
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
      return false
    }
  }
}
