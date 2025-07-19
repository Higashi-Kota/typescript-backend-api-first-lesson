/**
 * Encryption Service
 * 機密情報の暗号化・復号化サービス
 * AES-256-GCMを使用した暗号化
 */

import {
  type CipherGCM,
  type DecipherGCM,
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scrypt,
} from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)

export class EncryptionService {
  private algorithm = 'aes-256-gcm'
  private saltLength = 32
  private tagLength = 16
  private ivLength = 16

  constructor(
    private masterKey: string,
    _keyDerivationIterations = 100000
  ) {
    if (!masterKey || masterKey.length < 32) {
      throw new Error('Master key must be at least 32 characters long')
    }
  }

  /**
   * データを暗号化
   * @param plaintext 平文データ
   * @returns 暗号化されたデータ（Base64形式）
   */
  async encrypt(plaintext: string): Promise<string> {
    try {
      // Salt、IVを生成
      const salt = randomBytes(this.saltLength)
      const iv = randomBytes(this.ivLength)

      // マスターキーから暗号化キーを導出
      const key = await this.deriveKey(salt)

      // 暗号化
      const cipher = createCipheriv(this.algorithm, key, iv) as CipherGCM
      const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
      ])

      // 認証タグを取得
      const authTag = cipher.getAuthTag()

      // Salt + IV + AuthTag + 暗号文を結合してBase64エンコード
      const combined = Buffer.concat([salt, iv, authTag, encrypted])
      return combined.toString('base64')
    } catch (error) {
      throw new Error(
        `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * データを復号化
   * @param encryptedData 暗号化されたデータ（Base64形式）
   * @returns 復号化されたデータ
   */
  async decrypt(encryptedData: string): Promise<string> {
    try {
      // Base64デコード
      const combined = Buffer.from(encryptedData, 'base64')

      // Salt、IV、AuthTag、暗号文を分離
      const salt = combined.slice(0, this.saltLength)
      const iv = combined.slice(
        this.saltLength,
        this.saltLength + this.ivLength
      )
      const authTag = combined.slice(
        this.saltLength + this.ivLength,
        this.saltLength + this.ivLength + this.tagLength
      )
      const encrypted = combined.slice(
        this.saltLength + this.ivLength + this.tagLength
      )

      // マスターキーから復号化キーを導出
      const key = await this.deriveKey(salt)

      // 復号化
      const decipher = createDecipheriv(this.algorithm, key, iv) as DecipherGCM
      decipher.setAuthTag(authTag)

      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ])

      return decrypted.toString('utf8')
    } catch (error) {
      throw new Error(
        `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * オブジェクトの特定フィールドを暗号化
   * @param obj 対象オブジェクト
   * @param fields 暗号化するフィールド名の配列
   * @returns 暗号化されたオブジェクト
   */
  async encryptFields<T extends Record<string, unknown>>(
    obj: T,
    fields: (keyof T)[]
  ): Promise<T> {
    const encrypted = { ...obj }

    for (const field of fields) {
      if (encrypted[field] !== undefined && encrypted[field] !== null) {
        const value = String(encrypted[field])
        encrypted[field] = (await this.encrypt(value)) as T[keyof T]
      }
    }

    return encrypted
  }

  /**
   * オブジェクトの特定フィールドを復号化
   * @param obj 対象オブジェクト
   * @param fields 復号化するフィールド名の配列
   * @returns 復号化されたオブジェクト
   */
  async decryptFields<T extends Record<string, unknown>>(
    obj: T,
    fields: (keyof T)[]
  ): Promise<T> {
    const decrypted = { ...obj }

    for (const field of fields) {
      if (decrypted[field] !== undefined && decrypted[field] !== null) {
        try {
          const value = String(decrypted[field])
          decrypted[field] = (await this.decrypt(value)) as T[keyof T]
        } catch (error) {
          // 復号化に失敗した場合は元の値を保持（既に平文の可能性）
          console.error(
            `Failed to decrypt field ${String(field)}: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
        }
      }
    }

    return decrypted
  }

  /**
   * マスターキーから暗号化キーを導出
   * @param salt ソルト
   * @returns 導出されたキー
   */
  private async deriveKey(salt: Buffer): Promise<Buffer> {
    const key = (await scryptAsync(this.masterKey, salt, 32)) as Buffer
    return key
  }

  /**
   * 暗号化されたデータかどうかを検証
   * @param data チェックするデータ
   * @returns 暗号化されているかどうか
   */
  isEncrypted(data: string): boolean {
    try {
      const decoded = Buffer.from(data, 'base64')
      // 最小限のサイズチェック（Salt + IV + AuthTag + 最低1バイトの暗号文）
      return (
        decoded.length >= this.saltLength + this.ivLength + this.tagLength + 1
      )
    } catch {
      return false
    }
  }
}

// シングルトンインスタンスを作成
let encryptionService: EncryptionService | null = null

/**
 * 暗号化サービスの初期化
 * @param masterKey マスターキー
 * @param iterations PBKDF2のイテレーション回数
 */
export function initializeEncryptionService(
  masterKey: string,
  iterations?: number
): void {
  encryptionService = new EncryptionService(masterKey, iterations)
}

/**
 * 暗号化サービスのインスタンスを取得
 * @returns 暗号化サービス
 */
export function getEncryptionService(): EncryptionService {
  if (!encryptionService) {
    throw new Error(
      'Encryption service not initialized. Call initializeEncryptionService first.'
    )
  }
  return encryptionService
}
