import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;
using TypeSpec.OpenAPI;

namespace BeautySalon.Models {
  /**
   * Standardized API Error Response
   * Follows RFC 7807 Problem Details specification
   */
  @doc("Standardized error response following RFC 7807")
  model ProblemDetails {
    @doc("URI reference that identifies the problem type")
    type: string;

    @doc("Short, human-readable summary of the problem")
    title: string;

    @doc("HTTP status code")
    status: int32;

    @doc("Human-readable explanation specific to this occurrence")
    detail?: string;

    @doc("URI reference that identifies the specific occurrence")
    instance?: string;

    @doc("Machine-readable error code for programmatic handling")
    code: ErrorCodeType;

    @doc("Additional error context and validation details")
    errors?: ValidationError[];

    @doc("Correlation ID for tracing")
    correlationId?: string;

    @doc("Timestamp of the error")
    timestamp: utcDateTime;
  }

  /**
   * Standardized error codes for consistent error handling
   */
  enum ErrorCodeType {
    // Authentication & Authorization (1xxx)
    AUTHENTICATION_REQUIRED: "1001",
    INVALID_CREDENTIALS: "1002",
    TOKEN_EXPIRED: "1003",
    TOKEN_INVALID: "1004",
    INSUFFICIENT_PERMISSIONS: "1005",
    ACCOUNT_LOCKED: "1006",
    TWO_FACTOR_REQUIRED: "1007",

    // Validation (2xxx)
    VALIDATION_FAILED: "2001",
    INVALID_FORMAT: "2002",
    REQUIRED_FIELD_MISSING: "2003",
    VALUE_OUT_OF_RANGE: "2004",
    DUPLICATE_VALUE: "2005",

    // Business Logic (3xxx)
    RESOURCE_NOT_FOUND: "3001",
    RESOURCE_ALREADY_EXISTS: "3002",
    OPERATION_NOT_ALLOWED: "3003",
    BUSINESS_RULE_VIOLATION: "3004",
    INSUFFICIENT_BALANCE: "3005",
    BOOKING_CONFLICT: "3006",
    CAPACITY_EXCEEDED: "3007",

    // System (4xxx)
    INTERNAL_SERVER_ERROR: "4001",
    SERVICE_UNAVAILABLE: "4002",
    DATABASE_ERROR: "4003",
    EXTERNAL_SERVICE_ERROR: "4004",
    RATE_LIMIT_EXCEEDED: "4005",
  }

  /**
   * Validation error details
   */
  model ValidationError {
    @doc("Field path that failed validation")
    field: string;

    @doc("Validation rule that failed")
    rule: string;

    @doc("Human-readable error message")
    message: string;

    @doc("Actual value that failed validation")
    value?: unknown;

    @doc("Expected value or constraint")
    constraint?: unknown;
  }

  /**
   * Cursor-based pagination request parameters
   * More efficient than offset-based for large datasets
   */
  @doc("Cursor-based pagination parameters")
  model CursorPaginationParams {
    @query
    @doc("Maximum number of items to return (1-100)")
    @minValue(1)
    @maxValue(100)
    limit?: int32 = 20;

    @query
    @doc("Cursor for the next page")
    cursor?: string;

    @query
    @doc("Field to sort by")
    sortBy?: string;

    @query
    @doc("Sort order")
    sortOrder?: "asc" | "desc" = "asc";
  }

  /**
   * Offset-based pagination (legacy support)
   */
  @doc("Offset-based pagination parameters")
  model OffsetPaginationParams {
    @query
    @doc("Maximum number of items to return (1-100)")
    @minValue(1)
    @maxValue(100)
    limit?: int32 = 20;

    @query
    @doc("Number of items to skip")
    @minValue(0)
    offset?: int32 = 0;

    @query
    @doc("Field to sort by")
    sortBy?: string;

    @query
    @doc("Sort order")
    sortOrder?: "asc" | "desc" = "asc";
  }

  /**
   * Cursor-based pagination response
   */
  @doc("Paginated response with cursor navigation")
  model CursorPaginationResponse<T> {
    @doc("Array of items for current page")
    data: T[];

    @doc("Pagination metadata")
    meta: PaginationMeta;

    @doc("Navigation links")
    links: PaginationLinks;
  }

  model PaginationMeta {
    @doc("Total number of items")
    total?: int32;

    @doc("Number of items per page")
    limit: int32;

    @doc("Whether there are more pages")
    hasMore: boolean;

    @doc("Current cursor position")
    cursor?: string;

    @doc("Next cursor for pagination")
    nextCursor?: string;

    @doc("Previous cursor for pagination")
    prevCursor?: string;
  }

  model PaginationLinks {
    @doc("Link to current page")
    self: string;

    @doc("Link to first page")
    first?: string;

    @doc("Link to last page")
    last?: string;

    @doc("Link to next page")
    next?: string;

    @doc("Link to previous page")
    prev?: string;
  }

  /**
   * Standard API response wrapper
   */
  @doc("Standard successful response wrapper")
  model ApiResponse<T> {
    @doc("Response data")
    data: T;

    @doc("Response metadata")
    meta?: ResponseMeta;

    @doc("Related links")
    links?: Record<string>;
  }

  model ResponseMeta {
    @doc("Request correlation ID")
    correlationId: string;

    @doc("Response timestamp")
    timestamp: utcDateTime;

    @doc("API version")
    version: string;

    // Additional metadata
    ...Record<unknown>;
  }

  /**
   * Bulk operation request
   */
  @doc("Request for bulk operations")
  model BulkRequest<T> {
    @doc("Array of items to process")
    @minItems(1)
    @maxItems(100)
    items: T[];

    @doc("Whether to continue on error")
    continueOnError?: boolean = false;

    @doc("Whether to process in transaction")
    transactional?: boolean = true;
  }

