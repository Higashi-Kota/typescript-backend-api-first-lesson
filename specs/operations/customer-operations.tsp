import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi3";
import "../models/customer.tsp";
import "../models/reservation.tsp";
import "../models/booking.tsp";
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
   * Extended search parameters for customer queries
   */
  model CustomerSearchParams extends AdvancedSearchParams {
    @query
    @doc("Search in customer name, email, or phone")
    search?: string;

    @query
    @doc("Filter by customer tags")
    tags?: string[];

    @query
    @doc("Filter by registration date from")
    registeredFrom?: utcDateTime;

    @query
    @doc("Filter by registration date to")
    registeredTo?: utcDateTime;

    @query
    @doc("Filter by customer status")
    status?: CustomerStatusType;

    @query
    @doc("Filter by loyalty tier")
    loyaltyTier?: LoyaltyTierType;
  }

  /**
   * Customer statistics response
   */
  model CustomerStatistics {
    @doc("Total bookings")
    totalBookings: int32;

    @doc("Total spent")
    totalSpent: Money;

    @doc("Average booking value")
    averageBookingValue: Money;

    @doc("Last visit date")
    lastVisit?: utcDateTime;

    @doc("Favorite services")
    favoriteServices: ServiceSummary[];

    @doc("Favorite staff")
    favoriteStaff: StaffSummary[];

    @doc("Loyalty points")
    loyaltyPoints: int32;

    @doc("Customer since")
    customerSince: utcDateTime;

    @doc("Cancellation rate")
    cancellationRate: float32;

    @doc("No-show rate")
    noShowRate: float32;
  }

  /**
   * Customer preferences model
   */
  model CustomerPreferences {
    @doc("Preferred contact method")
    contactMethod: ContactMethodType;

    @doc("NotificationType preferences")
    notifications: NotificationPreferences;

    @doc("Marketing opt-in status")
    marketingOptIn: boolean;

    @doc("Preferred language")
    preferredLanguage?: string;

    @doc("Accessibility requirements")
    accessibilityRequirements?: string[];

    @doc("Allergies or sensitivities")
    allergies?: string[];

    @doc("Preferred appointment times")
    preferredTimes?: TimePreference[];
  }

  model NotificationPreferences {
    @doc("Email notifications enabled")
    email: boolean;

    @doc("SMS notifications enabled")
    sms: boolean;

    @doc("Push notifications enabled")
    push: boolean;

    @doc("Reminder timing (hours before appointment)")
    reminderHours: int32;
  }

  model TimePreference {
    @doc("Day of week")
    dayOfWeek: DayOfWeekType;

    @doc("Preferred time slots")
    timeSlots: TimeSlot[];
  }

  @route("/api/v1/customers")
  @tag("Customers")
  namespace CustomerOperations {
    /**
     * Standard CRUD operations
     */
    @route("/")
    interface CustomerCrud
      extends CrudOperations<
          Customer,
          CreateCustomerRequest,
          UpdateCustomerRequest,
          CustomerSearchParams,
          CustomerId
        >,
        BulkOperations<
          Customer,
          CreateCustomerRequest,
          UpdateCustomerRequest,
          CustomerId
        >,
        SearchOperations<Customer, CustomerSearchParams>,
        AuditOperations<Customer, CustomerId> {}

    /**
     * Get customer profile with extended information
     */
    @summary("Get customer profile")
    @get
    @route("{id}/profile")
    op getProfile(
      @path id: CustomerId,
      @header("Authorization") authorization?: string,
    ): {
      @statusCode statusCode: 200;
      @body response: ApiResponse<CustomerProfile>;
    } | {
      @statusCode statusCode: 401;
      @body error: ProblemDetails;
    } | {
      @statusCode statusCode: 404;
      @body error: ProblemDetails;
    };

    /**
     * Get customer statistics
     */
    @summary("Get customer statistics")
    @get
    @route("{id}/statistics")
    op getStatistics(
      @path id: CustomerId,

      @query
      @doc("Period for statistics (e.g., '7d', '1m', '3m', '1y')")
      period?: string = "1y",

      @header("Authorization") authorization?: string,
    ): {
      @statusCode statusCode: 200;
      @body response: ApiResponse<CustomerStatistics>;
    } | {
      @statusCode statusCode: 401;
      @body error: ProblemDetails;
    } | {
      @statusCode statusCode: 404;
      @body error: ProblemDetails;
    };

    /**
     * Get customer reservations
     */
    @summary("Get customer reservations")
    @get
    @route("{id}/reservations")
    op getReservations(
      @path id: CustomerId,
      @query status?: ReservationStatusType,

      @query
      from?: utcDateTime,

      @query
      to?: utcDateTime,

      ...CursorPaginationParams,
      @header("Authorization") authorization?: string,
    ): {
      @statusCode statusCode: 200;
      @body response: CursorPaginationResponse<ReservationDetail>;
    } | {
      @statusCode statusCode: 401;
      @body error: ProblemDetails;
    } | {
      @statusCode statusCode: 404;
      @body error: ProblemDetails;
    };

    /**
     * Get customer bookings
     */
    @summary("Get customer bookings")
    @get
    @route("{id}/bookings")
    op getBookings(
      @path id: CustomerId,
      @query status?: BookingStatusCodeType,

      @query
      from?: utcDateTime,

      @query
      to?: utcDateTime,

      ...CursorPaginationParams,
      @header("Authorization") authorization?: string,
    ): {
      @statusCode statusCode: 200;
      @body response: CursorPaginationResponse<BookingDetail>;
    } | {
      @statusCode statusCode: 401;
      @body error: ProblemDetails;
    } | {
      @statusCode statusCode: 404;
      @body error: ProblemDetails;
    };

    /**
     * Update customer preferences
     */
    @summary("Update customer preferences")
    @put
    @route("{id}/preferences")
    op updatePreferences(
      @path id: CustomerId,
      @body preferences: CustomerPreferences,
      @header("Authorization") authorization?: string,
    ):
      | {
          @statusCode statusCode: 200;
          @body response: ApiResponse<CustomerPreferences>;
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
        };

    /**
     * Merge customer records
     */
    @summary("Merge customer records")
    @post
    @route("merge")
    op merge(
      @body request: {
        @doc("Primary customer ID to keep")
        primaryCustomerId: CustomerId;

        @doc("Secondary customer ID to merge and delete")
        secondaryCustomerId: CustomerId;

        @doc("Strategy for handling conflicts")
        conflictResolution?: "keep_primary" | "keep_secondary" | "keep_newest";
      },
      @header("Authorization") authorization?: string,
    ):
      | {
          @statusCode statusCode: 200;
          @body response: ApiResponse<Customer>;
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
          @statusCode statusCode: 409;
          @body error: ProblemDetails;
        };

    /**
     * Export customer data (GDPR compliance)
     */
    @summary("Export customer data")
    @get
    @route("{id}/export")
    op exportData(
      @path id: CustomerId,

      @query
      @doc("Export format")
      format?: "json" | "csv" | "pdf" = "json",

      @header("Authorization") authorization?: string,
    ): {
      @statusCode statusCode: 200;
      @body response: bytes;
      @header("Content-Type") content: string;
      @header("Content-Disposition") contentDisposition: string;
    } | {
      @statusCode statusCode: 401;
      @body error: ProblemDetails;
    } | {
      @statusCode statusCode: 404;
      @body error: ProblemDetails;
    };

    /**
     * Request customer data deletion (GDPR compliance)
     */
    @summary("Request customer data deletion")
    @post
    @route("{id}/deletion-request")
    op requestDeletion(
      @path id: CustomerId,
      @body request: {
        @doc("Reason for deletion")
        reason: string;

        @doc("Confirm understanding of consequences")
        confirmed: boolean;
      },
      @header("Authorization") authorization?: string,
    ):
      | {
          @statusCode statusCode: 202;
          @body response: ApiResponse<{
            @doc("Deletion request ID")
            requestId: string;

            @doc("Scheduled deletion date")
            scheduledDate: utcDateTime;

            @doc("Grace period in days")
            gracePeriodDays: int32;
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
        };

    /**
     * Add loyalty points
     */
    @summary("Add loyalty points")
    @post
    @route("{id}/loyalty-points")
    op addLoyaltyPoints(
      @path id: CustomerId,
      @body request: {
        @doc("Points to add")
        @minValue(1)
        points: int32;

        @doc("Reason for adding points")
        reason: string;

        @doc("Reference ID (e.g., booking ID)")
        referenceId?: string;
      },
      @header("Authorization") authorization?: string,
    ):
      | {
          @statusCode statusCode: 200;
          @body response: ApiResponse<{
            @doc("New points balance")
            balance: int32;

            @doc("Transaction ID")
            transactionId: string;
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
        };
  }
}
