import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;
using TypeSpec.OpenAPI;

namespace BeautySalon.Models {
  @doc("""
  RFC 7807 に準拠した標準エラーレスポンスモデル。
  美容サロン予約システム全体で一貫したエラー情報を提供し、顧客・スタッフ双方の操作ログと連携する。
  """)
  model ProblemDetails {
    @doc("エラー種別を特定するための URI。参照することで関連ドキュメントに誘導できる。")
    type: string;

    @doc("ユーザーに短く要点を伝えるエラー概要メッセージ。")
    title: string;

    @doc("レスポンスに付与される HTTP ステータスコード。")
    status: int32;

    @doc("今回の発生状況に固有の詳細説明。サポート対応時の一次情報となる。")
    detail?: string;

    @doc("この事象を一意に識別するための URI。監査ログやダッシュボードと連携する。")
    instance?: string;

    @doc("システム全体で共有する機械判読可能なエラーコード。画面表示や分岐処理に使用する。")
    code: ErrorCodeType;

    @doc("フィールド単位の検証エラーなど、追加のエラー詳細情報一覧。")
    errors?: ValidationError[];

    @doc("障害調査や問い合わせで利用する相関 ID。リクエスト単位で一意。")
    correlationId?: string;

    @doc("エラー発生日時 (UTC)。サーバーログの検索キーとして使用する。")
    timestamp: utcDateTime;
  }

  @doc("""
  エラーコードタイプ区分 - 一貫したエラー処理のための標準化されたエラーコード

  // 認証・認可 (1xxx)
  1001: 認証必須 - アクセスには認証が必要
  1002: 無効な資格情報 - ユーザー名またはパスワードが不正
  1003: トークン期限切れ - 認証トークンが期限切れ
  1004: トークン無効 - 認証トークンが無効または破損
  1005: 権限不足 - 操作を実行する権限が不足
  1006: アカウントロック - アカウントがロックされている
  1007: 2要素認証必須 - 2要素認証の入力が必要

  // バリデーション (2xxx)
  2001: 検証失敗 - 入力データの検証に失敗
  2002: 不正な形式 - データ形式が不正
  2003: 必須フィールド欠落 - 必須フィールドが入力されていない
  2004: 範囲外の値 - 値が許可された範囲を超えている
  2005: 重複値 - 一意であるべき値が重複している

  // ビジネスロジック (3xxx)
  3001: リソース未検出 - 指定されたリソースが存在しない
  3002: リソース既存 - リソースが既に存在する
  3003: 操作不可 - 現在の状態では操作が許可されない
  3004: ビジネスルール違反 - ビジネスルールに違反している
  3005: 残高不足 - ポイントや残高が不足
  3006: 予約競合 - 予約時間が重複している
  3007: 容量超過 - 利用可能な容量を超えている

  // システム (4xxx)
  4001: 内部サーバーエラー - サーバー内部でエラーが発生
  4002: サービス利用不可 - サービスが一時的に利用できない
  4003: データベースエラー - データベース処理中にエラーが発生
  4004: 外部サービスエラー - 外部サービスでエラーが発生
  4005: レート制限超過 - APIレート制限を超えた
  """)
  enum ErrorCodeType {
    // 認証・認可 (1xxx)
    AUTHENTICATION_REQUIRED: "1001",
    INVALID_CREDENTIALS: "1002",
    TOKEN_EXPIRED: "1003",
    TOKEN_INVALID: "1004",
    INSUFFICIENT_PERMISSIONS: "1005",
    ACCOUNT_LOCKED: "1006",
    TWO_FACTOR_REQUIRED: "1007",

    // バリデーション (2xxx)
    VALIDATION_FAILED: "2001",
    INVALID_FORMAT: "2002",
    REQUIRED_FIELD_MISSING: "2003",
    VALUE_OUT_OF_RANGE: "2004",
    DUPLICATE_VALUE: "2005",

    // ビジネスロジック (3xxx)
    RESOURCE_NOT_FOUND: "3001",
    RESOURCE_ALREADY_EXISTS: "3002",
    OPERATION_NOT_ALLOWED: "3003",
    BUSINESS_RULE_VIOLATION: "3004",
    INSUFFICIENT_BALANCE: "3005",
    BOOKING_CONFLICT: "3006",
    CAPACITY_EXCEEDED: "3007",

