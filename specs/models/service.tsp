import "@typespec/http";
import "./common.tsp";

using TypeSpec.Http;
using BeautySalon.Models;

namespace BeautySalon.Models {
  // ============================================================================
  // Service Sub-Categories
  // ============================================================================

  enum CutSubCategoryType {
    mens_cut,
    womens_cut,
    kids_cut,
    bang_trim,
    beard_trim,
  }

  enum ColorSubCategoryType {
    full_color,
    root_touch,
    highlights,
    lowlights,
    balayage,
    ombre,
    bleach,
    color_correction,
  }

  enum PermSubCategoryType {
    regular_perm,
    digital_perm,
    spiral_perm,
    body_wave,
    straightening,
  }

  enum TreatmentSubCategoryType {
    deep_conditioning,
    protein_treatment,
    scalp_treatment,
    keratin_treatment,
    olaplex,
  }

  enum StylingSubCategoryType {
    blowout,
    updo,
    braiding,
    extensions,
    event_styling,
  }

  enum SpaSubCategoryType {
    head_spa,
    scalp_massage,
    aromatherapy,
    relaxation,
  }

  enum MakeupSubCategoryType {
    everyday_makeup,
    event_makeup,
    bridal_makeup,
    photoshoot_makeup,
  }

  enum NailSubCategoryType {
    manicure,
    pedicure,
    gel_nail,
    nail_art,
    nail_removal,
  }

  // ============================================================================
  // Service Pricing Types
  // ============================================================================

  enum PricingStrategyType {
    fixed,
    tiered,
    dynamic,
    package,
    membership,
    custom,
  }

  model PriceTier {
    name: string;
    description?: string;
    price: int32;
    duration?: int32;
    conditions?: string[];
  }

  model PricingFactor {
    type: "day_of_week" | "time_of_day" | "staff_level" | "demand" | "season";
    multipliers?: Record<decimal>;
    peakHours?: string[];
    peakMultiplier?: decimal;
    threshold?: int32;
    seasons?: Season[];
  }

  model Season {
    name: string;
    startMonth: int32;
    endMonth: int32;
    multiplier: decimal;
  }

  model PricingStrategyDetail {
    type: PricingStrategyType;
    amount?: int32;
    tiers?: PriceTier[];
    basePrice?: int32;
    factors?: PricingFactor[];
    services?: ServiceId[];
    discountRate?: decimal;
    memberPrice?: int32;
    nonMemberPrice?: int32;
    description?: string;
  }

  model ServicePricing {
    strategy: PricingStrategyDetail;
    taxIncluded: boolean;
    currency: CurrencyCodeType;
    minimumPrice?: int32;
    maximumPrice?: int32;
    depositRequired: boolean;
    depositAmount?: int32;
    cancellationFee?: CancellationFee;
  }

  model CancellationFee {
    hours: int32;
    percentage: int32;
    fixedAmount?: int32;
  }

  // ============================================================================
  // Service Options and Requirements
  // ============================================================================

  enum ServiceOptionType {
    addon,
    upgrade,
    duration,
    product,
    combo,
  }

  model ServiceOptionDetail {
    type: ServiceOptionType;
    name?: string;
    price?: int32;
    duration?: int32;
    description?: string;
    fromLevel?: string;
    toLevel?: string;
    additionalPrice?: int32;
    extension?: int32;
    productId?: string;
    required?: boolean;
    withService?: ServiceId;
    discountAmount?: int32;
  }

  enum BookingRequirementType {
    deposit,
    consultation,
    patch_test,
    age_restriction,
    gender_restriction,
    membership,
    preparation,
  }

  model BookingRequirementDetail {
    type: BookingRequirementType;
    amount?: int32;
    percentage?: int32;
    required?: boolean;
    duration?: int32;
    daysInAdvance?: int32;
    minAge?: int32;
    maxAge?: int32;
    allowedGenders?: string[];
    requiredTier?: string;
    instructions?: string[];
  }

  // ============================================================================
  // Service Availability
  // ============================================================================

  enum ServiceAvailabilityType {
    always,
    scheduled,
    by_appointment,
    seasonal,
    limited,
  }

  model ServiceSchedule {
    dayOfWeek: DayOfWeekType;
    startTime: string;
    endTime: string;
    maxBookings?: int32;
  }

  model ServiceAvailabilityDetail {
    type: ServiceAvailabilityType;
    schedule?: ServiceSchedule[];
    requiresApproval?: boolean;
    seasons?: Season[];
    maxPerDay?: int32;
    maxPerWeek?: int32;
  }

  // ============================================================================
  // Service Status
  // ============================================================================

  enum ServiceStatusType {
    active,
    inactive,
    seasonal,
    limited,
    discontinued,
    coming_soon,
  }

