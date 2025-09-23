import "@typespec/http";
import "./_shared/common.tsp";
import "./booking.tsp";
import "./_shared/common-api-patterns.tsp";

using TypeSpec.Http;
using BeautySalon.Models;

namespace BeautySalon.Models {
  // ============================================================================
  // Membership Types
  // ============================================================================

  @doc("""
    会員ランク区分 - 顧客の会員ランクを表し、特典・優待内容を決定する区分
    
    regular: 一般会員 - 基本ランク、標準的なサービスを提供
    silver: シルバー会員 - 中級ランク、5%の基本割引等の特典付与
    gold: ゴールド会員 - 上級ランク、10%の割引や優先予約等の特典付与
    platinum: プラチナ会員 - 最上級ランク、15%の割引や特別サービス提供
    vip: VIP会員 - 特別会員、完全カスタマイズされた特別待遇を提供
    """)
  enum MembershipTierType {
    regular,
    silver,
    gold,
    platinum,
    vip,
  }

  @doc("""
    会員特典タイプ区分 - 会員ランクに応じて提供される特典の種類
    
    discount_rate: 割引率 - サービス料金に対するパーセンテージ割引
    point_multiplier: ポイント倍率 - 通常のポイント付与率に対する乗数
    priority_booking: 優先予約 - 一般公開前の優先的な予約権利
    free_service: 無料サービス - 特定サービスの無料提供
    birthday_special: 誕生日特典 - 誕生月に提供される特別サービス
    exclusive_access: 特別アクセス権 - VIP専用メニューや特別イベントへの参加権
    """)
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

  @doc("""
    顧客ステータス区分 - 顧客アカウントの活動状態や利用可否を表す区分
    
    active: アクティブ - 通常利用可能な状態
    inactive: 休眠中 - 長期間利用がないがアカウントは維持されている状態
    suspended: 停止中 - 一時的に利用が停止されている状態
    deleted: 削除済み - アカウントが論理削除された状態
    blacklisted: ブラックリスト - 利用を禁止された状態
    """)
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

  @doc("""
    アレルギータイプ区分 - 顧客が持つアレルギーの種類を分類、施術時の注意事項として使用
    
    chemical: 化学物質 - カラー剤、パーマ剤等の化学薬品に対するアレルギー
    fragrance: 香料 - 香水、シャンプー等の香料成分に対するアレルギー
    metal: 金属 - ヘアピン、ハサミ等の金属製品に対するアレルギー
    latex: ラテックス - 手袋等のゴム製品に対するアレルギー
    plant: 植物 - ヘナ、ハーブ等の植物由来成分に対するアレルギー
    other: その他 - 上記に分類されないアレルギー
    """)
  enum AllergyType {
    chemical,
    fragrance,
    metal,
    latex,
    plant,
    other,
  }

  @doc("""
    アレルギー重篤度区分 - アレルギー反応の重篤度を表し、対応レベルを決定
    
    mild: 軽度 - 軽いかゆみや赤み程度、通常の施術で注意すれば対応可能
    moderate: 中等度 - 明確な皮膚反応、特別な配慮や代替品の使用が必要
    severe: 重度 - 激しい反応、特定の施術を避けるべきレベル
    """)
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

  @doc("""
    髪質タイプ区分 - 顧客の髪のクセや形状を分類、適切な施術提案に使用
    
    straight: ストレート - 直毛、クセがほとんどない髪質
    wavy: ウェービー - 緩やかな波状、S字カーブの髪質
    curly: カーリー - 明確なカール、螺旋状の髪質
    coily: コイリー - 非常に細かいカール、ジグザグ状の髪質
    """)
  enum HairType {
    straight,
    wavy,
    curly,
    coily,
  }

  @doc("""
    髪の太さ区分 - 髪の毛一本の太さを分類、カットやスタイリングの参考に使用
    
    fine: 細毛 - 柔らかく細い髪、ボリュームが出にくい
    medium: 普通毛 - 平均的な太さの髪、扱いやすい
    thick: 太毛 - しっかりとした太い髪、ボリュームが出やすい
    """)
  enum HairThicknessType {
    fine,
    medium,
    thick,
  }

  @doc("""
    頭皮状態区分 - 頭皮の状態を分類、適切なケア方法の選択に使用
    
    normal: 正常 - 健康的な頭皮状態、特別なケア不要
    dry: 乾燥 - 乾燥しやすい頭皮、保湿ケアが必要
    oily: 脂性 - 皮脂分泌が多い頭皮、洗浄力のあるケアが必要
    sensitive: 敏感 - 刺激に弱い頭皮、低刺激の製品使用が必要
    """)
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
    preferences: Record<unknown>;

    @doc("Internal notes")
    notes: string | null;

    @doc("Tags for categorization")
    tags: string[];

    @doc("Current loyalty points")
    loyaltyPoints: int32;

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

    // All fields required but nullable for create (when base model is nullable)
    preferences: Record<unknown>;

    notes: string | null;
    tags: string[];
    birthDate: plainDate | null;
  }

  @doc("Customer update request with optional fields for partial updates. null指定で値をリセット可能")
  model UpdateCustomerRequest {
    name?: string;
    contactInfo?: ContactInfo;
    preferences?: Record<unknown>;
    notes?: string | null;
    tags?: string[];
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
  model CustomerReservationsGetRequest {
    @query status?: ReservationStatusType;
    @query from?: utcDateTime;
    @query to?: utcDateTime;
  }

  @doc("Customer bookings filter parameters")
  model CustomerBookingsGetRequest {
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
  model CustomerPreferencesUpdateRequest {
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
