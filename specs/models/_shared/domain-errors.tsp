import "@typespec/http";

using TypeSpec.Http;

namespace BeautySalon.Models {
  /**
   * Domain error type classification
   */
  enum DomainErrorType {
    VALIDATION_ERROR: "VALIDATION_ERROR",
    NOT_FOUND: "NOT_FOUND",
    ALREADY_EXISTS: "ALREADY_EXISTS",
    BUSINESS_RULE_VIOLATION: "BUSINESS_RULE_VIOLATION",
    UNAUTHORIZED: "UNAUTHORIZED",
    FORBIDDEN: "FORBIDDEN",
    INTERNAL_ERROR: "INTERNAL_ERROR",
    DATABASE_ERROR: "DATABASE_ERROR",
    EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",
  }

  /**
   * Domain error details for internal error handling
   */
  model DomainErrorDetails {
    @doc("Error classification type")
    type: DomainErrorType;

    @doc("Human-readable error message")
    message: string;

    @doc("Machine-readable error code")
    code: string;

    @doc("Additional error context")
    details?: Record<unknown>;

    @doc("Related entity information")
    entity?: string;

    @doc("Related field information")
    field?: string;

    @doc("Related value information")
    value?: string;

    @doc("Service name for external service errors")
    service?: string;
  }

  /**
   * Mapping between domain error types and error codes
   */
  model DomainErrorMapping {
    @doc("Domain error type")
    domainType: DomainErrorType;

    @doc("Corresponding error code")
    errorCode: ErrorCodeType;

    @doc("HTTP status code")
    httpStatus: int32;
  }

  /**
   * Standard domain error factory configuration
   */
  model DomainErrorFactory {
    @doc("Validation error factory")
    validation: {
      type: "VALIDATION_ERROR";
      defaultCode: "VALIDATION_FAILED";
      httpStatus: 400;
    };

    @doc("Not found error factory")
    notFound: {
      type: "NOT_FOUND";
      defaultCode: "RESOURCE_NOT_FOUND";
      httpStatus: 404;
    };

    @doc("Already exists error factory")
    alreadyExists: {
      type: "ALREADY_EXISTS";
      defaultCode: "RESOURCE_ALREADY_EXISTS";
      httpStatus: 409;
    };

    @doc("Business rule violation factory")
    businessRule: {
      type: "BUSINESS_RULE_VIOLATION";
      defaultCode: "BUSINESS_RULE_VIOLATION";
      httpStatus: 422;
    };

    @doc("Unauthorized error factory")
    unauthorized: {
      type: "UNAUTHORIZED";
      defaultCode: "AUTHENTICATION_REQUIRED";
      httpStatus: 401;
    };

    @doc("Forbidden error factory")
    forbidden: {
      type: "FORBIDDEN";
      defaultCode: "INSUFFICIENT_PERMISSIONS";
      httpStatus: 403;
    };

    @doc("Internal error factory")
    internal: {
      type: "INTERNAL_ERROR";
      defaultCode: "INTERNAL_SERVER_ERROR";
      httpStatus: 500;
    };

    @doc("Database error factory")
    database: {
      type: "DATABASE_ERROR";
      defaultCode: "DATABASE_ERROR";
      httpStatus: 500;
    };

    @doc("External service error factory")
    externalService: {
      type: "EXTERNAL_SERVICE_ERROR";
      defaultCode: "EXTERNAL_SERVICE_ERROR";
      httpStatus: 502;
    };
  }

  /**
   * Error context for domain operations
   */
  model DomainOperationError {
    @doc("Domain error details")
    domainError: DomainErrorDetails;

    @doc("Problem details for HTTP response")
    problemDetails: ProblemDetails;

    @doc("Occurred at timestamp")
    occurredAt: utcDateTime;

    @doc("Operation context")
    operation?: string;

    @doc("Stack trace for debugging (only in development)")
    stackTrace?: string;
  }
}