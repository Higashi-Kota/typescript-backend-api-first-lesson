import "@typespec/http";
import "./common.tsp";
import "./api-patterns.tsp";

using TypeSpec.Http;
using BeautySalon.Models;

namespace BeautySalon.Models {
  model Customer {
    id: CustomerId;
    name: string;
    contactInfo: ContactInfo;
    preferences: string | null;
    notes: string | null;
    tags: string[] | null;
    loyaltyPoints: int32 | null;
    membershipLevel: string | null;
    birthDate: plainDate | null;
    ...AuditInfo;
  }

  @doc("Customer creation request with required keys and nullable values")
  model CreateCustomerRequest {
    // Required fields
    name: string;

    contactInfo: ContactInfo;

    // Required keys with nullable values
    preferences: string | null;

    notes: string | null;
    tags: string[] | null;
    birthDate: plainDate | null;
  }

  @doc("Customer update request with optional fields for partial updates")
  model UpdateCustomerRequest {
    name?: string;
    contactInfo?: ContactInfo;
    preferences?: string;
    notes?: string;
    tags?: string[];
    birthDate?: plainDate;
  }

  @doc("Customer update request with reset capability")
  model UpdateCustomerRequestWithReset {
    name?: string;
    contactInfo?: ContactInfo;
    preferences?: string | null;
    notes?: string | null;
    tags?: string[] | null;
    birthDate?: plainDate | null;
  }

  model CustomerProfile extends Customer {
    visitCount: int32;
    lastVisitDate: utcDateTime | null;
    favoriteStaffIds: StaffId[] | null;
    favoriteServiceIds: ServiceId[] | null;
    totalSpent: int32;
  }

  @doc("Customer search parameters - all fields are optional")
  model SearchCustomerRequest {
    @query search?: string;
    @query tags?: string[];
  }

  @doc("Customer reservations filter parameters")
  model GetCustomerReservationsRequest {
    @query status?: ReservationStatus;
    @query from?: utcDateTime;
    @query to?: utcDateTime;
  }

  @doc("Customer bookings filter parameters")
  model GetCustomerBookingsRequest {
    @query status?: BookingStatus;
  }
}
