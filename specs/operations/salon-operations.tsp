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
  /**
   * Extended search parameters for salon queries
   */
  model SalonSearchParams extends AdvancedSearchParams {
    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("Filter by city name")
    city?: string;

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("Filter by service category")
    category?: "cut" | "color" | "perm" | "treatment" | "spa" | "other";

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("Filter by minimum rating")
    @minValue(0)
    @maxValue(5)
    minRating?: float32;

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("Maximum distance in kilometers")
    @minValue(0)
    maxDistance?: float32;

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("Reference latitude for distance calculation")
    lat?: float64;

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("Reference longitude for distance calculation")
    lon?: float64;

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("Filter by features (comma-separated)")
    features?: string;

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("Filter by opening hours")
    openNow?: boolean;

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("Filter by specific day and time")
    openAt?: utcDateTime;
  }

  /**
   * Salon statistics response
   */
  model SalonStatistics {
    @doc("Total number of services")
    totalServices: int32;

    @doc("Total number of staff")
    totalStaff: int32;

    @doc("Average rating")
    averageRating?: float32;

    @doc("Total reviews")
    totalReviews: int32;

    @doc("Total bookings this month")
    monthlyBookings: int32;

    @doc("Revenue this month")
    monthlyRevenue?: Money;

    @doc("Popular services")
    popularServices: ServiceSummary[];

    @doc("Busy hours")
    busyHours: TimeSlot[];
  }

  /**
   * Salon availability check
   */
  model SalonAvailabilityRequest {
    @doc("Service ID to check availability for")
    serviceId: ServiceId;

    @doc("Preferred date")
    date: plainDate;

    @doc("Preferred time slot")
    timeSlot?: TimeSlot;

    @doc("Preferred staff ID")
    staffId?: StaffId;

    @doc("Number of slots needed")
    @minValue(1)
    slots?: int32 = 1;
  }

  model SalonAvailabilityResponse {
    @doc("Available time slots")
    availableSlots: AvailableTimeSlot[];

    @doc("Next available date if requested date is full")
    nextAvailableDate?: plainDate;

    @doc("Waitlist available")
    waitlistAvailable: boolean;
  }

  model AvailableTimeSlot {
    @doc("Start time")
    startTime: utcDateTime;

    @doc("End time")
    endTime: utcDateTime;

    @doc("Available staff members")
    availableStaff: StaffSummary[];

    @doc("Availability percentage")
    availability: int32;
  }

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
          SalonSearchParams,
          SalonId
        >,
        BulkOperations<Salon, CreateSalonRequest, UpdateSalonRequest, SalonId>,
        SearchOperations<Salon, SalonSearchParams>,
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
      @doc("Service category filter")
      category?: "cut" | "color" | "perm" | "treatment" | "spa" | "other",

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
      @body request: {
        customerId: CustomerId;
        notificationTypes: NotificationType[];
        categories?: ("cut" | "color" | "perm" | "treatment" | "spa" | "other")[];
      },
      @header("Authorization") authorization?: string,
    ):
      | {
          @statusCode statusCode: 201;
          @body response: ApiResponse<{
            subscriptionId: string;
            status: "active";
            expiresAt?: utcDateTime;
          }>;
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
      @body schedule: {
        regularHours: BusinessHours[];
        exceptions?: ScheduleException[];
        effectiveFrom: utcDateTime;
        effectiveTo?: utcDateTime;
      },
      @header("Authorization") authorization?: string,
    ):
      | {
          @statusCode statusCode: 200;
          @body response: ApiResponse<StaffSchedule>;
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

  /**
   * Extended models for improved operations
   */
  model SalonWithDistance extends Salon {
    @doc("Distance from reference point in kilometers")
    distance: float32;

    @doc("Estimated travel time in minutes")
    travelTime?: int32;
  }

  model SalonRecommendation extends SalonSummary {
    @doc("Recommendation score (0-100)")
    score: int32;

    @doc("Reasons for recommendation")
    reasons: string[];

    @doc("Matching services")
    matchingServices: ServiceSummary[];
  }

  model StaffSchedule {
    staffId: StaffId;
    salonId: SalonId;
    regularHours: BusinessHours[];
    exceptions: ScheduleException[];
    effectiveFrom: utcDateTime;
    effectiveTo?: utcDateTime;
    ...AuditTrail;
  }

  model ScheduleException {
    date: plainDate;
    type: "holiday" | "sick_leave" | "vacation" | "training" | "other";
    description?: string;
    alternativeStaffId?: StaffId;
  }
}
