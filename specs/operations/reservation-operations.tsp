import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi3";
import "../models/reservation.tsp";
import "../models/common.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.OpenAPI;
using BeautySalon.Models;

namespace BeautySalon.Operations {
  @route("/api/v1/reservations")
  @tag("Reservations")
  namespace ReservationOperations {
    @summary("List reservations")
    @get
    op list(
      @query salonId?: SalonId,
      @query customerId?: CustomerId,
      @query staffId?: StaffId,
      @query status?: ReservationStatusType,
      @query from?: utcDateTime,
      @query to?: utcDateTime,
      ...PaginationParams,
    ): {
      @statusCode statusCode: 200;
      @body response: PaginationResponse<ReservationDetail>;
    };

    @summary("Create reservation")
    @post
    op create(@body reservation: CreateReservationRequest): {
      @statusCode statusCode: 201;
      @header location: string;
      @body reservation: Reservation;
    } | {
      @statusCode statusCode: 400;
      @body error: Error;
    } | {
      @statusCode statusCode: 409;
      @body error: Error;
    };

    @summary("Get reservation")
    @get
    op get(@path id: ReservationId): {
      @statusCode statusCode: 200;
      @body reservation: ReservationDetail;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    };

    @summary("Update reservation")
    @patch(#{ implicitOptionality: true })
    op update(
      @path id: ReservationId,
      @body updates: UpdateReservationRequest,
    ):
      | {
          @statusCode statusCode: 200;
          @body reservation: Reservation;
        }
      | {
          @statusCode statusCode: 404;
          @body error: Error;
        }
      | {
          @statusCode statusCode: 400;
          @body error: Error;
        }
      | {
          @statusCode statusCode: 409;
          @body error: Error;
        };

    @summary("Cancel reservation")
    @route("/{id}/cancel")
    @post
    op cancel(
      @path id: ReservationId,
      @body request: {
        reason?: string;
      },
    ): {
      @statusCode statusCode: 200;
      @body reservation: Reservation;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    } | {
      @statusCode statusCode: 409;
      @body error: Error;
    };

    @summary("Complete reservation")
    @route("/{id}/complete")
    @post
    op complete(@path id: ReservationId): {
      @statusCode statusCode: 200;
      @body reservation: Reservation;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    } | {
      @statusCode statusCode: 409;
      @body error: Error;
    };

    @summary("Reschedule reservation")
    @route("/{id}/reschedule")
    @post
    op reschedule(
      @path id: ReservationId,
      @body request: {
        newStartTime: utcDateTime;
        staffId?: StaffId;
      },
    ): {
      @statusCode statusCode: 200;
      @body reservation: Reservation;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    } | {
      @statusCode statusCode: 409;
      @body error: Error;
    };
  }

  @route("/api/v1/salons/{salonId}/available-slots")
  @tag("Reservations")
  namespace AvailabilityOperations {
    @summary("Get available slots")
    @get
    op getAvailableSlots(
      @path salonId: SalonId,
      @query staffId?: StaffId,
      @query serviceId: ServiceId,
      @query date: plainDate,
      @query duration?: int32,
    ): {
      @statusCode statusCode: 200;
      @body slots: AvailableSlot[];
    } | {
      @statusCode statusCode: 400;
      @body error: Error;
    };

    @summary("Check availability")
    @route("/check")
    @post
    op checkAvailability(
      @path salonId: SalonId,
      @body request: {
        staffId: StaffId;
        serviceId: ServiceId;
        startTime: utcDateTime;
      },
    ): {
      @statusCode statusCode: 200;
      @body response: {
        isAvailable: boolean;
        conflicts?: ReservationId[];
      };
    };
  }
}
