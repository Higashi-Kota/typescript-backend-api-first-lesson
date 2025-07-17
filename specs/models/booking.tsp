import "@typespec/http";
import "./common.tsp";

using TypeSpec.Http;
using BeautySalon.Models;

namespace BeautySalon.Models {
  model Booking {
    id: BookingId;
    salonId: SalonId;
    customerId: CustomerId;
    reservationIds: ReservationId[];
    status: BookingStatus;
    totalAmount: int32;
    discountAmount?: int32;
    finalAmount: int32;
    paymentMethod?: string;
    paymentStatus: string;
    notes?: string;
    ...AuditInfo;
  }

  model CreateBookingRequest {
    salonId: SalonId;
    customerId: CustomerId;
    reservationIds: ReservationId[];
    discountAmount?: int32;
    paymentMethod?: string;
    notes?: string;
  }

  @doc("Booking update request with optional fields for partial updates")
  model UpdateBookingRequest {
    status?: BookingStatus;
    paymentMethod?: string;
    paymentStatus?: string;
    notes?: string;
  }

  @doc("Booking update request with reset capability")
  model UpdateBookingRequestWithReset {
    status?: BookingStatus;
    paymentMethod?: string | null;
    paymentStatus?: string;
    notes?: string | null;
  }

  model BookingDetail extends Booking {
    reservations: ReservationDetail[];
    customerName: string;
    salonName: string;
  }
}