    // システム (4xxx)
    INTERNAL_SERVER_ERROR: "4001",
    SERVICE_UNAVAILABLE: "4002",
    DATABASE_ERROR: "4003",
    EXTERNAL_SERVICE_ERROR: "4004",
    RATE_LIMIT_EXCEEDED: "4005",
  }

  @doc("""
  入力検証での失敗内容を表すモデル。
  画面入力フォームやAPI連携時のフィールド単位のエラー詳細を格納し、顧客やスタッフへのフィードバックに利用する。
  """)
  model ValidationError {
    @doc("検証に失敗したフィールドパス。ネストしたキーをドット記法で表現する。")
    field: string;

    @doc("違反した検証ルール名またはコード。")
    rule: string;

    @doc("ユーザーに提示する具体的なエラーメッセージ。")
    message: string;

    @doc("検証対象となった実際の値。セキュリティ観点で出力が許容される場合のみ利用する。")
    value?: unknown;

    @doc("期待される値や制約条件。入力補助やUI表示のガイダンスに使用する。")
    constraint?: unknown;
  }

  @doc("""
  カーソル方式のページネーション指定モデル。
  予約一覧や顧客検索など大量データを扱う画面で、連続的かつ高速に結果を取得するための共通クエリパラメータを定義する。
  """)
  model CursorPaginationParams {
    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("1ページあたりの取得件数上限 (1〜100)。指定が無い場合は既定値 20 を適用。")
    @minValue(1)
    @maxValue(100)
    limit?: int32 = 20;

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("次ページを指し示すカーソル。前回レスポンスの `meta.nextCursor` を設定する。")
    cursor?: string;

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("ソート対象フィールド。予約日時や作成日時など業務軸を指定する。")
    sortBy?: string;

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("ソート順序。`asc` は昇順、`desc` は降順を表す。")
    sortOrder?: "asc" | "desc" = "asc";
  }

  @doc("""
  オフセット方式のページネーション指定モデル。
  既存基盤や BI 連携でカーソル方式に移行できないケース向けの互換パラメータを提供する。
  """)
  model OffsetPaginationParams {
    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("1ページあたりの取得件数上限 (1〜100)。指定が無い場合は既定値 20 を適用。")
    @minValue(1)
    @maxValue(100)
    limit?: int32 = 20;

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("スキップする件数。リスト冒頭からのオフセット値を指定する。")
    @minValue(0)
    offset?: int32 = 0;

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("ソート対象フィールド。予約一覧や顧客一覧の表示順を決定する。")
    sortBy?: string;

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("ソート順序。`asc` は昇順、`desc` は降順を表す。")
    sortOrder?: "asc" | "desc" = "asc";
  }

  @doc("""
  カーソル方式のページネーションレスポンスモデル。
  `CursorPaginationParams` を受けたAPIが検索結果とページング状態をまとめて返却する際に利用する。
  """)
  model CursorPaginationResponse<T> {
    @doc("現在ページで取得したデータ配列。サロン一覧や予約履歴の実データを格納する。")
    data: T[];

    @doc("ページング状態を示すメタ情報。次ページの有無やカーソル値を含む。")
    meta: PaginationMeta;

    @doc("関連するページ遷移リンク。HATEOAS 連携や外部連携向けに利用する。")
    links: PaginationLinks;
  }

  @doc("""
  ページネーションに関する統計情報モデル。
  総件数やカーソル位置を保持し、フロントエンドの続き取得や無限スクロールの制御に利用する。
  """)
  model PaginationMeta {
    @doc("取得対象全体の総件数。件数計測ができない場合は null。")
    total: int32 | null;

    @doc("1ページあたりの取得件数。クエリパラメータ `limit` と一致する。")
    limit: int32;

    @doc("次ページが存在するかを示すフラグ。無限スクロールの継続判定に使用。")
    hasMore: boolean;

    @doc("現在ページのカーソル値。次リクエストで `cursor` に指定することで同位置から再開できる。")
    cursor: string | null;

    @doc("次ページを取得するためのカーソル値。存在しない場合は null。")
    nextCursor: string | null;

    @doc("前ページへ戻るためのカーソル値。戻り操作が不要な場合は null。")
    prevCursor: string | null;
  }

