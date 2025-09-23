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
    @doc("会員特典のタイプ。特典の種類を識別する")
    type: MembershipBenefitType;

    @doc("特典の割引率。割引特典以外の場合はnull")
    percentage: int32 | null;

    @doc("ポイント倍率。ポイント特典以外の場合はnull")
    multiplier: decimal | null;

    @doc("特典対象サービス名。サービス指定がない場合はnull")
    service: string | null;

    @doc("特典提供频度。频度指定がない場合はnull")
    frequency: "monthly" | "quarterly" | "yearly" | null;

    @doc("特典の価値。数値化できない場合はnull")
    value: int32 | null;

    @doc("特典の説明文。詳細説明が不要な場合はnull")
    description: string | null;
  }

  model MembershipInfo {
    @doc("会員ランク。顧客の現在のメンバーシップレベル")
    tier: MembershipTierType;

    @doc("会員登録日時。該当ランクになった日時")
    since: utcDateTime;

    @doc("現在享受可能な特典リスト。ランクに応じた特典の詳細")
    benefits: MembershipBenefitDetail[];

    @doc("専任担当者名。専任担当がいない場合はnull")
    dedicatedManager: string | null;

    @doc("現在保有ポイント数。利用可能なポイント残高")
    points: int32;

    @doc("累積獲得ポイント数。これまでに獲得した全ポイント")
    totalPointsEarned: int32;

    @doc("累積使用ポイント数。これまでに使用した全ポイント")
    totalPointsUsed: int32;

    @doc("失効予定のポイント数。失効予定がない場合はnull")
    expiringPoints: int32 | null;

    @doc("ポイント失効日時。失効予定がない場合はnull")
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
    @doc("顧客ステータスタイプ。現在の顧客アカウント状態")
    type: CustomerStatusType;

    @doc("ステータス変更理由。理由が不要な場合はnull")
    reason: string | null;

    @doc("ステータス変更日時。未設定の場合はnull")
    since: utcDateTime | null;

    @doc("ステータス有効期限。無期限の場合はnull")
    until: utcDateTime | null;

    @doc("ステータス変更者。システム自動変更の場合はnull")
    by: string | null;

    @doc("削除日時。削除されていない場合はnull")
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
    @doc("アレルギーのタイプ分類。物質の種類を示す")
    type: AllergyType;

    @doc("アレルギー物質一覧。該当なしの場合はnull")
    substances: string[] | null;

    @doc("アレルギー香料一覧。該当なしの場合はnull")
    fragrances: string[] | null;

    @doc("アレルギー金属一覧。該当なしの場合はnull")
    metals: string[] | null;

    @doc("アレルギー植物一覧。該当なしの場合はnull")
    plants: string[] | null;

    @doc("アレルギー詳細説明。追加情報がない場合はnull")
    description: string | null;

    @doc("アレルギーの重篤度。反応の強さと対応レベル")
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
    @doc("髪質タイプ。髪のクセや形状の分類")
    type: HairType;

    @doc("髪の太さ。一本あたりの毛髪の太さ")
    thickness: HairThicknessType;

    @doc("髪の状態リスト。ダメージや健康状態の詳細")
    condition: string[];

    @doc("化学処理履歴。カラーやパーマ等の施術履歴")
    chemicalHistory: string[];

    @doc("髪質に関する備考。特記事項がない場合はnull")
    notes: string | null;
  }

  model ScalpInfo {
    @doc("頭皮の状態。健康状態やケア必要性の分類")
    condition: ScalpConditionType;

    @doc("頭皮の敏感性リスト。特定の刺激への反応")
    sensitivities: string[];

    @doc("頭皮に関する備考。特記事項がない場合はnull")
    notes: string | null;
  }

  model CustomerHealth {
    @doc("アレルギー情報リスト。全てのアレルギー詳細")
    allergies: AllergyInfo[];

    @doc("髪質情報。情報提供がない場合はnull")
    hairInfo: HairInfo | null;

    @doc("頭皮情報。情報提供がない場合はnull")
    scalpInfo: ScalpInfo | null;

    @doc("既往症一覧。既往症がない場合はnull")
    medicalConditions: string[] | null;

    @doc("服用中の薬一覧。服用薬がない場合はnull")
    medications: string[] | null;

    @doc("妊娠状態。未確認または非該当の場合はnull")
    pregnancyStatus: boolean | null;

    @doc("特別な配慮事項。特にない場合はnull")
    specialNeeds: string | null;
  }

  // ============================================================================
  // Preferences and History
  // ============================================================================

  model StylePreference {
    @doc("希望の髪の長さ。特に希望がない場合はnull")
    preferredLength: string | null;

    @doc("希望のカラー一覧。特に希望がない場合はnull")
    preferredColors: string[] | null;

    @doc("避けたいスタイル一覧。特にない場合はnull")
    avoidStyles: string[] | null;

    @doc("参考画像URL一覧。画像がない場合はnull")
    inspirationImages: string[] | null;
  }

  model ServicePreference {
    @doc("お気に入りサービス一覧。特にない場合はnull")
    favoriteServices: ServiceId[] | null;

    @doc("避けたいサービス一覧。特にない場合はnull")
    avoidServices: ServiceId[] | null;

    @doc("希望施術時間（分）。特に希望がない場合はnull")
    preferredDuration: int32 | null;

    @doc("希望価格帯。特に希望がない場合はnull")
    preferredPriceRange: PriceRangeFilter | null;
  }

  model CustomerPreferences {
    @doc("スタイルの好み設定。設定がない場合はnull")
    stylePreferences: StylePreference | null;

    @doc("サービスの好み設定。設定がない場合はnull")
    servicePreferences: ServicePreference | null;

    @doc("連絡方法の好み設定。設定がない場合はnull")
    communicationPreferences: NotificationSettings | null;

    @doc("希望スタッフ一覧。指名がない場合はnull")
    preferredStaff: StaffId[] | null;

    @doc("避けたいスタッフ一覧。特にない場合はnull")
    avoidStaff: StaffId[] | null;

    @doc("希望曜日一覧。特に希望がない場合はnull")
    preferredDayOfWeek: DayOfWeekType[] | null;

    @doc("希望時間帯一覧。特に希望がない場合はnull")
    preferredTimeSlots: TimeSlot[] | null;

    @doc("特別なリクエスト。特にない場合はnull")
    specialRequests: string | null;

    @doc("希望言語。日本語で問題ない場合はnull")
    language: string | null;
  }

  model VisitHistory {
    @doc("総来店回数。これまでの来店実績の合計")
    visitCount: int32;

    @doc("初回来店日。未来店の場合はnull")
    firstVisitDate: utcDateTime | null;

    @doc("最終来店日。新規顧客でまだ来店がない場合はnull")
    lastVisitDate: utcDateTime | null;

    @doc("平均利用金額。利用実績がない場合はnull")
    averageSpendPerVisit: int32 | null;

    @doc("累計利用金額。これまでの総支払額")
    totalSpent: int32;

    @doc("キャンセル回数。予約をキャンセルした回数")
    cancelCount: int32;

    @doc("無断キャンセル回数。連絡なしで来店しなかった回数")
    noShowCount: int32;

    @doc("完了サービス数。正常に完了した施術の総数")
    completedServices: int32;
  }

  model CustomerHistory {
    @doc("来店履歴詳細。全ての来店関連情報")
    visits: VisitHistory;

    @doc("最後に利用したサービスID。利用実績がない場合はnull")
    lastServiceId: ServiceId | null;

    @doc("最後に担当したスタッフID。利用実績がない場合はnull")
    lastStaffId: StaffId | null;

    @doc("お気に入りサービスID一覧。頻繁に利用するサービス")
    favoriteServiceIds: ServiceId[];

    @doc("お気に入りスタッフID一覧。指名の多いスタッフ")
    favoriteStaffIds: StaffId[];

    @doc("過去の施術履歴。履歴がない場合はnull")
    pastTreatments: string[] | null;

    @doc("履歴に関するメモ。メモがない場合はnull")
    notes: string[] | null;
  }

  // ============================================================================
  // Associations
  // ============================================================================

  model CustomerAssociations {
    @doc("主要利用サロンID。特定のサロンがない場合はnull")
    primarySalonId: SalonId | null;

    @doc("訪問済サロンID一覧。これまでに利用した全サロン")
    visitedSalonIds: SalonId[];

    @doc("家族会員の顧客ID一覧。家族登録がない場合はnull")
    familyMemberIds: CustomerId[] | null;

    @doc("紹介元顧客ID。紹介ではない場合はnull")
    referredBy: CustomerId | null;

    @doc("紹介した顧客ID一覧。紹介実績がない場合はnull")
    referredCustomerIds: CustomerId[] | null;

    @doc("グループID。グループに属さない場合はnull")
    groupId: string | null;
  }

  // ============================================================================
  // Metadata
  // ============================================================================

  model CustomerMetadata {
    @doc("顧客獲得チャネル。不明の場合はnull")
    source:
      | "walk_in"
      | "online"
      | "phone"
      | "referral"
      | "social_media"
      | "advertisement"
      | null;

    @doc("キャンペーン名。キャンペーン経由でない場合はnull")
    campaign: string | null;

    @doc("分類タグ一覧。タグがない場合はnull")
    tags: string[] | null;

    @doc("カスタムフィールド。追加情報がない場合はnull")
    customFields: Record<unknown> | null;

    @doc("内部メモ一覧。メモがない場合はnull")
    internalNotes: string[] | null;

    @doc("リスクスコア。評価未実施の場合はnull")
    riskScore: int32 | null;

    @doc("生涯価値。計算未実施の場合はnull")
    lifetimeValue: int32 | null;

    @doc("最終更新者。システム自動更新の場合はnull")
    lastUpdatedBy: string | null;
  }
  // ============================================================================
  // Main Customer Model
  // ============================================================================

  model Customer {
    @doc("顧客を一意に識別するID。システム内で重複しない識別子")
    id: CustomerId;

    @doc("顧客氏名。フルネームまたは通称名")
    name: string;

    @doc("連絡先情報。メール、電話番号等の連絡手段")
    contactInfo: ContactInfo;

    @doc("顧客の性別。未登録または非公開の場合はnull")
    gender: CustomerGenderType | null;

    @doc("生年月日。未登録または非公開の場合はnull")
    birthDate: plainDate | null;

    @doc("住所情報。未登録の場合はnull")
    address: Address | null;

    @doc("顧客の好みや要望")
    preferences: Record<unknown>;

    @doc("内部メモ。メモがない場合はnull")
    notes: string | null;

    @doc("分類用タグ")
    tags: string[];

    @doc("現在のロイヤルティポイント")
    loyaltyPoints: int32;

    @doc("会員情報。非会員の場合はnull")
    membership: MembershipInfo | null;

    @doc("通知設定。設定がない場合はnull")
    notificationSettings: NotificationSettings | null;

    @doc("健康情報。情報提供がない場合はnull")
    health: CustomerHealth | null;

    @doc("顧客の好み設定。設定がない場合はnull")
    customerPreferences: CustomerPreferences | null;

    @doc("来店履歴。履歴がない場合はnull")
    history: CustomerHistory | null;

    @doc("顧客関連情報。関連がない場合はnull")
    associations: CustomerAssociations | null;

    @doc("顧客ステータス詳細。特別なステータスがない場合はnull")
    status: CustomerStatusDetail | null;

    @doc("顧客メタデータ。追加情報がない場合はnull")
    metadata: CustomerMetadata | null;

    @doc("カルテID。カルテがない場合はnull")
    medicalChartId: MedicalChartId | null;

    @doc("アクティブな顧客かどうか")
    isActive: boolean = true;

    @doc("登録経路。不明の場合はnull")
    registrationSource: "walk_in" | "online" | "phone" | "referral" | null;

    @doc("紹介元顧客ID。紹介ではない場合はnull")
    referredBy: CustomerId | null;

    ...AuditInfo;
  }

  @doc("顧客作成リクエスト。必須フィールドとオプションフィールドを含む")
  model CustomerCreateRequest {
    // Required fields
    @doc("顧客氏名。フルネームまたは通称名")
    name: string;

    @doc("連絡先情報。メール、電話番号等の連絡手段")
    contactInfo: ContactInfo;

    // All fields required but nullable for create (when base model is nullable)
    @doc("顧客の好みや要望。カスタム設定情報")
    preferences: Record<unknown>;

    @doc("内部メモ。スタッフ用の顧客に関する備考。メモがない場合はnull")
    notes: string | null;

    @doc("分類用タグ。顧客をグループ化するためのラベル")
    tags: string[];

    @doc("生年月日。年齢計算や誕生日特典に使用。未登録の場合はnull")
    birthDate: plainDate | null;
  }

  @doc("顧客更新リクエスト。部分更新のためのオプションフィールドを含む。null指定で値をリセット可能")
  model CustomerUpdateRequest {
    @doc("顧客氏名。フルネームまたは通称名")
    name?: string;

    @doc("連絡先情報。メール、電話番号等の連絡手段")
    contactInfo?: ContactInfo;

    @doc("顧客の好みや要望。カスタム設定情報")
    preferences?: Record<unknown>;

    @doc("内部メモ。スタッフ用の顧客に関する備考。null指定でリセット可能")
    notes?: string | null;

    @doc("分類用タグ。顧客をグループ化するためのラベル")
    tags?: string[];

    @doc("生年月日。年齢計算や誕生日特典に使用。null指定でリセット可能")
    birthDate?: plainDate | null;
  }

  model CustomerProfile extends Customer {
    @doc("総来店回数。これまでの来店実績の合計")
    visitCount: int32;

    @doc("最終来店日。新規顧客でまだ来店がない場合はnull")
    lastVisitDate: utcDateTime | null;

    @doc("お気に入りスタッフID一覧。指名がない場合はnull")
    favoriteStaffIds: StaffId[] | null;

    @doc("お気に入りサービスID一覧。お気に入りがない場合はnull")
    favoriteServiceIds: ServiceId[] | null;

    @doc("累計利用金額。これまでの総支払額")
    totalSpent: int32;
  }

  /**
   * Customer search request with extended parameters
   * Extends from AdvancedSearchParams for pagination and advanced filtering
   */
  model CustomerSearchRequest extends AdvancedSearchParams {
    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("顧客名、メール、または電話番号で検索")
    search?: string;

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("顧客タグでフィルタ")
    tags?: string[];

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("登録日開始でフィルタ")
    registeredFrom?: utcDateTime;

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("登録日終了でフィルタ")
    registeredTo?: utcDateTime;

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("顧客ステータスでフィルタ")
    status?: "active" | "inactive" | "suspended" | "deleted" | "blacklisted";

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("ロイヤルティティアでフィルタ")
    loyaltyTier?: "bronze" | "silver" | "gold" | "platinum";
  }

  @doc("顧客予約フィルタパラメータ")
  model CustomerReservationsGetRequest {
    @query status?: ReservationStatusType;
    @query from?: utcDateTime;
    @query to?: utcDateTime;
  }

  @doc("顧客予約フィルタパラメータ")
  model CustomerBookingsGetRequest {
    @query status?: BookingStatusCodeType;
  }

  /**
   * Customer statistics response
   */
  model CustomerStatistics {
    @doc("総予約数")
    totalBookings: int32;

    @doc("総支払額")
    totalSpent: Money;

    @doc("平均予約単価")
    averageBookingValue: Money;

    @doc("最終来店日")
    lastVisit: utcDateTime | null;

    @doc("お気に入りサービス")
    favoriteServices: ServiceSummary[];

    @doc("お気に入りスタッフ")
    favoriteStaff: StaffSummary[];

    @doc("ロイヤルティポイント")
    loyaltyPoints: int32;

    @doc("顧客登録日")
    customerSince: utcDateTime;

    @doc("キャンセル率")
    cancellationRate: float32;

    @doc("無断キャンセル率")
    noShowRate: float32;
  }

  /**
   * Notification preferences model
   */
  model NotificationPreferences {
    @doc("メール通知有効")
    email: boolean;

    @doc("SMS通知有効")
    sms: boolean;

    @doc("プッシュ通知有効")
    push: boolean;

    @doc("リマインダータイミング（予約の何時間前）")
    reminderHours: int32;
  }

  /**
   * Time preference model
   */
  model TimePreference {
    @doc("曜日")
    dayOfWeek: DayOfWeekType;

    @doc("希望時間帯")
    timeSlots: TimeSlot[];
  }

  /**
   * Customer preferences update model
   */
  @doc("顧客の好み設定更新リクエスト。通知設定や連絡方法の変更")
  model CustomerPreferencesUpdateRequest {
    @doc("希望連絡方法")
    contactMethod: ContactMethodType;

    @doc("通知設定")
    notifications: NotificationPreferences;

    @doc("マーケティング配信許可状態")
    marketingOptIn: boolean;

    @doc("希望言語")
    preferredLanguage?: string;

    @doc("アクセシビリティ要件")
    accessibilityRequirements?: string[];

    @doc("アレルギーや過敏症")
    allergies?: string[];

    @doc("希望予約時間")
    preferredTimes?: TimePreference[];
  }
}
