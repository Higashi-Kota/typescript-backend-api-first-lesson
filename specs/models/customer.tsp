import "@typespec/http";
import "./common.tsp";
import "./api-patterns.tsp";
import "./booking.tsp";

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

  model MembershipBenefit {
    type: MembershipBenefitType;
    percentage?: int32;
    multiplier?: decimal;
    serviceType?: string;
    frequency?: "monthly" | "quarterly" | "yearly";
    value?: int32;
    description?: string;
  }

  model MembershipInfo {
    tier: MembershipTierType;
    since: utcDateTime;
    benefits: MembershipBenefit[];
    dedicatedManager?: string;
    points: int32;
    totalPointsEarned: int32;
    totalPointsUsed: int32;
    expiringPoints?: int32;
    pointsExpireAt?: utcDateTime;
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
    reason?: string;
    since?: utcDateTime;
    until?: utcDateTime;
    by?: string;
    deletedAt?: utcDateTime;
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

  enum AllergySeverity {
    mild,
    moderate,
    severe,
  }

  model AllergyInfo {
    type: AllergyType;
    substances?: string[];
    fragrances?: string[];
    metals?: string[];
    plants?: string[];
    description?: string;
    severity: AllergySeverity;
  }

  enum HairType {
    straight,
    wavy,
    curly,
    coily,
  }

  enum HairThickness {
    fine,
    medium,
    thick,
  }

  enum ScalpCondition {
    normal,
    dry,
    oily,
    sensitive,
    dandruff,
  }

  model HairInfo {
    type: HairType;
    thickness: HairThickness;
    condition: string[];
    chemicalHistory: string[];
    notes?: string;
  }

  model ScalpInfo {
    condition: ScalpCondition;
    sensitivities: string[];
    notes?: string;
  }

  model CustomerHealth {
    allergies: AllergyInfo[];
    hairInfo?: HairInfo;
    scalpInfo?: ScalpInfo;
    medicalConditions?: string[];
    medications?: string[];
    pregnancyStatus?: boolean;
    specialNeeds?: string;
  }

  // ============================================================================
  // Preferences and History
  // ============================================================================

  model StylePreference {
    preferredLength?: string;
    preferredColors?: string[];
    avoidStyles?: string[];
    inspirationImages?: string[];
  }

  model ServicePreference {
    favoriteServices?: ServiceId[];
    avoidServices?: ServiceId[];
    preferredDuration?: int32;
    preferredPriceRange?: PriceRangeFilter;
  }

  model CustomerPreferences {
    stylePreferences?: StylePreference;
    servicePreferences?: ServicePreference;
    communicationPreferences?: NotificationSettings;
    preferredStaff?: StaffId[];
    avoidStaff?: StaffId[];
    preferredDayOfWeek?: DayOfWeek[];
    preferredTimeSlots?: TimeSlot[];
    specialRequests?: string;
    language?: string;
  }

  model VisitHistory {
    visitCount: int32;
    firstVisitDate?: utcDateTime;
    lastVisitDate?: utcDateTime;
    averageSpendPerVisit?: int32;
    totalSpent: int32;
    cancelCount: int32;
    noShowCount: int32;
    completedServices: int32;
  }

  model CustomerHistory {
    visits: VisitHistory;
    lastServiceId?: ServiceId;
    lastStaffId?: StaffId;
    favoriteServiceIds: ServiceId[];
    favoriteStaffIds: StaffId[];
    pastTreatments?: string[];
    notes?: string[];
  }

  // ============================================================================
  // Associations
  // ============================================================================

  model CustomerAssociations {
    primarySalonId?: SalonId;
    visitedSalonIds: SalonId[];
    familyMemberIds?: CustomerId[];
    referredBy?: CustomerId;
    referredCustomerIds?: CustomerId[];
    groupId?: string;
  }

  // ============================================================================
  // Metadata
  // ============================================================================

  model CustomerMetadata {
    source?: "walk_in" | "online" | "phone" | "referral" | "social_media" | "advertisement";
    campaign?: string;
    tags?: string[];
    customFields?: Record<unknown>;
    internalNotes?: string[];
    riskScore?: int32;
    lifetimeValue?: int32;
    lastUpdatedBy?: string;
  }
  // ============================================================================
  // Main Customer Model
  // ============================================================================

  model Customer {
    id: CustomerId;
    name: string;
    contactInfo: ContactInfo;
    
    @doc("Customer gender")
    gender?: CustomerGender;
    
    @doc("Birth date")
    birthDate?: plainDate;
    
    @doc("Address")
    address?: Address;
    
    @doc("Preferences and requirements")
    preferences?: string;
    
    @doc("Internal notes")
    notes?: string;
    
    @doc("Tags for categorization")
    tags?: string[];
    
    @doc("Current loyalty points")
    loyaltyPoints?: int32;
    
    @doc("Membership information")
    membership?: MembershipInfo;
    
    @doc("Notification settings")
    notificationSettings?: NotificationSettings;
    
    @doc("Health information")
    health?: CustomerHealth;

    @doc("Customer preferences")
    customerPreferences?: CustomerPreferences;

    @doc("Visit history")
    history?: CustomerHistory;

    @doc("Customer associations")
    associations?: CustomerAssociations;

    @doc("Customer status")
    status?: CustomerStatusDetail;

    @doc("Customer metadata")
    metadata?: CustomerMetadata;

    @doc("Medical chart ID")
    medicalChartId?: MedicalChartId;
    
    @doc("Is active customer")
    isActive: boolean = true;
    
    @doc("Registration source")
    registrationSource?: "walk_in" | "online" | "phone" | "referral";
    
    @doc("Referrer customer ID")
    referredBy?: CustomerId;
    
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
    lastVisitDate?: utcDateTime;
    favoriteStaffIds?: StaffId[];
    favoriteServiceIds?: ServiceId[];
    totalSpent: int32;
  }

  @doc("Customer search parameters - all fields are optional")
  model SearchCustomerRequest {
    @query search?: string;
    @query tags?: string[];
  }

  @doc("Customer reservations filter parameters")
  model GetCustomerReservationsRequest {
    @query status?: ReservationStatus;
    @query from?: utcDateTime;
    @query to?: utcDateTime;
  }

  @doc("Customer bookings filter parameters")
  model GetCustomerBookingsRequest {
    @query status?: BookingStatusCode;
  }
}