  @doc("""
  ページ遷移に利用するリンク情報モデル。
  API クライアントや外部連携がRESTフローで次・前のリソースを辿る際に利用する。
  """)
  model PaginationLinks {
    @doc("現在ページを指すリンク。")
    self: string;

    @doc("最初のページへのリンク。総件数が確定しない場合は null。")
    first: string | null;

    @doc("最後のページへのリンク。カーソル算出ができない場合は null。")
    last: string | null;

    @doc("次ページへのリンク。さらに結果がある場合のみ設定される。")
    next: string | null;

    @doc("前ページへのリンク。戻り操作が不要な場合は null。")
    prev: string | null;
  }

  @doc("""
  API 成功レスポンスの共通ラッパーモデル。
  サロン検索や予約登録など多様なユースケースで応答形式を統一し、クライアント実装を簡潔に保つ。
  """)
  model ApiResponse<T> {
    @doc("レスポンスの主体となるビジネスデータ。")
    data: T;

    @doc("リクエスト識別子やバージョン情報など共通メタデータ。")
    meta?: ResponseMeta;

    @doc("関連リソースや次アクションへのリンク情報。")
    links?: Record<string>;
  }

  @doc("""
  レスポンス共通メタデータモデル。
  問い合わせ対応やロギングで必要となる識別情報を保持する。
  """)
  model ResponseMeta {
    @doc("リクエストを一意に紐づける相関 ID。ログ横断調査に使用する。")
    correlationId: string;

    @doc("レスポンス生成日時 (UTC)。障害時のタイムライン整理に利用。")
    timestamp: utcDateTime;

    @doc("レスポンスを返却した API バージョン。")
    version: string;

    // その他のメタデータ
    ...Record<unknown>;
  }

  @doc("""
  一括処理のリクエストモデル。
  顧客データの一括更新や予約枠のまとめ登録など、複数レコードをまとめて処理する際に利用する。
  """)
  model BulkRequest<T> {
    @doc("処理対象となるアイテムの配列。1件以上100件以下に制限する。")
    @minItems(1)
    @maxItems(100)
    items: T[];

    @doc("途中でエラーが発生しても処理を継続するかどうか。既定は false。")
    continueOnError?: boolean = false;

    @doc("トランザクション内で一括処理を行うかどうか。既定は true。")
    transactional?: boolean = true;
  }

  @doc("""
  一括処理の結果を表すレスポンスモデル。
  成功・失敗の詳細と要約統計を返し、業務オペレーターの振り返りを支援する。
  """)
  model BulkResponse<TSuccess, TError = ProblemDetails> {
    @doc("正常に処理されたアイテムの一覧。ビジネス結果を含む。")
    succeeded: BulkSuccessItem<TSuccess>[];

    @doc("エラーとなったアイテムの一覧。問題の詳細を確認できる。")
    failed: BulkErrorItem<TError>[];

    @doc("処理件数や所要時間をまとめた統計情報。")
    summary: BulkSummary;
  }

  @doc("""
  一括処理で成功した単一アイテムの結果モデル。
  元リクエストにおける位置と処理結果を紐づける。
  """)
  model BulkSuccessItem<T> {
    @doc("元リクエスト内でのインデックス。0 始まり。")
    index: int32;

    @doc("処理後のビジネス結果。ID 付与や更新後の値などを含む。")
    result: T;
  }

  @doc("""
  一括処理で失敗した単一アイテムのエラーモデル。
  問題箇所を特定し再実行方針を検討する際に利用する。
  """)
  model BulkErrorItem<T = ProblemDetails> {
    @doc("元リクエスト内でのインデックス。0 始まり。")
    index: int32;

    @doc("発生したエラー詳細。既定では `ProblemDetails` を使用する。")
    error: T;
  }

