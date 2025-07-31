import "@typespec/http";

using TypeSpec.Http;

namespace BeautySalon.Models {
  scalar SalonId extends string;
  scalar StaffId extends string;
  scalar ServiceId extends string;
  scalar CustomerId extends string;
  scalar ReservationId extends string;
  scalar BookingId extends string;
  scalar ReviewId extends string;
  scalar CategoryId extends string;

  enum DayOfWeek {
    monday,
    tuesday,
    wednesday,
    thursday,
    friday,
    saturday,
    sunday,
  }

  enum ServiceCategory {
    cut,
    color,
    perm,
    treatment,
    spa,
    other,
  }

  enum ReservationStatus {
    pending,
    confirmed,
    cancelled,
    completed,
    no_show,
  }

  enum BookingStatus {
    draft,
    pending,
    confirmed,
    in_progress,
    completed,
    cancelled,
    no_show,
  }

  model Error {
    code: string;
    message: string;
    details?: Record<unknown>;
  }

  model PaginationParams {
    @query limit?: int32 = 20;
    @query offset?: int32 = 0;
  }

  model PaginationResponse<T> {
    data: T[];
    total: int32;
    limit: int32;
    offset: int32;
  }

  model OpeningHours {
    dayOfWeek: DayOfWeek;
    openTime: string;
    closeTime: string;
    isHoliday: boolean;
  }

  model Address {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string = "Japan";
  }

  model ContactInfo {
    email: string;
    phoneNumber: string;
    alternativePhone?: string;
  }

  model AuditInfo {
    createdAt: utcDateTime;
    createdBy?: string;
    updatedAt: utcDateTime;
    updatedBy?: string;
  }
}
