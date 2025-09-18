import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi3";
import "../models/review.tsp";
import "../models/common.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.OpenAPI;
using BeautySalon.Models;

namespace BeautySalon.Operations {
  @route("/api/v1/reviews")
  @tag("Reviews")
  namespace ReviewOperations {
    @summary("List reviews")
    @get
    op list(
      @query salonId?: SalonId,
      @query customerId?: CustomerId,
      @query bookingId?: BookingId,  // Added to support filtering by booking
      @query staffId?: StaffId,
      @query minRating?: int32,
      @query isVerified?: boolean,
      ...PaginationParams,
    ): {
      @statusCode statusCode: 200;
      @body response: PaginationResponse<Review>;
    };

    @summary("Create review")
    @post
    op create(@body review: CreateReviewRequest): {
      @statusCode statusCode: 201;
      @header location: string;
      @body review: Review;
    } | {
      @statusCode statusCode: 400;
      @body error: Error;
    } | {
      @statusCode statusCode: 409;
      @body error: Error;
    };

    @summary("Get review")
    @get
    op get(@path id: ReviewId): {
      @statusCode statusCode: 200;
      @body review: Review;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    };

    @summary("Update review")
    @patch(#{ implicitOptionality: true })
    op update(@path id: ReviewId, @body updates: UpdateReviewRequest): {
      @statusCode statusCode: 200;
      @body review: Review;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    } | {
      @statusCode statusCode: 403;
      @body error: Error;
    };

    @summary("Delete review")
    @delete
    op delete(@path id: ReviewId): {
      @statusCode statusCode: 204;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    } | {
      @statusCode statusCode: 403;
      @body error: Error;
    };

    @summary("Mark review as helpful")
    @route("/{id}/helpful")
    @post
    op markHelpful(@path id: ReviewId): {
      @statusCode statusCode: 200;
      @body response: {
        helpfulCount: int32;
      };
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    };

    @summary("Report review")
    @route("/{id}/report")
    @post
    op report(
      @path id: ReviewId,
      @body request: {
        reason: string;
        details?: string;
      },
    ): {
      @statusCode statusCode: 200;
      @body response: {
        reportId: string;
      };
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    };
  }

  @route("/api/v1/salons/{salonId}/reviews")
  @tag("Reviews")
  namespace SalonReviewOperations {
    @summary("Get salon reviews summary")
    @route("/summary")
    @get
    op getSummary(@path salonId: SalonId): {
      @statusCode statusCode: 200;
      @body summary: ReviewSummary;
    };

    @summary("Get salon reviews")
    @get
    op getSalonReviews(
      @path salonId: SalonId,
      @query sortBy?: "recent" | "rating" | "helpful",
      ...PaginationParams,
    ): {
      @statusCode statusCode: 200;
      @body response: PaginationResponse<Review>;
    };
  }

  @route("/api/v1/staff/{staffId}/reviews")
  @tag("Reviews")
  namespace StaffReviewOperations {
    @summary("Get staff reviews summary")
    @route("/summary")
    @get
    op getStaffSummary(@path staffId: StaffId): {
      @statusCode statusCode: 200;
      @body summary: ReviewSummary;
    };

    @summary("Get staff reviews")
    @get
    op getStaffReviews(@path staffId: StaffId, ...PaginationParams): {
      @statusCode statusCode: 200;
      @body response: PaginationResponse<Review>;
    };
  }
}