  @doc("""
  一括処理全体の集計情報モデル。
  成功件数・失敗件数を俯瞰し、運用レポートに反映する。
  """)
  model BulkSummary {
    @doc("リクエストに含まれていたアイテム総数。")
    total: int32;

    @doc("成功したアイテム件数。")
    succeeded: int32;

    @doc("失敗したアイテム件数。")
    failed: int32;

    @doc("処理に要した時間 (ミリ秒)。バッチ最適化の指標。")
    duration: int32;
  }

  @doc("""
  ソフトデリート情報モデル。
  論理削除されたレコードの状態や削除理由を記録し、監査ログや復旧オペレーションに活用する。
  """)
  model SoftDelete {
    @doc("論理削除フラグ。true の場合は通常の検索結果から除外する。")
    isDeleted: boolean = false;

    @doc("削除操作が実行された日時 (UTC)。")
    deletedAt?: utcDateTime;

    @doc("削除操作を実施したユーザーID またはサービス名。")
    deletedBy?: string;

    @doc("削除理由や補足メモ。カスタマーサポート対応に利用する。")
    deletionReason?: string;
  }

  @doc("""
  監査情報モデル。
  レコードの作成・更新履歴を保持し、内部統制や変更追跡を実現する。
  """)
  model AuditTrail {
    @doc("レコード作成日時 (UTC)。")
    createdAt: utcDateTime;

    @doc("レコードを作成したユーザーID またはサービス名。")
    createdBy: string;

    @doc("最終更新日時 (UTC)。")
    updatedAt: utcDateTime;

    @doc("最後に更新したユーザーID またはサービス名。")
    updatedBy: string;

    @doc("楽観的ロックに使用するバージョン番号。")
    version: int32;

    // Soft delete information
    ...SoftDelete;
  }

  @doc("""
  フィールドマスク指定モデル。
  部分更新や取得フィールド制御を行う際に、対象フィールドをドット区切りで列挙する。
  """)
  model FieldMask {
    @doc("更新対象フィールドをカンマ区切りで列挙した文字列。例: `name,address.street`。")
    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @example("name,address.street,contactInfo.email")
    updateMask?: string;
  }

  @doc("""
  複数リソースをまとめて取得するリクエストモデル。
  顧客IDや予約IDを複数指定して最小回数のAPI呼び出しで情報を取得する用途に利用。 
  """)
  model BatchGetRequest {
    @doc("取得対象となるリソースIDの配列。1件以上100件以下。")
    @minItems(1)
    @maxItems(100)
    ids: string[];

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @doc("レスポンスに含めたいフィールドのカンマ区切りリスト。パフォーマンス最適化に活用する。")
    @query
    fields?: string;
  }

  @doc("""
  API ヘルスチェック結果モデル。
  監視基盤や運用ダッシュボードにシステム状態を提供し、早期異常検知を実現する。
  """)
  model HealthStatus {
    @doc("システム全体の稼働状態。`healthy` は正常、`degraded` は性能低下、`unhealthy` は停止を表す。")
    status: "healthy" | "degraded" | "unhealthy";

    @doc("稼働中の API バージョン。運用チームのバージョン管理に利用。")
    version: string;

    @doc("判定実行時点のサーバー時刻 (UTC)。")
    timestamp: utcDateTime;

    @doc("各内部サービスや依存コンポーネントのヘルスチェック結果一覧。")
    checks: HealthCheck[];

    @doc("監視環境固有の追加メタ情報。必要に応じてキーを拡張する。")
    metadata?: Record<unknown>;
  }

  @doc("""
  個別サービスのヘルスチェック結果モデル。
  外部サービス連携や内部マイクロサービスごとの状態を把握する。
  """)
  model HealthCheck {
    @doc("対象サービス名またはコンポーネント識別子。")
    name: string;

    @doc("対象サービスの稼働状態。`up` は正常、`down` は停止、`degraded` は部分的な性能低下を示す。")
    status: "up" | "down" | "degraded";

    @doc("ヘルスチェックに要した時間 (ミリ秒)。応答遅延の指標。")
    responseTime?: int32;

    @doc("停止時のエラーメッセージや原因メモ。")
    error?: string;

    @doc("監視対象固有の追加詳細。再試行回数や依存サービス名などを含める。")
    details?: Record<unknown>;
  }

