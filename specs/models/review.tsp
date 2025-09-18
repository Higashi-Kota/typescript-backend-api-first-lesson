import "@typespec/http";
import "./common.tsp";

using TypeSpec.Http;
using BeautySalon.Models;

namespace BeautySalon.Models {
  model Review {
    id: ReviewId;
    salonId: SalonId;
    customerId: CustomerId;
    bookingId: BookingId;  // Changed from reservationId to match DB
    staffId?: StaffId;
    overallRating: int32;  // Changed from rating to match DB
    comment?: string;
    title?: string;  // Added to match DB
    serviceRating?: int32;
    staffRating?: int32;
    cleanlinessRating?: int32;  // Changed from atmosphereRating to match DB
    valueRating?: int32;  // Added to match DB
    imageUrls?: string[];  // Changed from images to match DB (jsonb)
    isVerified: boolean;
    helpfulCount: int32 = 0;
    reportCount: int32 = 0;  // Added to match DB
    ownerResponse?: string;  // Added to match DB
    ownerRespondedAt?: utcDateTime;  // Added to match DB
    ...AuditInfo;
  }

  model CreateReviewRequest {
    salonId: SalonId;
    customerId: CustomerId;
    bookingId: BookingId;  // Changed from reservationId to match DB
    staffId?: StaffId;
    overallRating: int32;  // Changed from rating to match DB
    comment?: string;
    title?: string;  // Added to match DB
    serviceRating?: int32;
    staffRating?: int32;
    cleanlinessRating?: int32;  // Changed from atmosphereRating to match DB
    valueRating?: int32;  // Added to match DB
    imageUrls?: string[];  // Changed from images to match DB
  }

  @doc("Review update request with optional fields for partial updates")
  model UpdateReviewRequest {
    overallRating?: int32;  // Changed from rating to match DB
    comment?: string;
    title?: string;  // Added to match DB
    serviceRating?: int32;
    staffRating?: int32;
    cleanlinessRating?: int32;  // Changed from atmosphereRating to match DB
    valueRating?: int32;  // Added to match DB
    imageUrls?: string[];  // Changed from images to match DB
  }

  @doc("Review update request with reset capability")
  model UpdateReviewRequestWithReset {
    overallRating?: int32;  // Changed from rating to match DB
    comment?: string | null;
    title?: string | null;  // Added to match DB
    serviceRating?: int32 | null;
    staffRating?: int32 | null;
    cleanlinessRating?: int32 | null;  // Changed from atmosphereRating to match DB
    valueRating?: int32 | null;  // Added to match DB
    imageUrls?: string[] | null;  // Changed from images to match DB
  }

  model ReviewSummary {
    averageRating: float32;
    totalReviews: int32;
    ratingDistribution: Record<int32>;
  }
}
