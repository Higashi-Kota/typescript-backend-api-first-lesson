import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi3";

// Import all models
import "./models/common.tsp";
import "./models/auth.tsp";
import "./models/salon.tsp";
import "./models/staff.tsp";
import "./models/service.tsp";
import "./models/customer.tsp";
import "./models/reservation.tsp";
import "./models/booking.tsp";
import "./models/review.tsp";

// Import all operations
import "./operations/auth-operations.tsp";
import "./operations/salon-operations.tsp";
import "./operations/staff-operations.tsp";
import "./operations/service-operations.tsp";
import "./operations/customer-operations.tsp";
import "./operations/reservation-operations.tsp";
import "./operations/booking-operations.tsp";
import "./operations/review-operations.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.OpenAPI;

@service
@server("https://api.beauty-salon.com", "Beauty Salon API")
@doc("Comprehensive API for managing beauty salon operations including salons, staff, services, customers, reservations, bookings, and reviews.")
namespace BeautySalon {
  // All models and operations are imported from separate files
}