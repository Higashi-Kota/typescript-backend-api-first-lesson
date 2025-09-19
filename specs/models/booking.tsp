import "@typespec/http";
import "./common.tsp";
import "./payment.tsp";

using TypeSpec.Http;
using BeautySalon.Models;

namespace BeautySalon.Models {
  enum BookingStatusCodeType {
    draft,
    pending,
    confirmed,
    in_progress,
    completed,
    cancelled,
    no_show,
  }

  union BookingStatus {
    draft: DraftBookingStatus,
    pending: PendingBookingStatus,
    confirmed: ConfirmedBookingStatus,
    in_progress: InProgressBookingStatus,
    completed: CompletedBookingStatus,
    cancelled: CancelledBookingStatus,
    no_show: NoShowBookingStatus,
  }

  model DraftBookingStatus {
    type: "draft";
    createdAt: utcDateTime;
    expiresAt?: utcDateTime;
  }

  model PendingBookingStatus {
    type: "pending";
    requestedAt: utcDateTime;
    holdExpiresAt?: utcDateTime;
    assignedStaffId?: StaffId;
  }

  model ConfirmedBookingStatus {
    type: "confirmed";
    confirmedAt: utcDateTime;
    staffId: StaffId;
    expectedStart: utcDateTime;
  }

  model InProgressBookingStatus {
    type: "in_progress";
    startedAt: utcDateTime;
    stationName?: string;
  }

  model CompletedBookingStatus {
    type: "completed";
    completedAt: utcDateTime;
    paymentId?: PaymentId;
    serviceSummary?: string;
  }

  model CancelledBookingStatus {
    type: "cancelled";
    cancelledAt: utcDateTime;
    reason?: string;
    cancelledBy: "customer" | "salon" | "system";
  }

  model NoShowBookingStatus {
    type: "no_show";
    recordedAt: utcDateTime;
    penaltyApplied?: boolean = false;
  }

  model BookingDeposit {
    amount: Money;
    status: "pending" | "paid" | "refunded" | "forfeited";
    dueDate?: utcDateTime;
    paidAt?: utcDateTime;
    refundedAt?: utcDateTime;
    paymentId?: PaymentId;
    notes?: string;
  }

  model WaitlistEntry {
    position: int32;
    estimatedTime?: utcDateTime;
    joinedAt: utcDateTime;
    expiresAt?: utcDateTime;
    notifiedAt?: utcDateTime;
    preferredStaffId?: StaffId;
    preferredServiceId?: ServiceId;
    notes?: string;
  }

  model Booking {
    id: BookingId;
    salonId: SalonId;
    customerId: CustomerId;
    reservationIds: ReservationId[];
    status: BookingStatus;
    statusCode: BookingStatusCodeType;
    waitlistEntry?: WaitlistEntry;
    deposit?: BookingDeposit;
    totalAmount: Money;
    discountAmount?: Money;
    finalAmount: Money;
    balanceDue?: Money;
    paymentMethod?: PaymentMethodType;
    paymentStatus?: PaymentStatusCodeType;
    notes?: string;
    ...AuditInfo;
  }

  model CreateBookingRequest {
    salonId: SalonId;
    customerId: CustomerId;
    reservationIds: ReservationId[];
    waitlistEntry?: WaitlistEntry;
    deposit?: BookingDeposit;
    discountAmount?: Money;
    paymentMethod?: PaymentMethodType;
    notes?: string;
    metadata?: Record<unknown>;
  }

  @doc("Booking update request with optional fields for partial updates")
  model UpdateBookingRequest {
    status?: BookingStatus;
    statusCode?: BookingStatusCodeType;
    waitlistEntry?: WaitlistEntry;
    deposit?: BookingDeposit;
    paymentMethod?: PaymentMethodType;
    paymentStatus?: PaymentStatusCodeType;
    discountAmount?: Money;
    finalAmount?: Money;
    balanceDue?: Money;
    notes?: string;
    metadata?: Record<unknown>;
  }

  @doc("Booking update request with reset capability")
  model UpdateBookingRequestWithReset {
    status?: BookingStatus;
    statusCode?: BookingStatusCodeType;
    waitlistEntry?: WaitlistEntry | null;
    deposit?: BookingDeposit | null;
    paymentMethod?: PaymentMethodType | null;
    paymentStatus?: PaymentStatusCodeType | null;
    discountAmount?: Money | null;
    finalAmount?: Money | null;
    balanceDue?: Money | null;
    notes?: string | null;
    metadata?: Record<unknown> | null;
  }

  model BookingDetail extends Booking {
    reservations: ReservationDetail[];
    customerName: string;
    salonName: string;
    paymentHistory?: PaymentHistory[];
    waitlistHistory?: WaitlistEntry[];
  }
}
