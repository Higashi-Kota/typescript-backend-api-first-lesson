import "@typespec/http";
import "./common.tsp";

using TypeSpec.Http;
using BeautySalon.Models;

namespace BeautySalon.Models {
  model Review {
    id: ReviewId;
    salonId: SalonId;
    customerId: CustomerId;
    reservationId: ReservationId;
    staffId?: StaffId;
    rating: int32;
    comment?: string;
    serviceRating?: int32;
    staffRating?: int32;
    atmosphereRating?: int32;
    images?: string[];
    isVerified: boolean;
    helpfulCount: int32 = 0;
    ...AuditInfo;
  }

  model CreateReviewRequest {
    salonId: SalonId;
    customerId: CustomerId;
    reservationId: ReservationId;
    staffId?: StaffId;
    rating: int32;
    comment?: string;
    serviceRating?: int32;
    staffRating?: int32;
    atmosphereRating?: int32;
    images?: string[];
  }

  @doc("Review update request with optional fields for partial updates")
  model UpdateReviewRequest {
    rating?: int32;
    comment?: string;
    serviceRating?: int32;
    staffRating?: int32;
    atmosphereRating?: int32;
    images?: string[];
  }

  @doc("Review update request with reset capability")
  model UpdateReviewRequestWithReset {
    rating?: int32;
    comment?: string | null;
    serviceRating?: int32 | null;
    staffRating?: int32 | null;
    atmosphereRating?: int32 | null;
    images?: string[] | null;
  }

  model ReviewSummary {
    averageRating: float32;
    totalReviews: int32;
    ratingDistribution: Record<int32>;
  }
}
