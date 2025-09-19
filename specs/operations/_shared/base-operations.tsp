import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi3";
import "../../models/common.tsp";
import "../../models/_shared/common-api-patterns.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.OpenAPI;
using BeautySalon.Models;

namespace BeautySalon.Operations {
  /**
   * Base interface for CRUD operations with comprehensive error handling
   * Provides standard endpoints that can be extended by specific resources
   */
  @doc("Standard CRUD operations interface")
  interface CrudOperations<
    TEntity,
    TCreateRequest,
    TUpdateRequest,
    TListParams = CursorPaginationParams,
    TId = string
  > {
    /**
     * List resources with pagination and filtering
     */
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

    /**
     * Get a single resource by ID
     */
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

    /**
     * Create a new resource
     */
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

    /**
     * Update a resource (full update)
     */
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

    /**
     * Partially update a resource
     */
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

    /**
     * Delete a resource (soft delete by default)
     */
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

  /**
   * Bulk operations interface
   */
  @doc("Bulk operations for batch processing")
  interface BulkOperations<TEntity, TCreateRequest, TUpdateRequest, TId = string> {
    /**
     * Batch get multiple resources
     */
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

    /**
     * Bulk create resources
     */
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

    /**
     * Bulk update resources
     */
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

    /**
     * Bulk delete resources
     */
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

  /**
   * Search operations interface
   */
  @doc("Advanced search and filtering operations")
  interface SearchOperations<TEntity, TSearchParams = AdvancedSearchParams> {
    /**
     * Advanced search with facets
     */
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

    /**
     * Export search results
     */
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

  /**
   * Audit operations interface
   */
  @doc("Audit trail and history operations")
  interface AuditOperations<TEntity, TId = string> {
    /**
     * Get audit history for a resource
     */
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

    /**
     * Get specific version of a resource
     */
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

    /**
     * Restore a deleted resource
     */
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

  /**
   * Audit entry model
   */
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

  /**
   * System operations
   */
  @route("/api/system")
  @tag("System")
  namespace SystemOperations {
    /**
     * Health check endpoint
     */
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

    /**
     * Readiness check for Kubernetes
     */
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

    /**
     * Liveness check for Kubernetes
     */
    @summary("Check API liveness")
    @get
    @route("alive")
    op alive(): {
      @statusCode statusCode: 200;
      @body response: { alive: true };
    };

    /**
     * Get API metrics
     */
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

    /**
     * Get API version and build information
     */
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