  @doc("""
  高度な検索・絞り込みを行うための共通クエリパラメータ。
  サロン・スタッフ・顧客など複数ドメインで全文検索、属性フィルター、ファセット集計を一貫して扱うために利用する。
  """)
  model AdvancedSearchParams {
    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("全文検索キーワード。名称や説明文を横断的に検索する。")
    q?: string;

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("フィルター式。例: `status:active AND category:premium`。属性条件を組み合わせた絞り込みに使用。")
    filter?: string;

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("レスポンスに含めるフィールドのカンマ区切りリスト。データ転送量の最適化に活用。")
    fields?: string;

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("レスポンスから除外したいフィールドのカンマ区切りリスト。不要情報を除く場合に利用。")
    exclude?: string;

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("ファセット集計を有効化するかどうか。true で各項目の件数を集計する。")
    facets?: boolean = false;

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("集計対象とするファセットフィールドの一覧。カテゴリや価格帯などを指定する。")
    facetFields?: string[];

    ...CursorPaginationParams;
  }

  @doc("""
  検索結果とファセット集計をまとめたレスポンスモデル。
  キーワード検索の結果表示と、絞り込み条件の提示を同時に実現する。
  """)
  model SearchResponse<T> {
    @doc("検索でヒットした結果一覧。サロンカードやメニュー一覧に利用。")
    results: T[];

    @doc("検索条件や件数などのメタ情報。ページングやログ解析に活用する。")
    meta: SearchMeta;

    @doc("ファセット集計結果。各フィールドごとの件数分布を保持する。")
    facets?: Record<Facet[]>;
  }

  @doc("""
  検索処理に関するメタ情報モデル。
  件数や所要時間を記録し、UX 改善やパフォーマンス監視に利用する。
  """)
  model SearchMeta {
    @doc("検索条件に一致した総件数。")
    total: int32;

    @doc("利用された検索キーワード。ログ分析やABテストで活用する。")
    query?: string;

    @doc("適用されたフィルター一覧。ユーザー選択内容を表示する際に使用。")
    filters?: string[];

    @doc("検索処理に要した時間 (ミリ秒)。パフォーマンスKPIの指標。")
    duration: int32;

    @doc("関連度スコアの範囲。ランキング調整やチューニングに活用する。")
    scoreRange?: ScoreRange;
  }

  @doc("""
  検索結果の関連度スコア範囲を表すモデル。
  スコアの分布を把握し、しきい値設定を検討する際に利用する。
  """)
  model ScoreRange {
    @doc("関連度スコアの最小値。")
    min: float32;

    @doc("関連度スコアの最大値。")
    max: float32;
  }

  @doc("""
  ファセット集計の単一要素を表すモデル。
  カテゴリや価格帯などの値と、その件数を組みで保持する。
  """)
  model Facet {
    @doc("ファセットの値。例: `メンズ向け` や `個室あり`。")
    value: string;

    @doc("該当値に一致する件数。")
    count: int32;
  }

  @doc("""
  楽観的ロックを実現するためのバージョン管理モデル。
  エンティティの更新競合を検知し、整合性を担保する。
  """)
  model Versioned {
    @doc("HTTP ヘッダー `ETag` として返却するエンティティバージョン。")
    @header("ETag")
    etag?: string;

    @doc("内部的に管理するバージョン番号。更新ごとにインクリメントする。")
    version: int32;

    @doc("最終更新日時 (UTC)。キャッシュ制御や監査に利用。")
    lastModified: utcDateTime;
  }

  @doc("""
  レート制限に関する HTTP ヘッダ情報モデル。
  API 呼び出し頻度をクライアントに通知し、適切なリトライ制御を促す。
  """)
  model RateLimitInfo {
    @doc("一定期間内に許可されるリクエスト上限値。")
    @header("X-RateLimit-Limit")
    limit: int32;

    @doc("現在のウィンドウで残っているリクエスト回数。")
    @header("X-RateLimit-Remaining")
    remaining: int32;

    @doc("リミットがリセットされる時刻 (UNIX 時間)。")
    @header("X-RateLimit-Reset")
    reset: int32;

    @doc("レート制限に達した際に再試行可能となるまでの秒数。")
    @header("Retry-After")
    retryAfter?: int32;
  }
}
