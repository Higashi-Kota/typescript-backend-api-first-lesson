import "@typespec/http";
import "./_shared/common.tsp";

using TypeSpec.Http;

namespace BeautySalon.Models;

@doc("""
  ファイルタイプ区分 - アップロードされるファイルの種類を分類
  
  image: 画像 - 写真やイラスト等の画像ファイル（jpg, png, gif等）
  document: ドキュメント - PDF、Word、Excel等の文書ファイル
  other: その他 - 上記に分類されないファイル
  """)
enum FileType {
  image: "image",
  document: "document",
  other: "other",
}

@doc("サロンシステムで管理するアップロード済みファイルのメタ情報を表すモデル。")
model Attachment {
  @doc("添付ファイルを一意に識別するID。UUID形式。")
  id: string;

  @doc("オブジェクトストレージでファイルを参照するための内部キー。")
  key: string;

  @doc("利用者がアップロードした元のファイル名。")
  filename: string;

  @doc("ファイルのMIMEタイプ（Content-Type）。")
  content: string;

  @doc("ファイルサイズ（バイト単位）。")
  size: int32;

  @doc("ファイルの実体情報。ダウンロードや共有レスポンスで利用。")
  file: File;

  @doc("ファイルをアップロードしたユーザーID。")
  uploadedBy: string;

  @doc("ファイルが紐づくサロンID。任意項目。")
  salonId: string | null;

  @doc("必要に応じて付加情報を保持する任意メタデータ。")
  metadata: Record<unknown> | null;

  @doc("ラベリングや検索に利用するタグ情報のセット。")
  tags: Record<string> | null;

  @doc("ファイルがアップロードされた日時。")
  uploadedAt: utcDateTime;

  @doc("ファイル情報が最後に更新された日時。")
  updatedAt: utcDateTime;
}

@doc("マルチパートアップロードで添付ファイルを登録するためのリクエスト。")
model AttachmentCreateRequest {
  @doc("HTTPリクエストで送信されるファイル本体。")
  file: bytes;

  @doc("アップロード時に指定されたファイル名。")
  filename: string;

  @doc("ファイルのContent-Type。")
  content: string;

  @doc("ファイルを関連付けるサロンID。任意設定。")
  salonId: string | null;

  @doc("タグ情報を表すJSON文字列。任意設定。")
  tags: string | null;
}

@doc("外部ストレージへ直接アップロードするための署名付きURLを要求するリクエスト。")
model AttachmentUploadUrlGetRequest {
  @doc("アップロード予定のファイル名。")
  filename: string;

  @doc("アップロード予定ファイルのContent-Type。")
  content: string;

  @doc("アップロード予定ファイルのサイズ（バイト単位）。")
  size: int32;

  @doc("ファイルをひも付けるサロンID。任意設定。")
  salonId: string | null;
}

@doc("署名付きアップロードURLと関連情報を返すレスポンス。")
model AttachmentUploadUrlResponse {
  @doc("一時的に有効なアップロード用URL。")
  uploadUrl: string;

  @doc("生成されたストレージキー。アップロード完了後の識別に使用。")
  key: string;

  @doc("署名付きURLの有効期限。")
  expiresAt: utcDateTime;
}

@doc("添付ファイルをダウンロードするための署名付きURLを返すレスポンス。")
model AttachmentDownloadUrlResponse {
  @doc("一時的に有効なダウンロード用URL。")
  downloadUrl: string;

  @doc("署名付きURLの有効期限。")
  expiresAt: utcDateTime;
}

@doc("外部共有用に発行された添付ファイルの共有リンク情報。")
model ShareLink {
  @doc("共有リンクを一意に識別するID。")
  id: string;

  @doc("共有アクセス時に利用するトークン。")
  token: string;

  @doc("共有対象の添付ファイルID。")
  attachmentId: string;

  @doc("共有リンクの有効期限。任意設定。")
  expiresAt: utcDateTime | null;

  @doc("許可する最大ダウンロード回数。任意設定。")
  maxDownloads: int32 | null;

  @doc("これまでのダウンロード累計数。")
  downloadCount: int32;

  @doc("共有リンクがパスワード保護されているか。")
  hasPassword: boolean;

  @doc("アクセスを許可するメールアドレス一覧。任意設定。")
  allowedEmails: string[] | null;

  @doc("共有リンクを作成したユーザーID。")
  createdBy: string;

  @doc("共有リンクを作成した日時。")
  createdAt: utcDateTime;
}

@doc("添付ファイルの共有リンクを新規発行する際のリクエスト。")
model ShareLinkCreateRequest {
  @doc("共有リンクの有効期限。任意設定。")
  expiresAt: utcDateTime | null;

  @doc("許可する最大ダウンロード回数。任意設定。")
  maxDownloads: int32 | null;

  @doc("共有リンク保護用のパスワード。任意設定。")
  password: string | null;

  @doc("アクセスを許可するメールアドレス一覧。任意設定。")
  allowedEmails: string[] | null;
}

@doc("パスワード保護された共有リンクへアクセスする際のリクエスト。")
model ShareLinkAccessRequest {
  @doc("共有リンクのパスワード。保護されている場合に入力。")
  password: string | null;
}

@doc("添付ファイル一覧をページネーション付きで返すレスポンスモデル。")
model PaginatedAttachments {
  @doc("該当ページの添付ファイル配列。")
  items: Attachment[];

  @doc("全体の添付ファイル件数。")
  total: int32;

  @doc("現在のページ番号。")
  page: int32;

  @doc("1ページあたりの取得件数。")
  limit: int32;

  @doc("計算された総ページ数。")
  totalPages: int32;
}
