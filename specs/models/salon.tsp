import "@typespec/http";
import "./common.tsp";
import "./_shared/common-api-patterns.tsp";
import "./service.tsp";
import "./staff.tsp";
import "./customer.tsp";

using TypeSpec.Http;
using BeautySalon.Models;

namespace BeautySalon.Models {
  model Salon {
    id: SalonId;
    name: string;
    description: string | null;
    address: Address;
    contactInfo: ContactInfo;
    openingHours: OpeningHours[];
    businessHours: BusinessHours[] | null;
    imageUrls: string[] | null;
    features: string[] | null;
    rating: float32 | null;
    reviewCount: int32 | null;
    ...AuditInfo;
  }

  @doc("Salon creation request - all keys required, values nullable where appropriate")
  model CreateSalonRequest {
    // All keys are required as per TypeSpec API rules for Create requests
    name: string; // Required value

    description: string | null; // Key required, value nullable (matching DB)
    address: Address; // Required value
    contactInfo: ContactInfo; // Required value
    openingHours: OpeningHours[]; // Required value
    businessHours: BusinessHours[] | null; // Key required, value nullable
    imageUrls: string[] | null; // Key required, value nullable
    features: string[] | null; // Key required, value nullable
  }

  @doc("Salon update request with optional fields for partial updates")
  model UpdateSalonRequest {
    name?: string;
    description?: string;
    address?: Address;
    contactInfo?: ContactInfo;
    openingHours?: OpeningHours[];
    businessHours?: BusinessHours[];
    imageUrls?: string[];
    features?: string[];
  }

  @doc("Salon update request with reset capability")
  model UpdateSalonRequestWithReset {
    name?: string | null;
    description?: string | null;
    address?: Address | null;
    contactInfo?: ContactInfo | null;
    openingHours?: OpeningHours[] | null;
    businessHours?: BusinessHours[] | null;
    imageUrls?: string[] | null;
    features?: string[] | null;
  }

  model SalonSummary {
    id: SalonId;
    name: string;
    address: Address;
    rating: float32 | null;
    reviewCount: int32 | null;
  }

  /**
   * Salon search request with extended parameters
   * Extends from AdvancedSearchParams for pagination and advanced filtering
   */
  model SearchSalonRequest extends AdvancedSearchParams {
    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("Search keyword (alias for q)")
    keyword?: string;

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("Filter by city name")
    city?: string;

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("Filter by prefecture name")
    prefecture?: string;

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("Filter by service categories")
    categories?: ("cut" | "color" | "perm" | "treatment" | "spa" | "other")[];

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("Filter by features (array)")
    features?: string[];

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("Filter by active status")
    isActive?: boolean;

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
   * Salon availability check request
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

  /**
   * Salon availability check response
   */
  model SalonAvailabilityResponse {
    @doc("Available time slots")
    availableSlots: AvailableTimeSlot[];

    @doc("Next available date if requested date is full")
    nextAvailableDate?: plainDate;

    @doc("Waitlist available")
    waitlistAvailable: boolean;
  }

  /**
   * Available time slot details
   */
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

  /**
   * Salon with distance information
   */
  model SalonWithDistance extends Salon {
    @doc("Distance from reference point in kilometers")
    distance: float32;

    @doc("Estimated travel time in minutes")
    travelTime?: int32;
  }

  /**
   * Salon recommendation with scoring
   */
  model SalonRecommendation extends SalonSummary {
    @doc("Recommendation score (0-100)")
    score: int32;

    @doc("Reasons for recommendation")
    reasons: string[];

    @doc("Matching services")
    matchingServices: ServiceSummary[];
  }

  /**
   * Staff schedule management information
   */
  model StaffScheduleManagement {
    staffId: StaffId;
    salonId: SalonId;
    regularHours: BusinessHours[];
    exceptions: ScheduleException[];
    effectiveFrom: utcDateTime;
    effectiveTo?: utcDateTime;
    ...AuditTrail;
  }

  /**
   * Schedule exception for staff
   */
  model ScheduleException {
    date: plainDate;
    type: "holiday" | "sick_leave" | "vacation" | "training" | "other";
    description?: string;
    alternativeStaffId?: StaffId;
  }

  /**
   * Subscription request for salon updates
   */
  model SalonSubscriptionRequest {
    customerId: CustomerId;
    notificationTypes: NotificationType[];
    categories?: ("cut" | "color" | "perm" | "treatment" | "spa" | "other")[];
  }

  /**
   * Subscription response
   */
  model SalonSubscriptionResponse {
    subscriptionId: string;
    status: "active";
    expiresAt?: utcDateTime;
  }

  /**
   * Staff schedule update request
   */
  model StaffScheduleUpdateRequest {
    regularHours: BusinessHours[];
    exceptions?: ScheduleException[];
    effectiveFrom: utcDateTime;
    effectiveTo?: utcDateTime;
  }
}