  /**
   * Bulk operation response
   */
  @doc("Response from bulk operations")
  model BulkResponse<TSuccess, TError = ProblemDetails> {
    @doc("Successfully processed items")
    succeeded: BulkSuccessItem<TSuccess>[];

    @doc("Failed items")
    failed: BulkErrorItem<TError>[];

    @doc("Summary statistics")
    summary: BulkSummary;
  }

  model BulkSuccessItem<T> {
    @doc("Index in the original request")
    index: int32;

    @doc("Processed result")
    result: T;
  }

  model BulkErrorItem<T = ProblemDetails> {
    @doc("Index in the original request")
    index: int32;

    @doc("Error details")
    error: T;
  }

  model BulkSummary {
    @doc("Total items processed")
    total: int32;

    @doc("Number of successful items")
    succeeded: int32;

    @doc("Number of failed items")
    failed: int32;

    @doc("Processing duration in milliseconds")
    duration: int32;
  }

  /**
   * Soft delete support
   */
  @doc("Soft delete information")
  model SoftDelete {
    @doc("Whether the record is deleted")
    isDeleted: boolean = false;

    @doc("Deletion timestamp")
    deletedAt?: utcDateTime;

    @doc("User who deleted the record")
    deletedBy?: string;

    @doc("Deletion reason")
    deletionReason?: string;
  }

  /**
   * Audit trail model
   */
  @doc("Complete audit information")
  model AuditTrail {
    @doc("Record creation timestamp")
    createdAt: utcDateTime;

    @doc("User who created the record")
    createdBy: string;

    @doc("Last update timestamp")
    updatedAt: utcDateTime;

    @doc("User who last updated the record")
    updatedBy: string;

    @doc("Version number for optimistic locking")
    version: int32;

    // Soft delete information
    ...SoftDelete;
  }

  /**
   * Field mask for partial updates
   */
  @doc("Field mask for selective updates")
  model FieldMask {
    @doc("Comma-separated list of field paths to update")
    @query
    @example("name,address.street,contactInfo.email")
    updateMask?: string;
  }

  /**
   * Batch get request
   */
  @doc("Request for batch retrieval")
  model BatchGetRequest {
    @doc("Array of IDs to retrieve")
    @minItems(1)
    @maxItems(100)
    ids: string[];

    @doc("Fields to include in response")
    @query
    fields?: string;
  }

  /**
   * Health check response
   */
  @doc("API health status")
  model HealthStatus {
    @doc("Overall health status")
    status: "healthy" | "degraded" | "unhealthy";

    @doc("API version")
    version: string;

    @doc("Server timestamp")
    timestamp: utcDateTime;

    @doc("Individual service health checks")
    checks: HealthCheck[];

    @doc("Additional metadata")
    metadata?: Record<unknown>;
  }

  model HealthCheck {
    @doc("Service name")
    name: string;

    @doc("Service status")
    status: "up" | "down" | "degraded";

    @doc("Response time in milliseconds")
    responseTime?: int32;

    @doc("Error message if service is down")
    error?: string;

    @doc("Additional details")
    details?: Record<unknown>;
  }

  /**
   * Extended search parameters with advanced filtering
   */
  @doc("Advanced search and filter parameters")
  model AdvancedSearchParams {
    @query
    @doc("Full-text search query")
    q?: string;

    @query
    @doc("Filter expression (e.g., 'status:active AND category:premium')")
    filter?: string;

    @query
    @doc("Fields to include in response")
    fields?: string;

    @query
    @doc("Fields to exclude from response")
    exclude?: string;

    @query
    @doc("Enable faceted search results")
    facets?: boolean = false;

    @query
    @doc("Facet fields to aggregate")
    facetFields?: string[];

    ...CursorPaginationParams;
  }

  /**
   * Search response with facets
   */
  @doc("Search response with faceted results")
  model SearchResponse<T> {
    @doc("Search results")
    results: T[];

    @doc("Search metadata")
    meta: SearchMeta;

    @doc("Faceted aggregations")
    facets?: Record<Facet[]>;
  }

  model SearchMeta {
    @doc("Total matching results")
    total: int32;

    @doc("Search query used")
    query?: string;

    @doc("Applied filters")
    filters?: string[];

    @doc("Search duration in milliseconds")
    duration: int32;

    @doc("Search relevance score range")
    scoreRange?: ScoreRange;
  }

  model ScoreRange {
    @doc("Minimum relevance score")
    min: float32;

    @doc("Maximum relevance score")
    max: float32;
  }

  model Facet {
    @doc("Facet value")
    value: string;

    @doc("Number of items with this value")
    count: int32;
  }

  /**
   * Versioned entity support
   */
  @doc("Version information for optimistic locking")
  model Versioned {
    @doc("Entity version for optimistic concurrency control")
    @header("ETag")
    etag?: string;

    @doc("Version number")
    version: int32;

    @doc("Last modification timestamp")
    lastModified: utcDateTime;
  }

  /**
   * Rate limiting headers
   */
  @doc("Rate limiting information")
  model RateLimitInfo {
    @doc("Request limit per window")
    @header("X-RateLimit-Limit")
    limit: int32;

    @doc("Remaining requests in current window")
    @header("X-RateLimit-Remaining")
    remaining: int32;

    @doc("Window reset timestamp")
    @header("X-RateLimit-Reset")
    reset: int32;

    @doc("Retry after (seconds) when rate limited")
    @header("Retry-After")
    retryAfter?: int32;
  }
}