import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi3";
import "../models/staff.tsp";
import "../models/common.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.OpenAPI;
using BeautySalon.Models;

namespace BeautySalon.Operations {
  @route("/api/v1/salons/{salonId}/staff")
  @tag("Staff")
  namespace StaffOperations {
    @summary("List staff members")
    @get
    op list(@path salonId: SalonId, ...PaginationParams): {
      @statusCode statusCode: 200;
      @body response: PaginationResponse<Staff>;
    };

    @summary("Create staff member")
    @post
    op create(@path salonId: SalonId, @body staff: CreateStaffRequest): {
      @statusCode statusCode: 201;
      @header location: string;
      @body staff: Staff;
    } | {
      @statusCode statusCode: 400;
      @body error: Error;
    };

    @summary("Get staff member")
    @get
    op get(@path salonId: SalonId, @path id: StaffId): {
      @statusCode statusCode: 200;
      @body staff: Staff;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    };

    @summary("Update staff member")
    @put
    op update(
      @path salonId: SalonId,
      @path id: StaffId,
      @body updates: UpdateStaffRequest,
    ): {
      @statusCode statusCode: 200;
      @body staff: Staff;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    } | {
      @statusCode statusCode: 400;
      @body error: Error;
    };

    @summary("Delete staff member")
    @delete
    op delete(@path salonId: SalonId, @path id: StaffId): {
      @statusCode statusCode: 204;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    };

    @summary("Get staff availability")
    @route("/{id}/availability")
    @get
    op getAvailability(
      @path salonId: SalonId,
      @path id: StaffId,
      @query date: plainDate,
    ): {
      @statusCode statusCode: 200;
      @body availability: StaffAvailability[];
    };

    @summary("Update staff availability")
    @route("/{id}/availability")
    @put
    op updateAvailability(
      @path salonId: SalonId,
      @path id: StaffId,
      @body availability: StaffAvailability[],
    ): {
      @statusCode statusCode: 200;
      @body availability: StaffAvailability[];
    } | {
      @statusCode statusCode: 400;
      @body error: Error;
    };
  }

  @route("/api/v1/staff")
  @tag("Staff")
  namespace GlobalStaffOperations {
    @summary("Search staff across all salons")
    @route("/search")
    @get
    op searchStaff(
      @query specialty?: string,
      @query city?: string,
      ...PaginationParams,
    ): {
      @statusCode statusCode: 200;
      @body response: PaginationResponse<Staff>;
    };
  }
}
