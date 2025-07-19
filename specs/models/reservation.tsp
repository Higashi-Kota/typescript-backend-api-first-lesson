import "@typespec/http";
import "./common.tsp";

using TypeSpec.Http;
using BeautySalon.Models;

namespace BeautySalon.Models {
  model Reservation {
    id: ReservationId;
    salonId: SalonId;
    customerId: CustomerId;
    staffId: StaffId;
    serviceId: ServiceId;
    startTime: utcDateTime;
    endTime: utcDateTime;
    status: ReservationStatus;
    notes?: string;
    totalAmount: int32;
    depositAmount?: int32;
    isPaid: boolean;
    cancellationReason?: string;
    ...AuditInfo;
  }

  model CreateReservationRequest {
    salonId: SalonId;
    customerId: CustomerId;
    staffId: StaffId;
    serviceId: ServiceId;
    startTime: utcDateTime;
    notes?: string;
  }

  @doc("Reservation update request with optional fields for partial updates")
  model UpdateReservationRequest {
    status?: ReservationStatus;
    notes?: string;
    startTime?: utcDateTime;
    staffId?: StaffId;
  }

  @doc("Reservation update request with reset capability")
  model UpdateReservationRequestWithReset {
    status?: ReservationStatus;
    notes?: string | null;
    startTime?: utcDateTime;
    staffId?: StaffId;
  }

  model AvailableSlot {
    staffId: StaffId;
    startTime: utcDateTime;
    endTime: utcDateTime;
  }

  model ReservationDetail extends Reservation {
    customerName: string;
    staffName: string;
    serviceName: string;
    serviceCategory: ServiceCategory;
    serviceDuration: int32;
  }
}
