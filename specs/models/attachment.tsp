import "@typespec/http";
import "./common.tsp";

using TypeSpec.Http;

namespace BeautySalon.Models;

/**
 * ファイルタイプ
 */
enum FileType {
  image: "image",
  document: "document",
  other: "other",
}

/**
 * 添付ファイル情報
 */
model Attachment {
  /** 添付ファイルID (UUID) */
  id: string;

  /** ストレージキー */
  key: string;

  /** オリジナルファイル名 */
  filename: string;

  /** Content-Type */
  contentType: string;

  /** ファイルサイズ（バイト） */
  size: int32;

  /** ファイルタイプ */
  fileType: FileType;

  /** アップロードしたユーザーID */
  uploadedBy: string;

  /** 関連するサロンID（オプション） */
  salonId: string | null;

  /** メタデータ */
  metadata: Record<unknown> | null;

  /** タグ */
  tags: Record<string> | null;

  /** アップロード日時 */
  uploadedAt: utcDateTime;

  /** 更新日時 */
  updatedAt: utcDateTime;
}

/**
 * ファイルアップロードリクエスト（マルチパート）
 */
model UploadAttachmentRequest {
  /** ファイル本体 */
  file: bytes;

  /** ファイル名 */
  filename: string;

  /** Content-Type */
  contentType: string;

  /** サロンID（オプション） */
  salonId: string | null;

  /** タグ（オプション） */
  tags: string | null; // JSON string
}

/**
 * 署名付きアップロードURL取得リクエスト
 */
model GetUploadUrlRequest {
  /** ファイル名 */
  filename: string;

  /** Content-Type */
  contentType: string;

  /** ファイルサイズ（バイト） */
  size: int32;

  /** サロンID（オプション） */
  salonId: string | null;
}

/**
 * 署名付きアップロードURLレスポンス
 */
model UploadUrlResponse {
  /** 署名付きアップロードURL */
  uploadUrl: string;

  /** ストレージキー */
  key: string;

  /** URL有効期限 */
  expiresAt: utcDateTime;
}

/**
 * 署名付きダウンロードURL取得レスポンス
 */
model DownloadUrlResponse {
  /** 署名付きダウンロードURL */
  downloadUrl: string;

  /** URL有効期限 */
  expiresAt: utcDateTime;
}

/**
 * 共有リンク
 */
model ShareLink {
  /** 共有リンクID */
  id: string;

  /** 共有トークン */
  token: string;

  /** 添付ファイルID */
  attachmentId: string;

  /** 有効期限（オプション） */
  expiresAt: utcDateTime | null;

  /** 最大ダウンロード数（オプション） */
  maxDownloads: int32 | null;

  /** 現在のダウンロード数 */
  downloadCount: int32;

  /** パスワード保護 */
  hasPassword: boolean;

  /** 許可されたメールアドレス（オプション） */
  allowedEmails: string[] | null;

  /** 作成者ID */
  createdBy: string;

  /** 作成日時 */
  createdAt: utcDateTime;
}

/**
 * 共有リンク作成リクエスト
 */
model CreateShareLinkRequest {
  /** 有効期限（オプション） */
  expiresAt: utcDateTime | null;

  /** 最大ダウンロード数（オプション） */
  maxDownloads: int32 | null;

  /** パスワード（オプション） */
  password: string | null;

  /** 許可されたメールアドレス（オプション） */
  allowedEmails: string[] | null;
}

/**
 * 共有リンクアクセスリクエスト
 */
model AccessShareLinkRequest {
  /** パスワード（パスワード保護されている場合） */
  password?: string;
}

/**
 * ページネーション付き添付ファイル一覧
 */
model PaginatedAttachments {
  /** 添付ファイル一覧 */
  items: Attachment[];

  /** 合計件数 */
  total: int32;

  /** 現在のページ */
  page: int32;

  /** ページあたりの件数 */
  limit: int32;

  /** 総ページ数 */
  totalPages: int32;
}