  model ServiceStatusDetail {
    type: ServiceStatusType;
    reason?: string;
    since?: utcDateTime;
    availableMonths?: int32[];
    availableUntil?: utcDateTime;
    remainingSlots?: int32;
    discontinuedAt?: utcDateTime;
    replacementId?: ServiceId;
    launchDate?: utcDateTime;
  }

  // ============================================================================
  // Service Model Components
  // ============================================================================

  model ServiceInfo {
    name: string;
    nameKana?: string;
    description: string;
    shortDescription?: string;
    benefits?: string[];
    targetCustomer?: string;
    imageUrls?: string[];
    videoUrl?: string;
  }

  model ServiceDuration {
    standard: int32;
    minimum?: int32;
    maximum?: int32;
    bufferBefore?: int32;
    bufferAfter?: int32;
    includesConsultation: boolean;
  }

  model ServiceRestrictions {
    requiredStaffLevel?: StaffLevelType;
    requiredCertifications?: string[];
    maxConcurrent?: int32;
    minIntervalDays?: int32;
    maxBookingsPerCustomer?: BookingLimit;
    blackoutDates?: utcDateTime[];
  }

  model BookingLimit {
    period: "day" | "week" | "month";
    count: int32;
  }

  model ServicePerformance {
    bookingCount: int32;
    completionRate: decimal;
    averageRating?: decimal;
    reviewCount: int32;
    revenue: int64;
    popularityScore?: decimal;
    repeatRate?: decimal;
  }

  model ServiceAssociations {
    categoryId: CategoryId;
    parentServiceId?: ServiceId;
    childServiceIds?: ServiceId[];
    requiredServiceIds?: ServiceId[];
    recommendedServiceIds?: ServiceId[];
    qualifiedStaffIds?: StaffId[];
    preferredStaffIds?: StaffId[];
  }

  model ServiceMetadata {
    tags?: string[];
    keywords?: string[];
    seoTitle?: string;
    seoDescription?: string;
    internalNotes?: string;
    sortOrder?: int32;
    featured?: boolean;
    hideFromMenu?: boolean;
  }

  // ============================================================================
  // Main Service Model
  // ============================================================================

  model Service {
    id: ServiceId;
    salonId: SalonId;

    @doc("Service basic information")
    info: ServiceInfo;

    @doc("Service category and sub-category")
    category: ServiceCategoryType;

    categoryId?: CategoryId;

    @doc("Pricing information")
    pricing: ServicePricing;

    @doc("Duration settings")
    duration: ServiceDuration;

    @doc("Availability settings")
    availability?: ServiceAvailabilityDetail;

    @doc("Booking requirements")
    requirements?: BookingRequirementDetail[];

    @doc("Service options and addons")
    options?: ServiceOptionDetail[];

    @doc("Service restrictions")
    restrictions?: ServiceRestrictions;

    @doc("Performance metrics")
    performance?: ServicePerformance;

    @doc("Service associations")
    associations?: ServiceAssociations;

    @doc("Service metadata")
    metadata?: ServiceMetadata;

    @doc("Service status")
    status: ServiceStatusDetail;

    @doc("Legacy fields for compatibility")
    name: string;

    description: string;
    price: int32;
    imageUrl?: string;
    requiredStaffLevel?: int32;
    isActive: boolean;
    ...AuditInfo;
  }

  model CreateServiceRequest {
    salonId: SalonId;
    name: string;
    description: string;
    duration: int32;
    price: int32;
    category: ServiceCategoryType;
    categoryId?: CategoryId;
    imageUrl?: string;
    requiredStaffLevel?: int32;
    depositAmount?: int32;
    isActive?: boolean;
    maxAdvanceBookingDays?: int32;
    minAdvanceBookingHours?: int32;
  }

  @doc("Service update request with optional fields for partial updates")
  model UpdateServiceRequest {
    name?: string;
    description?: string;
    duration?: int32;
    price?: int32;
    category?: ServiceCategoryType;
    categoryId?: CategoryId;
    imageUrl?: string;
    requiredStaffLevel?: int32;
    depositAmount?: int32;
    isActive?: boolean;
    maxAdvanceBookingDays?: int32;
    minAdvanceBookingHours?: int32;
  }

  @doc("Service update request with reset capability")
  model UpdateServiceRequestWithReset {
    name?: string;
    description?: string;
    duration?: int32;
    price?: int32;
    category?: ServiceCategoryType;
    categoryId?: CategoryId | null;
    imageUrl?: string | null;
    requiredStaffLevel?: int32 | null;
    depositAmount?: int32 | null;
    isActive?: boolean;
    maxAdvanceBookingDays?: int32 | null;
    minAdvanceBookingHours?: int32 | null;
  }

  model CategoryModel {
    id: CategoryId;
    name: string;
    description: string;
    parentId?: CategoryId;
    displayOrder: int32;
    isActive: boolean;
    ...AuditInfo;
  }
}
