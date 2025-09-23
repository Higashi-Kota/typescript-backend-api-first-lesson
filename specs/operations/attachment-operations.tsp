import "@typespec/http";
import "../models/attachment.tsp";
import "../models/common.tsp";

using TypeSpec.Http;

namespace BeautySalon.Operations;

@doc("サロン業務で扱う添付ファイルの登録・共有を統括するAPI操作群です。画像や書類を安全に保管し、スタッフと顧客の利便性を高めます。")
@route("/api/v1/attachments")
@tag("Attachments")
interface AttachmentOperations {
  @doc("スタッフが管理画面からファイル本体を直接アップロードし、予約記録や顧客カルテに紐づけるための操作です。")
  @post
  @route("/upload")
  uploadFile(
    @body body: Models.UploadAttachmentRequest,
  ): Models.Attachment | Models.Error;

  @doc("顧客やスタッフがブラウザから直接クラウドストレージへアップロードできるよう、短時間だけ有効な署名付きURLを発行します。")
  @post
  @route("/upload-url")
  getUploadUrl(@body request: Models.GetUploadUrlRequest):
    | Models.UploadUrlResponse
    | Models.Error
    | Models.Error
    | Models.Error;

  @doc("サロンまたは顧客単位で登録済みの添付ファイルを一覧し、施術履歴の確認や資料整理に活用します。")
  @get
  list(
    @query salonId?: string,
    @query page?: int32 = 1,
    @query limit?: int32 = 20,
  ): Models.PaginatedAttachments | Models.Error;

  @doc("指定した添付ファイルの詳細情報を取得し、プレビュー表示や関連予約の確認に用います。")
  @get
  @route("/{attachmentId}")
  get(@path attachmentId: string):
    | Models.Attachment
    | Models.Error
    | Models.Error
    | Models.Error;

  @doc("閲覧権限を持つ利用者がファイルを安全に取得できるよう、短時間有効なダウンロードURLを発行します。")
  @get
  @route("/{attachmentId}/download-url")
  getDownloadUrl(@path attachmentId: string, @query inline?: boolean = false):
    | Models.DownloadUrlResponse
    | Models.Error
    | Models.Error
    | Models.Error;

  @doc("不要になった添付ファイルを削除し、ストレージ容量の最適化と情報漏えいリスクの低減を図ります。")
  @delete
  @route("/{attachmentId}")
  delete(@path attachmentId: string):
    | void
    | Models.Error
    | Models.Error
    | Models.Error;

  @doc("施術前後の写真や資料を外部パートナーや顧客と共有するためのリンクを発行します。必要に応じてパスワード保護も適用します。")
  @post
  @route("/{attachmentId}/share-links")
  createShareLink(
    @path attachmentId: string,
    @body request: Models.CreateShareLinkRequest,
  ):
    | Models.ShareLink
    | Models.Error
    | Models.Error
    | Models.Error
    | Models.Error;

  @doc("対象ファイルに対して発行済みの共有リンクを一覧し、公開状況や有効期限の管理を行います。")
  @get
  @route("/{attachmentId}/share-links")
  listShareLinks(@path attachmentId: string):
    | Models.ShareLink[]
    | Models.Error
    | Models.Error
    | Models.Error;

  @doc("不要になった共有リンクを失効させ、アクセス制御を適切に保ちます。")
  @delete
  @route("/share-links/{shareLinkId}")
  deleteShareLink(@path shareLinkId: string):
    | void
    | Models.Error
    | Models.Error
    | Models.Error;
}

@doc("共有リンク経由で添付ファイルへアクセスするためのAPIセットです。ゲスト利用者の利便性を確保しつつ、アクセス制御を実現します。")
@route("/api/v1/share")
@tag("Share")
interface ShareOperations {
  @doc("共有リンクとパスワードを確認し、公開対象ファイルのメタ情報を閲覧者に提示します。")
  @get
  @route("/{shareToken}")
  getSharedFile(@path shareToken: string, @query password?: string):
    | Models.Attachment
    | Models.Error
    | Models.Error
    | Models.Error;

  @doc("共有リンク利用者が安全にファイル本体を取得できるよう、署名付きダウンロードURLを返却します。")
  @get
  @route("/{shareToken}/download")
  downloadSharedFile(@path shareToken: string, @query password?: string):
    | Models.DownloadUrlResponse
    | Models.Error
    | Models.Error
    | Models.Error;
}
