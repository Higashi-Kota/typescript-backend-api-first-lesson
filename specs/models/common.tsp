import "@typespec/http";

using TypeSpec.Http;

namespace BeautySalon.Models {
  using TypeSpec.OpenAPI;
  // ID Types (Brand型)
  // These are branded types that will be transformed during TypeScript generation
  // The format annotation helps identify them as branded types
  @format("uuid")
  @doc("Branded UUID type for User ID")
  scalar UserId extends string;

  @format("uuid")
  @doc("Branded UUID type for Session ID")
  scalar SessionId extends string;

  @format("uuid")
  @doc("Branded UUID type for Salon ID")
  scalar SalonId extends string;

  @format("uuid")
  @doc("Branded UUID type for Staff ID")
  scalar StaffId extends string;

  @format("uuid")
  @doc("Branded UUID type for Service ID")
  scalar ServiceId extends string;

  @format("uuid")
  @doc("Branded UUID type for Customer ID")
  scalar CustomerId extends string;

  @format("uuid")
  @doc("Branded UUID type for Reservation ID")
  scalar ReservationId extends string;

  @format("uuid")
  @doc("Branded UUID type for Booking ID")
  scalar BookingId extends string;

  @format("uuid")
  @doc("Branded UUID type for Review ID")
  scalar ReviewId extends string;

  @format("uuid")
  @doc("Branded UUID type for Category ID")
  scalar CategoryId extends string;

  @format("uuid")
  @doc("Branded UUID type for Inventory ID")
  scalar InventoryId extends string;

  @format("uuid")
  @doc("Branded UUID type for Order ID")
  scalar OrderId extends string;

  @format("uuid")
  @doc("Branded UUID type for Payment ID")
  scalar PaymentId extends string;

  @format("uuid")
  @doc("Branded UUID type for TreatmentType Record ID")
  scalar TreatmentRecordId extends string;

  @format("uuid")
  @doc("Branded UUID type for Medical Chart ID")
  scalar MedicalChartId extends string;

  @format("uuid")
  @doc("Branded UUID type for Attachment ID")
  scalar AttachmentId extends string;

  @format("uuid")
  @doc("Branded UUID type for Role ID")
  scalar RoleId extends string;

  @format("uuid")
  @doc("Branded UUID type for Permission ID")
  scalar PermissionId extends string;

  @format("uuid")
  @doc("Branded UUID type for Point Transaction ID")
  scalar PointTransactionId extends string;

  @format("uuid")
  @doc("Branded UUID type for Loyalty Tier ID")
  scalar LoyaltyTierId extends string;

  @format("uuid")
  @doc("Branded UUID type for Refund ID")
  scalar RefundId extends string;
  scalar decimal extends float64;

  enum DayOfWeekType {
    monday,
    tuesday,
    wednesday,
    thursday,
    friday,
    saturday,
    sunday,
  }

  @doc("Service category types")
  enum ServiceCategoryType {
    cut,
    color,
    perm,
    treatment,
    spa,
    other,
  }

  enum ReservationStatusType {
    pending,
    confirmed,
    cancelled,
    completed,
    no_show,
  }

  enum CurrencyCodeType {
    JPY,
    USD,
    EUR,
    GBP,
    AUD,
    CAD,
    CNY,
    KRW,
    SGD,
    TWD,
  }

  enum InventoryStatusType {
    in_stock,
    low_stock,
    out_of_stock,
    ordered,
    discontinued,
  }

  enum OrderStatusType {
    draft,
    pending,
    approved,
    ordered,
    shipped,
    delivered,
    cancelled,
  }

  enum CustomerGenderType {
    male,
    female,
    other,
    prefer_not_to_say,
  }

  enum TreatmentType {
    cut,
    color,
    perm,
    treatment,
    head_spa,
    styling,
    extension,
    nail,
    eyelash,
    other,
  }

  enum NotificationType {
    email,
    sms,
    push,
    line,
  }

  enum ReminderTimingType {
    one_day_before,
    three_hours_before,
    one_hour_before,
    thirty_minutes_before,
  }

  model Error {
    code: string;
    message: string;
    details?: Record<unknown>;
  }

  @error
  model UnauthorizedError {
    code: "UNAUTHORIZED";
    message: string;
  }

  model PaginationParams {
    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query limit?: int32 = 20;
    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query offset?: int32 = 0;
  }

  model PaginationResponse<T> {
    data: T[];
    total: int32;
    limit: int32;
    offset: int32;
  }

  model OpeningHours {
    dayOfWeek: DayOfWeekType;
    openTime: string;
    closeTime: string;
    isHoliday: boolean;
  }

  model Address {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string = "Japan";
  }

  model ContactInfo {
    email: string;
    phoneNumber: string;
    alternativePhone?: string;
  }

  model AuditInfo {
    createdAt: utcDateTime;
    createdBy?: string;
    updatedAt: utcDateTime;
    updatedBy?: string;
  }

  // Result型 - Sum型パターン（シンプルなunion型として定義）
  union Result<TSuccess, TError = Error> {
    success: SuccessResult<TSuccess>,
    error: ErrorResult<TError>,
  }

  model SuccessResult<T> {
    status: "success";
    data: T;
  }

  model ErrorResult<T = Error> {
    status: "error";
    error: T;
  }

  // 検索パラメータ
  model SearchParams {
    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query q?: string;
    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query sortBy?: string;
    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query sortOrder?: "asc" | "desc";
    ...PaginationParams;
  }

  // 共通期間型
  model DateRange {
    startDate: utcDateTime;
    endDate: utcDateTime;
  }

  model Money {
    value: int64;
    currency: CurrencyCodeType;
    taxRate?: decimal;
  }

  // 日付範囲フィルタ
  model DateRangeFilter {
    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query startDate?: utcDateTime;
    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query endDate?: utcDateTime;
  }

  // 価格範囲フィルタ
  model PriceRangeFilter {
    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query minPrice?: float32;
    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query maxPrice?: float32;
  }

  // 時間スロット
  model TimeSlot {
    startTime: string; // HH:mm format
    endTime: string; // HH:mm format
  }

  model BusinessHours {
    dayOfWeek: DayOfWeekType;
    operatingSlots: TimeSlot[];
    breakSlots?: TimeSlot[];
    isClosed: boolean = false;
    effectivePeriod?: DateRange;
    timezone?: string;
  }

  // 通知設定
  model NotificationSettings {
    types: NotificationType[];
    reminderTimings: ReminderTimingType[];
    enabled: boolean;
  }

  // ポイント情報
  model PointInfo {
    currentPoints: int32;
    totalEarnedPoints: int32;
    totalUsedPoints: int32;
    expiringPoints?: int32;
    expirationDate?: utcDateTime;
  }

  /**
   * Service summary for various contexts
   */
  model ServiceSummary {
    id: ServiceId;
    name: string;
    bookingCount?: int32;
  }

  /**
   * Staff summary for various contexts
   */
  model StaffSummary {
    id: StaffId;
    name: string;
    rating?: float32;
    bookingCount?: int32;
  }

  /**
   * Loyalty tier enum
   */
  enum LoyaltyTierType {
    bronze: "bronze",
    silver: "silver",
    gold: "gold",
    platinum: "platinum",
  }

  /**
   * Contact method enum
   */
  enum ContactMethodType {
    email: "email",
    sms: "sms",
    phone: "phone",
    push: "push",
  }
}
