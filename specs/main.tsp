import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi3";
import "@typespec/versioning";

// Import all models
// common.tsp is imported by each model file, so we don't need to import it here
import "./models/_shared/common-api-patterns.tsp";
import "./models/_shared/domain-errors.tsp";
import "./models/auth.tsp";
import "./models/salon.tsp";
import "./models/staff.tsp";
import "./models/service.tsp";
import "./models/customer.tsp";
import "./models/reservation.tsp";
import "./models/booking.tsp";
import "./models/review.tsp";
import "./models/attachment.tsp";
import "./models/treatment.tsp";
import "./models/payment.tsp";
import "./models/inventory.tsp";
import "./models/permission.tsp";

// Import all operations
import "./operations/auth-operations.tsp";
import "./operations/salon-operations.tsp";
import "./operations/staff-operations.tsp";
import "./operations/service-operations.tsp";
import "./operations/customer-operations.tsp";
import "./operations/reservation-operations.tsp";
import "./operations/booking-operations.tsp";
import "./operations/review-operations.tsp";
import "./operations/attachment-operations.tsp";
import "./operations/treatment-operations.tsp";
import "./operations/payment-operations.tsp";
import "./operations/inventory-operations.tsp";
import "./operations/permission-operations.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.OpenAPI;
using TypeSpec.Versioning;

@doc("""
APIバージョン区分 - ビューティーサロンサービスのAPIバージョン管理

v1: バージョン1.0.0 - 初回リリース、基本機能を提供
v2: バージョン2.0.0 - 拡張機能を追加、パフォーマンス最適化
""")
enum VersionType {
  v1: "1.0",
  v2: "2.0",
}

@service(#{
  title: "Beauty Salon API"
})
@server("https://api.beauty-salon.com", "Production API Server")
@server("https://staging-api.beauty-salon.com", "Staging API Server")
@server("http://localhost:3000", "Local Development Server")
@versioned(VersionType)
@useAuth(BearerAuth)
@doc("Comprehensive REST API for managing beauty salon operations including salons, staff, services, customers, reservations, bookings, treatments, payments, inventory, and access control. Built with TypeSpec for type-safe API-first development.")
namespace BeautySalon {
  // All models and operations are imported from separate files
  // This namespace serves as the root for all API resources
  
  // The API follows REST best practices with:
  // - Consistent resource naming and URL patterns
  // - Standard HTTP methods and status codes
  // - Comprehensive error handling with Result types
  // - Pagination support for list operations
  // - Filtering and sorting capabilities
  // - Role-based access control
}