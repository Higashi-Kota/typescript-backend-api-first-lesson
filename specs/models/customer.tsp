import "@typespec/http";
import "./common.tsp";
import "./booking.tsp";
import "./_shared/common-api-patterns.tsp";

using TypeSpec.Http;
using BeautySalon.Models;

namespace BeautySalon.Models {
  // ============================================================================
  // Membership Types
  // ============================================================================

  enum MembershipTierType {
    regular,
    silver,
    gold,
    platinum,
    vip,
  }

  enum MembershipBenefitType {
    discount_rate,
    point_multiplier,
    priority_booking,
    free_service,
    birthday_special,
    exclusive_access,
  }

  model MembershipBenefitDetail {
    type: MembershipBenefitType;
    percentage: int32 | null;
    multiplier: decimal | null;
    service: string | null;
    frequency: "monthly" | "quarterly" | "yearly" | null;
    value: int32 | null;
    description: string | null;
  }

  model MembershipInfo {
    tier: MembershipTierType;
    since: utcDateTime;
    benefits: MembershipBenefitDetail[];
    dedicatedManager: string | null;
    points: int32;
    totalPointsEarned: int32;
    totalPointsUsed: int32;
    expiringPoints: int32 | null;
    pointsExpireAt: utcDateTime | null;
  }

  // ============================================================================
  // Customer Status
  // ============================================================================

  enum CustomerStatusType {
    active,
    inactive,
    suspended,
    deleted,
    blacklisted,
  }

  model CustomerStatusDetail {
    type: CustomerStatusType;
    reason: string | null;
    since: utcDateTime | null;
    until: utcDateTime | null;
    by: string | null;
    deletedAt: utcDateTime | null;
  }

  // ============================================================================
  // Health and Allergy Information
  // ============================================================================

  enum AllergyType {
    chemical,
    fragrance,
    metal,
    latex,
    plant,
    other,
  }

  enum AllergySeverityType {
    mild,
    moderate,
    severe,
  }

  model AllergyInfo {
    type: AllergyType;
    substances: string[] | null;
    fragrances: string[] | null;
    metals: string[] | null;
    plants: string[] | null;
    description: string | null;
    severity: AllergySeverityType;
  }

  enum HairType {
    straight,
    wavy,
    curly,
    coily,
  }

  enum HairThicknessType {
    fine,
    medium,
    thick,
  }

  enum ScalpConditionType {
    normal,
    dry,
    oily,
    sensitive,
    dandruff,
  }

  model HairInfo {
    type: HairType;
    thickness: HairThicknessType;
    condition: string[];
    chemicalHistory: string[];
    notes: string | null;
  }

  model ScalpInfo {
    condition: ScalpConditionType;
    sensitivities: string[];
    notes: string | null;
  }

  model CustomerHealth {
    allergies: AllergyInfo[];
    hairInfo: HairInfo | null;
    scalpInfo: ScalpInfo | null;
    medicalConditions: string[] | null;
    medications: string[] | null;
    pregnancyStatus: boolean | null;
    specialNeeds: string | null;
  }

  // ============================================================================
  // Preferences and History
  // ============================================================================

  model StylePreference {
    preferredLength: string | null;
    preferredColors: string[] | null;
    avoidStyles: string[] | null;
    inspirationImages: string[] | null;
  }

  model ServicePreference {
    favoriteServices: ServiceId[] | null;
    avoidServices: ServiceId[] | null;
    preferredDuration: int32 | null;
    preferredPriceRange: PriceRangeFilter | null;
  }

  model CustomerPreferences {
    stylePreferences: StylePreference | null;
    servicePreferences: ServicePreference | null;
    communicationPreferences: NotificationSettings | null;
    preferredStaff: StaffId[] | null;
    avoidStaff: StaffId[] | null;
    preferredDayOfWeek: DayOfWeekType[] | null;
    preferredTimeSlots: TimeSlot[] | null;
    specialRequests: string | null;
    language: string | null;
  }

  model VisitHistory {
    visitCount: int32;
    firstVisitDate: utcDateTime | null;
    lastVisitDate: utcDateTime | null;
    averageSpendPerVisit: int32 | null;
    totalSpent: int32;
    cancelCount: int32;
    noShowCount: int32;
    completedServices: int32;
  }

  model CustomerHistory {
    visits: VisitHistory;
    lastServiceId: ServiceId | null;
    lastStaffId: StaffId | null;
    favoriteServiceIds: ServiceId[];
    favoriteStaffIds: StaffId[];
    pastTreatments: string[] | null;
    notes: string[] | null;
  }

  // ============================================================================
  // Associations
  // ============================================================================

