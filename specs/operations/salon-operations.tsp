import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi3";
import "../models/salon.tsp";
import "../models/common.tsp";
import "../models/_shared/common-api-patterns.tsp";
import "./_shared/base-operations.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.OpenAPI;
using BeautySalon.Models;
using BeautySalon.Operations;

namespace BeautySalon.Operations {
  @route("/api/v1/salons")
  @tag("Salons")
  namespace SalonOperations {
    /**
     * Standard CRUD operations
     */
    @route("/")
    interface SalonCrud
      extends CrudOperations<
          Salon,
          CreateSalonRequest,
          UpdateSalonRequest,
          SearchSalonRequest,
          SalonId
        >,
        BulkOperations<Salon, CreateSalonRequest, UpdateSalonRequest, SalonId>,
        SearchOperations<Salon, SearchSalonRequest>,
        AuditOperations<Salon, SalonId> {}

    /**
     * Get salon statistics
     */
    @summary("Get salon statistics")
    @get
    @route("{id}/statistics")
    op getStatistics(
      @path id: SalonId,

      @query
      @doc("Period for statistics (e.g., '7d', '1m', '3m')")
      period?: string = "1m",

      @header("Authorization") authorization?: string,
    ): {
      @statusCode statusCode: 200;
      @body response: ApiResponse<SalonStatistics>;
    } | {
      @statusCode statusCode: 401;
      @body error: ProblemDetails;
    } | {
      @statusCode statusCode: 404;
      @body error: ProblemDetails;
    };

    /**
     * Check salon availability
     */
    @summary("Check salon availability")
    @post
    @route("{id}/availability")
    op checkAvailability(
      @path id: SalonId,
      @body request: SalonAvailabilityRequest,
      @header("Authorization") authorization?: string,
    ): {
      @statusCode statusCode: 200;
      @body response: ApiResponse<SalonAvailabilityResponse>;
    } | {
      @statusCode statusCode: 400;
      @body error: ProblemDetails;
    } | {
      @statusCode statusCode: 404;
      @body error: ProblemDetails;
    };

    /**
     * Get nearby salons
     */
    @summary("Get nearby salons")
    @get
    @route("nearby")
    op getNearby(
      @query
      @doc("Latitude")
      lat: float64,

      @query
      @doc("Longitude")
      lon: float64,

      @query
      @doc("Radius in kilometers")
      @minValue(0.1)
      @maxValue(100)
      radius?: float32 = 5,

      @query
      @doc("Filter by service categories")
      categories?: ("cut" | "color" | "perm" | "treatment" | "spa" | "other")[],

      ...CursorPaginationParams,
      @header("Authorization") authorization?: string,
    ): {
      @statusCode statusCode: 200;
      @body response: CursorPaginationResponse<SalonWithDistance>;
    } | {
      @statusCode statusCode: 400;
      @body error: ProblemDetails;
    };

    /**
     * Delete salon image
     */
    @summary("Delete salon image")
    @delete
    @route("{id}/images/{imageId}")
    op deleteImage(
      @path id: SalonId,
      @path imageId: string,
      @header("Authorization") authorization?: string,
    ): {
      @statusCode statusCode: 204;
    } | {
      @statusCode statusCode: 401;
      @body error: ProblemDetails;
    } | {
      @statusCode statusCode: 404;
      @body error: ProblemDetails;
    };

    /**
     * Get salon recommendations
     */
    @summary("Get personalized salon recommendations")
    @get
    @route("recommendations")
    op getRecommendations(
      @query
      @doc("Customer ID for personalization")
      customerId?: CustomerId,

      @query
      @doc("Service categories of interest")
      categories?: ("cut" | "color" | "perm" | "treatment" | "spa" | "other")[],

      @query
      @doc("Price range preference")
      priceRange?: "budget" | "medium" | "premium",

      ...CursorPaginationParams,
      @header("Authorization") authorization?: string,
    ): {
      @statusCode statusCode: 200;
      @body response: CursorPaginationResponse<SalonRecommendation>;
    } | {
      @statusCode statusCode: 401;
      @body error: ProblemDetails;
    };

    /**
     * Subscribe to salon updates
     */
    @summary("Subscribe to salon updates")
    @post
    @route("{id}/subscribe")
    op subscribe(
      @path id: SalonId,
      @body request: SalonSubscriptionRequest,
      @header("Authorization") authorization?: string,
    ):
      | {
          @statusCode statusCode: 201;
          @body response: ApiResponse<SalonSubscriptionResponse>;
        }
      | {
          @statusCode statusCode: 400;
          @body error: ProblemDetails;
        }
      | {
          @statusCode statusCode: 401;
          @body error: ProblemDetails;
        }
      | {
          @statusCode statusCode: 404;
          @body error: ProblemDetails;
        }
      | {
          @statusCode statusCode: 409; // Already subscribed
          @body error: ProblemDetails;
        };

    /**
     * Manage salon staff schedule
     */
    @summary("Update staff schedule")
    @put
    @route("{id}/staff/{staffId}/schedule")
    op updateStaffSchedule(
      @path id: SalonId,
      @path staffId: StaffId,
      @body schedule: StaffScheduleUpdateRequest,
      @header("Authorization") authorization?: string,
    ):
      | {
          @statusCode statusCode: 200;
          @body response: ApiResponse<StaffScheduleManagement>;
        }
      | {
          @statusCode statusCode: 400;
          @body error: ProblemDetails;
        }
      | {
          @statusCode statusCode: 401;
          @body error: ProblemDetails;
        }
      | {
          @statusCode statusCode: 404;
          @body error: ProblemDetails;
        }
      | {
          @statusCode statusCode: 409; // Schedule conflict
          @body error: ProblemDetails;
        };
  }
}
