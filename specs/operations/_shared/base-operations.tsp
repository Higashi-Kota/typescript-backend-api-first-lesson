import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi3";
import "../../models/_shared/common.tsp";
import "../../models/_shared/common-api-patterns.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.OpenAPI;
using BeautySalon.Models;

namespace BeautySalon.Operations {
  @doc("各リソースが共通で利用できる堅牢なCRUD操作セットを定義し、拡張しやすい土台を提供します。")
  interface CrudOperations<
    TEntity,
    TCreateRequest,
    TUpdateRequest,
    TListParams = CursorPaginationParams,
    TId = string
  > {
    @doc("ページネーションやフィルター条件を指定して対象リソースを一覧取得します。業務画面のリスト表示に利用します。")
    @summary("List {Name} resources")
    @get
    list(
      ...TListParams,
      @header("Authorization") authorization?: string,
    ): {
      @statusCode statusCode: 200;
      @body response: CursorPaginationResponse<TEntity>;
      ...RateLimitInfo;
    } | {
      @statusCode statusCode: 400;
      @body error: ProblemDetails;
    } | {
      @statusCode statusCode: 401;
      @body error: ProblemDetails;
    } | {
      @statusCode statusCode: 429;
      @body error: ProblemDetails;
      ...RateLimitInfo;
    };

    @doc("IDを指定して単一リソースを取得し、詳細表示や編集フォームの初期値に使用します。")
    @summary("Get {Name} by ID")
    @get
    get(
      @path id: TId,
      @query fields?: string,
      @header("Authorization") authorization?: string,
      @header("If-None-Match") ifNoneMatch?: string,
    ): {
      @statusCode statusCode: 200;
      @body response: ApiResponse<TEntity>;
      @header("ETag") etag: string;
      @header("Last-Modified") lastModified: string;
    } | {
      @statusCode statusCode: 304; // Not Modified
    } | {
      @statusCode statusCode: 404;
      @body error: ProblemDetails;
    } | {
      @statusCode statusCode: 401;
      @body error: ProblemDetails;
    };

    @doc("新規リソースを作成し、作成時のバリデーションや重複チェック結果を返却します。")
    @summary("Create new {Name}")
    @post
    create(
      @body request: TCreateRequest,
      @header("Authorization") authorization?: string,
      @header("Idempotency-Key") idempotencyKey?: string,
    ): {
      @statusCode statusCode: 201;
      @header("Location") location: string;
      @body response: ApiResponse<TEntity>;
    } | {
      @statusCode statusCode: 400;
      @body error: ProblemDetails;
    } | {
      @statusCode statusCode: 401;
      @body error: ProblemDetails;
    } | {
      @statusCode statusCode: 409;
      @body error: ProblemDetails;
    } | {
      @statusCode statusCode: 422;
      @body error: ProblemDetails;
    };

    @doc("既存リソースを全項目更新し、最新状態とバージョン情報を返却します。")
    @summary("Update {Name}")
    @put
    update(
      @path id: TId,
      @body request: TUpdateRequest,
      @header("Authorization") authorization?: string,
      @header("If-Match") ifMatch?: string,
    ): {
      @statusCode statusCode: 200;
      @body response: ApiResponse<TEntity>;
      @header("ETag") etag: string;
    } | {
      @statusCode statusCode: 400;
      @body error: ProblemDetails;
    } | {
      @statusCode statusCode: 401;
      @body error: ProblemDetails;
    } | {
      @statusCode statusCode: 404;
      @body error: ProblemDetails;
    } | {
      @statusCode statusCode: 409; // Conflict (version mismatch)
      @body error: ProblemDetails;
    } | {
      @statusCode statusCode: 422;
      @body error: ProblemDetails;
    };

    @doc("必要なフィールドのみを部分更新し、変更差分を効率的に反映します。")
    @summary("Partially update {Name}")
    @patch(#{implicitOptionality: true})
    patch(
      @path id: TId,
      @body request: TUpdateRequest,
      @header("Authorization") authorization?: string,
      @header("If-Match") ifMatch?: string,
      ...FieldMask,
    ): {
      @statusCode statusCode: 200;
      @body response: ApiResponse<TEntity>;
      @header("ETag") etag: string;
    } | {
      @statusCode statusCode: 400;
      @body error: ProblemDetails;
    } | {
      @statusCode statusCode: 401;
      @body error: ProblemDetails;
    } | {
      @statusCode statusCode: 404;
      @body error: ProblemDetails;
    } | {
      @statusCode statusCode: 409;
      @body error: ProblemDetails;
    } | {
      @statusCode statusCode: 422;
      @body error: ProblemDetails;
    };

    @doc("リソースを削除し、必要に応じて論理削除か物理削除かを選択します。")
    @summary("Delete {Name}")
    @delete
    delete(
      @path id: TId,
      @query permanent?: boolean = false,
      @header("Authorization") authorization?: string,
      @header("If-Match") ifMatch?: string,
    ): {
      @statusCode statusCode: 204;
    } | {
      @statusCode statusCode: 401;
      @body error: ProblemDetails;
    } | {
      @statusCode statusCode: 404;
      @body error: ProblemDetails;
    } | {
      @statusCode statusCode: 409;
      @body error: ProblemDetails;
    };
  }

  @doc("複数リソースをまとめて処理し、業務バッチや大量更新を効率化する操作群です。")
  interface BulkOperations<TEntity, TCreateRequest, TUpdateRequest, TId = string> {
    @doc("複数IDをまとめて取得し、一覧画面の遅延読み込みや外部連携に利用します。")
    @summary("Batch get {Name} resources")
    @post
    @route("batch/get")
    batchGet(
      @body request: BatchGetRequest,
      @header("Authorization") authorization?: string,
    ): {
      @statusCode statusCode: 200;
      @body response: ApiResponse<TEntity[]>;
    } | {
      @statusCode statusCode: 400;
      @body error: ProblemDetails;
    } | {
      @statusCode statusCode: 401;
      @body error: ProblemDetails;
    };

    @doc("複数リソースを一括作成し、結果を成功・失敗に分けて返却します。")
    @summary("Bulk create {Name} resources")
    @post
    @route("bulk")
    bulkCreate(
      @body request: BulkRequest<TCreateRequest>,
      @header("Authorization") authorization?: string,
      @header("Idempotency-Key") idempotencyKey?: string,
    ): {
      @statusCode statusCode: 207; // Multi-Status
      @body response: BulkResponse<TEntity>;
    } | {
      @statusCode statusCode: 400;
      @body error: ProblemDetails;
    } | {
      @statusCode statusCode: 401;
      @body error: ProblemDetails;
    };

    @doc("複数リソースの更新をまとめて受け付け、バージョン整合性を保ちながら処理します。")
    @summary("Bulk update {Name} resources")
    @put
    @route("bulk")
    bulkUpdate(
      @body request: BulkRequest<TUpdateRequest & { id: TId }>,
      @header("Authorization") authorization?: string,
    ): {
      @statusCode statusCode: 207;
      @body response: BulkResponse<TEntity>;
    } | {
      @statusCode statusCode: 400;
      @body error: ProblemDetails;
    } | {
      @statusCode statusCode: 401;
      @body error: ProblemDetails;
    };

    @doc("複数リソースを一括削除し、成功可否ごとの結果を返却します。")
    @summary("Bulk delete {Name} resources")
    @delete
    @route("bulk")
    bulkDelete(
      @body request: { ids: TId[]; permanent?: boolean },
      @header("Authorization") authorization?: string,
    ): {
      @statusCode statusCode: 207;
      @body response: BulkResponse<{ id: TId; deleted: boolean }>;
    } | {
      @statusCode statusCode: 400;
      @body error: ProblemDetails;
    } | {
      @statusCode statusCode: 401;
      @body error: ProblemDetails;
    };
  }

  @doc("高度な検索条件や集計を扱い、業務分析や顧客検索を柔軟に実現する操作群です。")
  interface SearchOperations<TEntity, TSearchParams = AdvancedSearchParams> {
    @doc("ファセットや複合条件を利用してリソースを検索し、結果と統計情報を返却します。")
    @summary("Search {Name} resources")
    @get
    @route("search")
    search(
      ...TSearchParams,
      @header("Authorization") authorization?: string,
    ): {
      @statusCode statusCode: 200;
      @body response: SearchResponse<TEntity>;
    } | {
      @statusCode statusCode: 400;
      @body error: ProblemDetails;
    } | {
      @statusCode statusCode: 401;
      @body error: ProblemDetails;
    };

    @doc("検索結果を指定形式でエクスポートし、帳票出力や外部共有に活用します。")
    @summary("Export {Name} search results")
    @post
    @route("export")
    export(
      @body request: {
        ...TSearchParams;
        format: "csv" | "json" | "excel";
        exportFields?: string[];
      },
      @header("Authorization") authorization?: string,
    ): {
      @statusCode statusCode: 202; // Accepted for async processing
      @header("Location") location: string;
      @body response: {
        jobId: string;
        status: "pending";
        estimatedTime?: int32;
      };
    } | {
      @statusCode statusCode: 400;
      @body error: ProblemDetails;
    } | {
      @statusCode statusCode: 401;
      @body error: ProblemDetails;
    };
  }

  @doc("操作履歴やバージョン管理を提供し、監査対応や変更追跡を可能にする操作群です。")
  interface AuditOperations<TEntity, TId = string> {
    @doc("対象リソースの監査履歴を取得し、変更者や変更内容を追跡します。")
    @summary("Get {Name} audit history")
    @get
    @route("{id}/history")
    getHistory(
      @path id: TId,
      ...CursorPaginationParams,
      @header("Authorization") authorization?: string,
    ): {
      @statusCode statusCode: 200;
      @body response: CursorPaginationResponse<AuditEntry>;
    } | {
      @statusCode statusCode: 401;
      @body error: ProblemDetails;
    } | {
      @statusCode statusCode: 404;
      @body error: ProblemDetails;
    };

    @doc("指定したバージョンのリソース状態を取得し、過去状態の確認や比較に利用します。")
    @summary("Get {Name} version")
    @get
    @route("{id}/versions/{version}")
    getVersion(
      @path id: TId,
      @path version: int32,
      @header("Authorization") authorization?: string,
    ): {
      @statusCode statusCode: 200;
      @body response: ApiResponse<TEntity>;
    } | {
      @statusCode statusCode: 401;
      @body error: ProblemDetails;
    } | {
      @statusCode statusCode: 404;
      @body error: ProblemDetails;
    };

    @doc("削除済みリソースを復元し、誤削除への迅速なリカバリを可能にします。")
    @summary("Restore deleted {Name}")
    @post
    @route("{id}/restore")
    restore(
      @path id: TId,
      @header("Authorization") authorization?: string,
    ): {
      @statusCode statusCode: 200;
      @body response: ApiResponse<TEntity>;
    } | {
      @statusCode statusCode: 401;
      @body error: ProblemDetails;
    } | {
      @statusCode statusCode: 404;
      @body error: ProblemDetails;
    } | {
      @statusCode statusCode: 409;
      @body error: ProblemDetails;
    };
  }

  @doc("監査ログ1件分の詳細を保持するモデルです。誰がいつどのような変更を行ったかを記録します。")
  model AuditEntry {
    @doc("Audit entry ID")
    id: string;

    @doc("Entity ID")
    entityId: string;

    @doc("Entity type")
    entity: string;

    @doc("Operation performed")
    operation: "create" | "update" | "delete" | "restore";

    @doc("User who performed the operation")
    userId: string;

    @doc("User display name")
    userName?: string;

    @doc("IP address")
    ipAddress?: string;

    @doc("User agent")
    userAgent?: string;

    @doc("Timestamp of the operation")
    timestamp: utcDateTime;

    @doc("Changes made")
    changes?: ChangeSet[];

    @doc("Entity snapshot before change")
    before?: unknown;

    @doc("Entity snapshot after change")
    after?: unknown;

    @doc("Additional metadata")
    metadata?: Record<unknown>;
  }

  model ChangeSet {
    @doc("Field that was changed")
    field: string;

    @doc("Previous value")
    oldValue?: unknown;

    @doc("New value")
    newValue?: unknown;
  }

  @doc("システム全体の状態監視やデプロイ確認に利用する運用系API操作群です。")
  @route("/api/system")
  @tag("System")
  namespace SystemOperations {
    @doc("APIが正常稼働しているかを判定し、監視ツールやロードバランサーから参照します。")
    @summary("Check API health")
    @get
    @route("health")
    op health(): {
      @statusCode statusCode: 200;
      @body response: HealthStatus;
    } | {
      @statusCode statusCode: 503;
      @body response: HealthStatus;
    };

    @doc("Kubernetes等のオーケストレーターがトラフィック受信可否を判断するための準備完了チェックです。")
    @summary("Check API readiness")
    @get
    @route("ready")
    op ready(): {
      @statusCode statusCode: 200;
      @body response: { ready: boolean };
    } | {
      @statusCode statusCode: 503;
      @body response: { ready: boolean; reason?: string };
    };

    @doc("プロセスが生存しているかを判定するエンドポイントで、異常時は再起動判定に利用されます。")
    @summary("Check API liveness")
    @get
    @route("alive")
    op alive(): {
      @statusCode statusCode: 200;
      @body response: { alive: true };
    };

    @doc("Prometheus形式のメトリクスを返却し、監視基盤での可視化やアラート設定に用います。")
    @summary("Get API metrics")
    @get
    @route("metrics")
    op metrics(
      @header("Authorization") authorization?: string,
    ): {
      @statusCode statusCode: 200;
      @body response: string; // Prometheus format
    } | {
      @statusCode statusCode: 401;
      @body error: ProblemDetails;
    };

    @doc("APIのバージョンやビルド情報を返し、障害解析やデプロイ確認に活用します。")
    @summary("Get API version")
    @get
    @route("version")
    op version(): {
      @statusCode statusCode: 200;
      @body response: {
        version: string;
        buildTime: utcDateTime;
        gitCommit?: string;
        gitBranch?: string;
        environment?: string;
      };
    };
  }
}