  model CustomerAssociations {
    primarySalonId: SalonId | null;
    visitedSalonIds: SalonId[];
    familyMemberIds: CustomerId[] | null;
    referredBy: CustomerId | null;
    referredCustomerIds: CustomerId[] | null;
    groupId: string | null;
  }

  // ============================================================================
  // Metadata
  // ============================================================================

  model CustomerMetadata {
    source:
      | "walk_in"
      | "online"
      | "phone"
      | "referral"
      | "social_media"
      | "advertisement"
      | null;
    campaign: string | null;
    tags: string[] | null;
    customFields: Record<unknown> | null;
    internalNotes: string[] | null;
    riskScore: int32 | null;
    lifetimeValue: int32 | null;
    lastUpdatedBy: string | null;
  }
  // ============================================================================
  // Main Customer Model
  // ============================================================================

  model Customer {
    id: CustomerId;
    name: string;
    contactInfo: ContactInfo;

    @doc("Customer gender")
    gender: CustomerGenderType | null;

    @doc("Birth date")
    birthDate: plainDate | null;

    @doc("Address")
    address: Address | null;

    @doc("Preferences and requirements")
    preferences: string | null;

    @doc("Internal notes")
    notes: string | null;

    @doc("Tags for categorization")
    tags: string[] | null;

    @doc("Current loyalty points")
    loyaltyPoints: int32 | null;

    @doc("Membership information")
    membership: MembershipInfo | null;

    @doc("NotificationType settings")
    notificationSettings: NotificationSettings | null;

    @doc("Health information")
    health: CustomerHealth | null;

    @doc("Customer preferences")
    customerPreferences: CustomerPreferences | null;

    @doc("Visit history")
    history: CustomerHistory | null;

    @doc("Customer associations")
    associations: CustomerAssociations | null;

    @doc("Customer status")
    status: CustomerStatusDetail | null;

    @doc("Customer metadata")
    metadata: CustomerMetadata | null;

    @doc("Medical chart ID")
    medicalChartId: MedicalChartId | null;

    @doc("Is active customer")
    isActive: boolean = true;

    @doc("Registration source")
    registrationSource: "walk_in" | "online" | "phone" | "referral" | null;

    @doc("Referrer customer ID")
    referredBy: CustomerId | null;

    ...AuditInfo;
  }

  @doc("Customer creation request with required and optional fields")
  model CreateCustomerRequest {
    // Required fields
    name: string;

    contactInfo: ContactInfo;

    // Optional fields
    preferences?: string;

    notes?: string;
    tags?: string[];
    birthDate?: plainDate;
  }

  @doc("Customer update request with optional fields for partial updates")
  model UpdateCustomerRequest {
    name?: string;
    contactInfo?: ContactInfo;
    preferences?: string;
    notes?: string;
    tags?: string[];
    birthDate?: plainDate;
  }

  @doc("Customer update request with reset capability")
  model UpdateCustomerRequestWithReset {
    name?: string;
    contactInfo?: ContactInfo;
    preferences?: string | null;
    notes?: string | null;
    tags?: string[] | null;
    birthDate?: plainDate | null;
  }

  model CustomerProfile extends Customer {
    visitCount: int32;
    lastVisitDate: utcDateTime | null;
    favoriteStaffIds: StaffId[] | null;
    favoriteServiceIds: ServiceId[] | null;
    totalSpent: int32;
  }

  /**
   * Customer search request with extended parameters
   * Extends from AdvancedSearchParams for pagination and advanced filtering
   */
  model SearchCustomerRequest extends AdvancedSearchParams {
    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("Search in customer name, email, or phone")
    search?: string;

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("Filter by customer tags")
    tags?: string[];

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("Filter by registration date from")
    registeredFrom?: utcDateTime;

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("Filter by registration date to")
    registeredTo?: utcDateTime;

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("Filter by customer status")
    status?: "active" | "inactive" | "suspended" | "deleted" | "blacklisted";

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("Filter by loyalty tier")
    loyaltyTier?: "bronze" | "silver" | "gold" | "platinum";
  }

  @doc("Customer reservations filter parameters")
  model GetCustomerReservationsRequest {
    @query status?: ReservationStatusType;
    @query from?: utcDateTime;
    @query to?: utcDateTime;
  }

  @doc("Customer bookings filter parameters")
  model GetCustomerBookingsRequest {
    @query status?: BookingStatusCodeType;
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
   * Notification preferences model
   */
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

  /**
   * Time preference model
   */
  model TimePreference {
    @doc("Day of week")
    dayOfWeek: DayOfWeekType;

    @doc("Preferred time slots")
    timeSlots: TimeSlot[];
  }

  /**
   * Customer preferences update model
   */
  model CustomerPreferencesUpdate {
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
}
