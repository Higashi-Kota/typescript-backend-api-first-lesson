import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi3";
import "../models/booking.tsp";
import "../models/common.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.OpenAPI;
using BeautySalon.Models;

namespace BeautySalon.Operations {
  @route("/bookings")
  @tag("Bookings")
  namespace BookingOperations {
    @summary("List bookings")
    @get
    op list(
      @query salonId?: SalonId,
      @query customerId?: CustomerId,
      @query status?: BookingStatus,
      @query from?: utcDateTime,
      @query to?: utcDateTime,
      ...PaginationParams,
    ): {
      @statusCode statusCode: 200;
      @body response: PaginationResponse<BookingDetail>;
    };

    @summary("Create booking")
    @post
    op create(@body booking: CreateBookingRequest): {
      @statusCode statusCode: 201;
      @header location: string;
      @body booking: Booking;
    } | {
      @statusCode statusCode: 400;
      @body error: Error;
    } | {
      @statusCode statusCode: 409;
      @body error: Error;
    };

    @summary("Get booking")
    @get
    op get(@path id: BookingId): {
      @statusCode statusCode: 200;
      @body booking: BookingDetail;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    };

    @summary("Update booking")
    @patch(#{implicitOptionality: true})
    op update(@path id: BookingId, @body updates: UpdateBookingRequest): {
      @statusCode statusCode: 200;
      @body booking: Booking;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    } | {
      @statusCode statusCode: 400;
      @body error: Error;
    };

    @summary("Delete booking")
    @delete
    op delete(@path id: BookingId): {
      @statusCode statusCode: 204;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    } | {
      @statusCode statusCode: 409;
      @body error: Error;
    };

    @summary("Confirm booking")
    @route("/{id}/confirm")
    @post
    op confirm(@path id: BookingId): {
      @statusCode statusCode: 200;
      @body booking: Booking;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    } | {
      @statusCode statusCode: 409;
      @body error: Error;
    };

    @summary("Cancel booking")
    @route("/{id}/cancel")
    @post
    op cancel(
      @path id: BookingId,
      @body request: {
        reason?: string;
        cancelReservations?: boolean;
      },
    ): {
      @statusCode statusCode: 200;
      @body booking: Booking;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    } | {
      @statusCode statusCode: 409;
      @body error: Error;
    };

    @summary("Process payment")
    @route("/{id}/payment")
    @post
    op processPayment(
      @path id: BookingId,
      @body request: {
        paymentMethod: string;
        amount: int32;
        transactionId?: string;
      },
    ): {
      @statusCode statusCode: 200;
      @body response: {
        booking: Booking;
        paymentId: string;
      };
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    } | {
      @statusCode statusCode: 400;
      @body error: Error;
    };

    @summary("Add reservation to booking")
    @route("/{id}/reservations")
    @post
    op addReservation(
      @path id: BookingId,
      @body request: {
        reservationId: ReservationId;
      },
    ): {
      @statusCode statusCode: 200;
      @body booking: Booking;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    } | {
      @statusCode statusCode: 409;
      @body error: Error;
    };

    @summary("Remove reservation from booking")
    @route("/{id}/reservations/{reservationId}")
    @delete
    op removeReservation(
      @path id: BookingId,
      @path reservationId: ReservationId,
    ): {
      @statusCode statusCode: 200;
      @body booking: Booking;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    };
  }
}