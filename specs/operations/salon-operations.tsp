import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi3";
import "../models/salon.tsp";
import "../models/common.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.OpenAPI;
using BeautySalon.Models;

namespace BeautySalon.Operations {
  @route("/salons")
  @tag("Salons")
  namespace SalonOperations {
    @summary("List all salons")
    @get
    op list(...PaginationParams): {
      @statusCode statusCode: 200;
      @body response: PaginationResponse<SalonSummary>;
    };

    @summary("Create a new salon")
    @post
    op create(@body salon: CreateSalonRequest): {
      @statusCode statusCode: 201;
      @header location: string;
      @body salon: Salon;
    } | {
      @statusCode statusCode: 400;
      @body error: Error;
    };

    @summary("Get salon by ID")
    @get
    op get(@path id: SalonId): {
      @statusCode statusCode: 200;
      @body salon: Salon;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    };

    @summary("Update salon")
    @put
    op update(@path id: SalonId, @body updates: UpdateSalonRequest): {
      @statusCode statusCode: 200;
      @body salon: Salon;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    } | {
      @statusCode statusCode: 400;
      @body error: Error;
    };

    @summary("Delete salon")
    @delete
    op delete(@path id: SalonId): {
      @statusCode statusCode: 204;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    };

    @summary("Search salons")
    @route("/search")
    @get
    op search(
      @query keyword?: string,
      @query city?: string,
      @query category?: ServiceCategory,
      ...PaginationParams,
    ): {
      @statusCode statusCode: 200;
      @body response: PaginationResponse<SalonSummary>;
    };
  }
}
