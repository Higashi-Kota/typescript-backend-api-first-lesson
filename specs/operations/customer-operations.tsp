import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi3";
import "../models/customer.tsp";
import "../models/reservation.tsp";
import "../models/booking.tsp";
import "../models/common.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.OpenAPI;
using BeautySalon.Models;

namespace BeautySalon.Operations {
  @route("/api/v1/customers")
  @tag("Customers")
  namespace CustomerOperations {
    @summary("List customers")
    @get
    op list(
      @query search?: string,
      @query tags?: string[],
      ...PaginationParams,
    ): {
      @statusCode statusCode: 200;
      @body response: PaginationResponse<Customer>;
    };

    @summary("Create customer")
    @post
    op create(@body customer: CreateCustomerRequest): {
      @statusCode statusCode: 201;
      @header location: string;
      @body customer: Customer;
    } | {
      @statusCode statusCode: 400;
      @body error: Error;
    } | {
      @statusCode statusCode: 409;
      @body error: Error;
    };

    @summary("Get customer")
    @get
    op get(@path id: CustomerId): {
      @statusCode statusCode: 200;
      @body customer: Customer;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    };

    @summary("Get customer profile")
    @route("/{id}/profile")
    @get
    op getProfile(@path id: CustomerId): {
      @statusCode statusCode: 200;
      @body profile: CustomerProfile;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    };

    @summary("Update customer")
    @put
    op update(@path id: CustomerId, @body updates: UpdateCustomerRequest): {
      @statusCode statusCode: 200;
      @body customer: Customer;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    } | {
      @statusCode statusCode: 400;
      @body error: Error;
    };

    @summary("Delete customer")
    @delete
    op delete(@path id: CustomerId): {
      @statusCode statusCode: 204;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    };

    @summary("Get customer reservations")
    @route("/{id}/reservations")
    @get
    op getReservations(
      @path id: CustomerId,
      @query status?: ReservationStatus,
      @query from?: utcDateTime,
      @query to?: utcDateTime,
      ...PaginationParams,
    ): {
      @statusCode statusCode: 200;
      @body response: PaginationResponse<ReservationDetail>;
    };

    @summary("Get customer bookings")
    @route("/{id}/bookings")
    @get
    op getBookings(
      @path id: CustomerId,
      @query status?: BookingStatusCode,
      ...PaginationParams,
    ): {
      @statusCode statusCode: 200;
      @body response: PaginationResponse<BookingDetail>;
    };

    @summary("Merge customer records")
    @route("/merge")
    @post
    op merge(
      @body request: {
        primaryCustomerId: CustomerId;
        secondaryCustomerId: CustomerId;
      },
    ): {
      @statusCode statusCode: 200;
      @body customer: Customer;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    } | {
      @statusCode statusCode: 409;
      @body error: Error;
    };
  }
}
