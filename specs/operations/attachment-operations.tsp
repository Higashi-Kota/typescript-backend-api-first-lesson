import "@typespec/http";
import "../models/attachment.tsp";
import "../models/common.tsp";

using TypeSpec.Http;

namespace BeautySalon.Operations;

/**
 * ファイルアップロード関連のAPI操作
 */
@route("/attachments")
@tag("Attachments")
interface AttachmentOperations {
  /**
   * ファイルの直接アップロード
   * JSONでファイル情報をアップロード
   */
  @post
  @route("/upload")
  uploadFile(
    @body body: Models.UploadAttachmentRequest,
  ): Models.Attachment | Models.Error;

  /**
   * 署名付きアップロードURLの取得
   * クライアントが直接ストレージにアップロードするためのURL
   */
  @post
  @route("/upload-url")
  getUploadUrl(@body request: Models.GetUploadUrlRequest):
    | Models.UploadUrlResponse
    | Models.Error
    | Models.Error
    | Models.Error;

  /**
   * 添付ファイルの一覧取得
   */
  @get
  list(
    @query salonId?: string,
    @query page?: int32 = 1,
    @query limit?: int32 = 20,
  ): Models.PaginatedAttachments | Models.Error;

  /**
   * 添付ファイル情報の取得
   */
  @get
  @route("/{attachmentId}")
  get(@path attachmentId: string):
    | Models.Attachment
    | Models.Error
    | Models.Error
    | Models.Error;

  /**
   * 署名付きダウンロードURLの取得
   */
  @get
  @route("/{attachmentId}/download-url")
  getDownloadUrl(@path attachmentId: string, @query inline?: boolean = false):
    | Models.DownloadUrlResponse
    | Models.Error
    | Models.Error
    | Models.Error;

  /**
   * 添付ファイルの削除
   */
  @delete
  @route("/{attachmentId}")
  delete(@path attachmentId: string):
    | void
    | Models.Error
    | Models.Error
    | Models.Error;

  /**
   * 共有リンクの作成
   */
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

  /**
   * 共有リンクの一覧取得
   */
  @get
  @route("/{attachmentId}/share-links")
  listShareLinks(@path attachmentId: string):
    | Models.ShareLink[]
    | Models.Error
    | Models.Error
    | Models.Error;

  /**
   * 共有リンクの削除
   */
  @delete
  @route("/share-links/{shareLinkId}")
  deleteShareLink(@path shareLinkId: string):
    | void
    | Models.Error
    | Models.Error
    | Models.Error;
}

/**
 * 共有リンクアクセス用のAPI（認証不要）
 */
@route("/share")
@tag("Share")
interface ShareOperations {
  /**
   * 共有リンクからファイル情報を取得
   */
  @get
  @route("/{shareToken}")
  getSharedFile(@path shareToken: string, @query password?: string):
    | Models.Attachment
    | Models.Error
    | Models.Error
    | Models.Error;

  /**
   * 共有リンクからダウンロードURLを取得
   */
  @get
  @route("/{shareToken}/download")
  downloadSharedFile(@path shareToken: string, @query password?: string):
    | Models.DownloadUrlResponse
    | Models.Error
    | Models.Error
    | Models.Error;
}
