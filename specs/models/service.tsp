import "@typespec/http";
import "./_shared/common.tsp";

using TypeSpec.Http;
using BeautySalon.Models;

namespace BeautySalon.Models {
  @doc("""
    カットサブカテゴリー区分 - カットサービスの詳細分類
    
    mens_cut: メンズカット - 男性向けヘアカットサービス
    womens_cut: レディースカット - 女性向けヘアカットサービス
    kids_cut: キッズカット - 子供向けヘアカットサービス
    bang_trim: 前髪カット - 前髪のみのカットサービス
    beard_trim: 髭トリミング - 髭の整えサービス
    """)
  enum CutSubCategoryType {
    mens_cut,
    womens_cut,
    kids_cut,
    bang_trim,
    beard_trim,
  }

  @doc("""
    カラーサブカテゴリー区分 - ヘアカラーリングサービスの詳細分類
    
    full_color: フルカラー - 髪全体を染めるサービス
    root_touch: リタッチ - 根元の伸びた部分のみを染めるサービス
    highlights: ハイライト - 部分的に明るい色を入れるサービス
    lowlights: ローライト - 部分的に暗い色を入れるサービス
    balayage: バレイヤージュ - グラデーション染め技法
    ombre: オンブレ - 根元から毛先にかけてグラデーション染め
    bleach: ブリーチ - 髪の色を抜く脱色サービス
    color_correction: カラーコレクション - 色ムラや失敗したカラーの修正
    """)
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

  @doc("""
    パーマサブカテゴリー区分 - パーマネントサービスの詳細分類
    
    regular_perm: 通常パーマ - コールドパーマ等の標準的なパーマ
    digital_perm: デジタルパーマ - 熱を使った形状記憶パーマ
    spiral_perm: スパイラルパーマ - 螺旋状の強いカールを作るパーマ
    body_wave: ボディウェーブ - 大きなウェーブを作るパーマ
    straightening: ストレートパーマ - 縮毛矯正や髪をストレートにする施術
    """)
  enum PermSubCategoryType {
    regular_perm,
    digital_perm,
    spiral_perm,
    body_wave,
    straightening,
  }

  @doc("""
    トリートメントサブカテゴリー区分 - ヘアトリートメントサービスの詳細分類
    
    deep_conditioning: ディープコンディショニング - 髪の内部まで栄養を浸透させるトリートメント
    protein_treatment: プロテイントリートメント - タンパク質を補給し髪を強化するトリートメント
    scalp_treatment: スカルプトリートメント - 頭皮ケアに特化したトリートメント
    keratin_treatment: ケラチントリートメント - ケラチンを補充し髪をストレートにするトリートメント
    olaplex: オラプレックス - ダメージした髪の内部結合を修復するトリートメント
    """)
  enum TreatmentSubCategoryType {
    deep_conditioning,
    protein_treatment,
    scalp_treatment,
    keratin_treatment,
    olaplex,
  }

  @doc("""
    スタイリングサブカテゴリー区分 - ヘアスタイリングサービスの詳細分類
    
    blowout: ブローアウト - ブロードライでボリュームを出すスタイリング
    updo: アップスタイル - まとめ髪、シニヨン等のヘアアレンジ
    braiding: 編み込み - 三つ編み、編み込みアレンジ等
    extensions: エクステンション - ヘアエクステの装着サービス
    event_styling: イベントスタイリング - 結婚式、パーティー等の特別なスタイリング
    """)
  enum StylingSubCategoryType {
    blowout,
    updo,
    braiding,
    extensions,
    event_styling,
  }

  @doc("""
    スパサブカテゴリー区分 - スパ・リラクゼーションサービスの詳細分類
    
    head_spa: ヘッドスパ - 頭部のマッサージと頭皮ケアを組み合わせたスパ
    scalp_massage: スカルプマッサージ - 頭皮の血行促進マッサージ
    aromatherapy: アロマテラピー - アロマオイルを使用したリラクゼーション
    relaxation: リラクゼーション - ストレス解消を目的とした総合的なケア
    """)
  enum SpaSubCategoryType {
    head_spa,
    scalp_massage,
    aromatherapy,
    relaxation,
  }

  @doc("""
    メイクアップサブカテゴリー区分 - メイクアップサービスの詳細分類
    
    everyday_makeup: デイリーメイク - 普段使いのナチュラルメイク
    event_makeup: イベントメイク - パーティーやイベント用の華やかなメイク
    bridal_makeup: ブライダルメイク - 花嫁向けの特別なメイクアップ
    photoshoot_makeup: 撮影用メイク - 写真撮影用のプロフェッショナルメイク
    """)
  enum MakeupSubCategoryType {
    everyday_makeup,
    event_makeup,
    bridal_makeup,
    photoshoot_makeup,
  }

  @doc("""
    ネイルサブカテゴリー区分 - ネイルケアサービスの詳細分類
    
    manicure: マニキュア - 手の爪のケアと装飾
    pedicure: ペディキュア - 足の爪のケアと装飾
    gel_nail: ジェルネイル - UV/LEDライトで硬化させるジェルネイル
    nail_art: ネイルアート - デザインや装飾を施したアートネイル
    nail_removal: ネイルリムーバル - ジェルやマニキュアの除去サービス
    """)
  enum NailSubCategoryType {
    manicure,
    pedicure,
    gel_nail,
    nail_art,
    nail_removal,
  }

  @doc("""
    価格戦略タイプ区分 - サービスの価格設定方法を定義
    
    fixed: 固定価格 - 常に同じ価格で提供
    tiered: 段階価格 - 条件によって価格が変わる段階制
    dynamic: 動的価格 - 需要や時間帯によって変動する価格
    package: パッケージ価格 - 複数サービスをセットで提供
    membership: 会員価格 - 会員ランクに応じた特別価格
    custom: カスタム価格 - 個別に設定される特別価格
    """)
  enum PricingStrategyType {
    fixed,
    tiered,
    dynamic,
    package,
    membership,
    custom,
  }

  @doc("段階制価格の設定情報")
  model PriceTier {
    @doc("価格段階の名称")
    name: string;

    @doc("段階の説明")
    description?: string;

    @doc("適用価格（税抜）")
    price: int32;

    @doc("この段階での施術時間")
    duration?: int32;

    @doc("適用条件の説明リスト")
    conditions?: string[];
  }

  @doc("料金調整に使用する変動要因")
  model PricingFactor {
    @doc("変動要因の種類")
    type: "day_of_week" | "time_of_day" | "staff_level" | "demand" | "season";

    @doc("条件に応じた倍率設定")
    multipliers?: Record<decimal>;

    @doc("ピーク時間帯の指定")
    peakHours?: string[];

    @doc("ピーク時間帯に適用する倍率")
    peakMultiplier?: decimal;

    @doc("需要に応じた閾値設定")
    threshold?: int32;

    @doc("季節要因の詳細設定")
    seasons?: Season[];
  }

  @doc("季節要因の定義")
  model Season {
    @doc("季節名")
    name: string;

    @doc("開始月")
    startMonth: int32;

    @doc("終了月")
    endMonth: int32;

    @doc("適用倍率")
    multiplier: decimal;
  }

  @doc("採用している価格戦略の詳細")
  model PricingStrategyDetail {
    @doc("価格戦略タイプ")
    type: PricingStrategyType;

    @doc("固定価格型の場合の金額")
    amount?: int32;

    @doc("段階価格の設定一覧")
    tiers?: PriceTier[];

    @doc("基準価格")
    basePrice?: int32;

    @doc("価格変動要因の設定")
    factors?: PricingFactor[];

    @doc("セット対象となるサービス ID")
    services?: ServiceId[];

    @doc("割引率（%）")
    discountRate?: decimal;

    @doc("会員向け特別価格")
    memberPrice?: int32;

    @doc("非会員向け価格")
    nonMemberPrice?: int32;

    @doc("戦略の説明")
    description?: string;
  }

  @doc("サービスの料金設定情報")
  model ServicePricing {
    @doc("採用している価格戦略")
    strategy: PricingStrategyDetail;

    @doc("税込価格かどうか")
    taxIncluded: boolean;

    @doc("通貨コード")
    currency: CurrencyCodeType;

    @doc("設定されている最低料金")
    minimumPrice?: int32;

    @doc("設定されている最高料金")
    maximumPrice?: int32;

    @doc("予約時にデポジットが必要か")
    depositRequired: boolean;

    @doc("必要なデポジット金額")
    depositAmount?: int32;

    @doc("キャンセル料金の設定")
    cancellationFee?: CancellationFee;
  }

  @doc("キャンセル料金のルール")
  model CancellationFee {
    @doc("キャンセル料金を適用する期限（時間）")
    hours: int32;

    @doc("キャンセル料金率（%）")
    percentage: int32;

    @doc("固定額で設定するキャンセル料金")
    fixedAmount?: int32;
  }

  @doc("""
    サービスオプションタイプ区分 - サービスに追加できるオプションの種類
    
    addon: アドオン - 基本サービスに追加できるオプション
    upgrade: アップグレード - サービスのグレードを上げるオプション
    duration: 時間延長 - サービス時間を延長するオプション
    product: 商品追加 - サービスに商品を含めるオプション
    combo: コンボ - 複数サービスの組み合わせオプション
    """)
  enum ServiceOptionType {
    addon,
    upgrade,
    duration,
    product,
    combo,
  }

  @doc("サービスに付随するオプション設定")
  model ServiceOptionDetail {
    @doc("オプションの種類")
    type: ServiceOptionType;

    @doc("オプション名")
    name?: string;

    @doc("オプション料金")
    price?: int32;

    @doc("追加される施術時間")
    duration?: int32;

    @doc("オプションの説明")
    description?: string;

    @doc("アップグレード元のレベル")
    fromLevel?: string;

    @doc("アップグレード先のレベル")
    toLevel?: string;

    @doc("追加料金")
    additionalPrice?: int32;

    @doc("時間延長（分）")
    extension?: int32;

    @doc("関連商品 ID")
    productId?: string;

    @doc("必須オプションかどうか")
    required?: boolean;

    @doc("同時予約が必要なサービス ID")
    withService?: ServiceId;

    @doc("割引金額")
    discountAmount?: int32;
  }

  @doc("""
    予約要件タイプ区分 - サービス予約時に必要な条件や制約
    
    deposit: デポジット - 予約時に支払う予約金
    consultation: 事前カウンセリング - 施術前の相談・カウンセリング
    patch_test: パッチテスト - アレルギー確認のための事前テスト
    age_restriction: 年齢制限 - 年齢による利用制限
    gender_restriction: 性別制限 - 性別による利用制限
    membership: 会員限定 - 特定の会員ランク以上の制限
    preparation: 事前準備 - 顧客が事前に行うべき準備
    """)
  enum BookingRequirementType {
    deposit,
    consultation,
    patch_test,
    age_restriction,
    gender_restriction,
    membership,
    preparation,
  }

  @doc("サービス予約時に必要な要件詳細")
  model BookingRequirementDetail {
    @doc("要件の種類")
    type: BookingRequirementType;

    @doc("金額要件（例: デポジット額）")
    amount?: int32;

    @doc("割合で設定する要件")
    percentage?: int32;

    @doc("必須かどうか")
    required?: boolean;

    @doc("所要時間や準備時間")
    duration?: int32;

    @doc("何日前までに対応が必要か")
    daysInAdvance?: int32;

    @doc("利用可能な最低年齢")
    minAge?: int32;

    @doc("利用可能な最高年齢")
    maxAge?: int32;

    @doc("利用可能な性別の制限")
    allowedGenders?: string[];

    @doc("必要な会員ランク")
    requiredTier?: string;

    @doc("顧客への具体的な指示")
    instructions?: string[];
  }

  @doc("""
    サービス提供可能性タイプ区分 - サービスが提供される時期や条件
    
    always: 常時提供 - いつでも利用可能なサービス
    scheduled: スケジュール制 - 特定の時間帯のみ提供
    by_appointment: 予約制 - 事前予約が必要なサービス
    seasonal: 季節限定 - 特定の季節のみ提供
    limited: 数量限定 - 提供数に制限があるサービス
    """)
  enum ServiceAvailabilityType {
    always,
    scheduled,
    by_appointment,
    seasonal,
    limited,
  }

  @doc("サービス提供スケジュール")
  model ServiceSchedule {
    @doc("曜日")
    dayOfWeek: DayOfWeekType;

    @doc("提供開始時刻（HH:mm）")
    startTime: string;

    @doc("提供終了時刻（HH:mm）")
    endTime: string;

    @doc("予約受け入れ上限数")
    maxBookings?: int32;
  }

  @doc("サービスの提供可否設定")
  model ServiceAvailabilityDetail {
    @doc("提供可否タイプ")
    type: ServiceAvailabilityType;

    @doc("曜日・時間帯のスケジュール")
    schedule?: ServiceSchedule[];

    @doc("事前承認が必要かどうか")
    requiresApproval?: boolean;

    @doc("季節限定時の季節設定")
    seasons?: Season[];

    @doc("1 日あたりの提供上限")
    maxPerDay?: int32;

    @doc("1 週間あたりの提供上限")
    maxPerWeek?: int32;
  }

  @doc("""
    サービスステータス区分 - サービスの提供状態を表す区分
    
    active: 有効 - 現在提供中のサービス
    inactive: 一時停止 - 一時的に提供を停止しているサービス
    seasonal: 季節限定 - 特定の季節のみ提供されるサービス
    limited: 数量限定 - 残りわずかなサービス
    discontinued: 廃止 - 提供を終了したサービス
    coming_soon: 近日公開 - 近々提供予定のサービス
    """)
  enum ServiceStatusType {
    active,
    inactive,
    seasonal,
    limited,
    discontinued,
    coming_soon,
  }

  @doc("サービスの提供状態の詳細")
  model ServiceStatusDetail {
    @doc("ステータス区分")
    type: ServiceStatusType;

    @doc("ステータス変更理由")
    reason?: string;

    @doc("この状態が開始した日時")
    since?: utcDateTime;

    @doc("提供可能な月の一覧")
    availableMonths?: int32[];

    @doc("提供終了予定日")
    availableUntil?: utcDateTime;

    @doc("残り提供可能枠数")
    remainingSlots?: int32;

    @doc("廃止日時")
    discontinuedAt?: utcDateTime;

    @doc("代替サービス ID")
    replacementId?: ServiceId;

    @doc("公開予定日")
    launchDate?: utcDateTime;
  }

  @doc("サービスの基本的な紹介情報")
  model ServiceInfo {
    @doc("サービス名称")
    name: string;

    @doc("サービス名の読み仮名")
    nameKana?: string;

    @doc("サービス詳細説明文")
    description: string;

    @doc("短めの紹介文")
    shortDescription?: string;

    @doc("提供価値・メリットの一覧")
    benefits?: string[];

    @doc("主な対象顧客層")
    targetCustomer?: string;

    @doc("サービス画像の URL 一覧")
    imageUrls?: string[];

    @doc("紹介動画の URL")
    videoUrl?: string;
  }

  @doc("サービス提供時間の設定")
  model ServiceDuration {
    @doc("標準施術時間（分）")
    standard: int32;

    @doc("最短施術時間")
    minimum?: int32;

    @doc("最長施術時間")
    maximum?: int32;

    @doc("施術前のバッファ時間")
    bufferBefore?: int32;

    @doc("施術後のバッファ時間")
    bufferAfter?: int32;

    @doc("カウンセリング時間を含むか")
    includesConsultation: boolean;
  }

  @doc("サービス提供時の制約条件")
  model ServiceRestrictions {
    @doc("必要なスタッフレベル")
    requiredStaffLevel?: StaffLevelType;

    @doc("必要資格の一覧")
    requiredCertifications?: string[];

    @doc("同時提供可能な最大件数")
    maxConcurrent?: int32;

    @doc("再予約までの最短間隔（日）")
    minIntervalDays?: int32;

    @doc("顧客ごとの予約上限設定")
    maxBookingsPerCustomer?: BookingLimit;

    @doc("提供不可日（ブラックアウト）一覧")
    blackoutDates?: utcDateTime[];
  }

  @doc("顧客単位の予約回数制限")
  model BookingLimit {
    @doc("制限期間の単位")
    period: "day" | "week" | "month";

    @doc("期間内の最大予約可能数")
    count: int32;
  }

  @doc("サービスの実績指標")
  model ServicePerformance {
    @doc("予約件数")
    bookingCount: int32;

    @doc("施術完了率")
    completionRate: decimal;

    @doc("平均評価スコア")
    averageRating?: decimal;

    @doc("レビュー件数")
    reviewCount: int32;

    @doc("売上実績（円）")
    revenue: int64;

    @doc("人気度スコア")
    popularityScore?: decimal;

    @doc("リピート率")
    repeatRate?: decimal;
  }

  @doc("サービス間・スタッフとの関連情報")
  model ServiceAssociations {
    @doc("紐づくカテゴリ ID")
    categoryId: CategoryId;

    @doc("親サービス ID")
    parentServiceId?: ServiceId;

    @doc("子サービス ID 一覧")
    childServiceIds?: ServiceId[];

    @doc("予約時に必須のサービス ID")
    requiredServiceIds?: ServiceId[];

    @doc("併用を推奨するサービス ID")
    recommendedServiceIds?: ServiceId[];

    @doc("施術資格を持つスタッフ ID")
    qualifiedStaffIds?: StaffId[];

    @doc("優先的に担当させたいスタッフ ID")
    preferredStaffIds?: StaffId[];
  }

  @doc("サービスのメタデータ情報")
  model ServiceMetadata {
    @doc("タグ一覧")
    tags?: string[];

    @doc("検索キーワード")
    keywords?: string[];

    @doc("SEO 用タイトル")
    seoTitle?: string;

    @doc("SEO 用ディスクリプション")
    seoDescription?: string;

    @doc("内部向けメモ")
    internalNotes?: string;

    @doc("表示順序")
    sortOrder?: int32;

    @doc("注目サービスとして表示するか")
    featured?: boolean;

    @doc("メニュー非表示フラグ")
    hideFromMenu?: boolean;
  }

  @doc("サロンで提供するサービスの統合モデル")
  model Service {
    @doc("サービス ID")
    id: ServiceId;

    @doc("サービスを提供するサロン ID")
    salonId: SalonId;

    @doc("サービスの紹介情報")
    info: ServiceInfo;

    @doc("サービスカテゴリ区分")
    category: ServiceCategoryType;

    @doc("カテゴリ ID（分類ツリー連携用）")
    categoryId?: CategoryId;

    @doc("料金設定情報")
    pricing: ServicePricing;

    @doc("提供時間の設定")
    duration: ServiceDuration;

    @doc("提供可能条件の設定")
    availability?: ServiceAvailabilityDetail;

    @doc("予約時に必要な要件一覧")
    requirements?: BookingRequirementDetail[];

    @doc("追加オプション設定")
    options?: ServiceOptionDetail[];

    @doc("提供上の制約条件")
    restrictions?: ServiceRestrictions;

    @doc("サービス実績の指標")
    performance?: ServicePerformance;

    @doc("関連サービス・担当者情報")
    associations?: ServiceAssociations;

    @doc("メタデータ・表示設定")
    metadata?: ServiceMetadata;

    @doc("現在の提供ステータス")
    status: ServiceStatusDetail;

    @doc("互換性維持のための旧項目：サービス名")
    name: string;

    @doc("互換性維持のための旧項目：説明文")
    description: string;

    @doc("互換性維持のための旧項目：料金")
    price: int32;

    @doc("互換性維持のための旧項目：画像 URL")
    imageUrl?: string;

    @doc("互換性維持のための旧項目：スタッフレベル")
    requiredStaffLevel?: int32;

    @doc("互換性維持のための旧項目：有効フラグ")
    isActive: boolean;

    ...AuditInfo;
  }

  @doc("サービスを新規登録するリクエスト")
  model CreateServiceRequest {
    @doc("サービスを登録するサロン ID")
    salonId: SalonId;

    @doc("サービス名")
    name: string;

    @doc("サービスの説明文")
    description: string;

    @doc("施術時間（分）")
    duration: int32;

    @doc("料金（税抜）")
    price: int32;

    @doc("サービスカテゴリ区分")
    category: ServiceCategoryType;

    @doc("カテゴリ ID")
    categoryId?: CategoryId;

    @doc("サービス画像 URL")
    imageUrl?: string;

    @doc("必要スタッフレベル")
    requiredStaffLevel?: int32;

    @doc("必要なデポジット額")
    depositAmount?: int32;

    @doc("有効フラグ")
    isActive?: boolean;

    @doc("最大全日予約可能日数")
    maxAdvanceBookingDays?: int32;

    @doc("最短予約受付時間（時間）")
    minAdvanceBookingHours?: int32;
  }

  @doc("サービス情報を部分更新するリクエスト")
  model UpdateServiceRequest {
    @doc("更新後のサービス名")
    name?: string;

    @doc("更新後の説明文")
    description?: string;

    @doc("更新後の施術時間")
    duration?: int32;

    @doc("更新後の料金")
    price?: int32;

    @doc("更新後のサービスカテゴリ")
    category?: ServiceCategoryType;

    @doc("更新後のカテゴリ ID")
    categoryId?: CategoryId;

    @doc("更新後の画像 URL")
    imageUrl?: string;

    @doc("更新後の必要スタッフレベル")
    requiredStaffLevel?: int32;

    @doc("更新後のデポジット額")
    depositAmount?: int32;

    @doc("更新後の有効フラグ")
    isActive?: boolean;

    @doc("更新後の最大予約日数")
    maxAdvanceBookingDays?: int32;

    @doc("更新後の最短予約受付時間")
    minAdvanceBookingHours?: int32;
  }

  @doc("値のリセットを含むサービス更新リクエスト")
  model UpdateServiceRequestWithReset {
    @doc("更新後のサービス名")
    name?: string;

    @doc("更新後の説明文")
    description?: string;

    @doc("更新後の施術時間")
    duration?: int32;

    @doc("更新後の料金")
    price?: int32;

    @doc("更新後のサービスカテゴリ")
    category?: ServiceCategoryType;

    @doc("更新後のカテゴリ ID（null 指定で解除）")
    categoryId?: CategoryId | null;

    @doc("更新後の画像 URL（null 指定で解除）")
    imageUrl?: string | null;

    @doc("更新後の必要スタッフレベル（null 指定で解除）")
    requiredStaffLevel?: int32 | null;

    @doc("更新後のデポジット額（null 指定で解除）")
    depositAmount?: int32 | null;

    @doc("更新後の有効フラグ")
    isActive?: boolean;

    @doc("更新後の最大予約日数（null 指定で解除）")
    maxAdvanceBookingDays?: int32 | null;

    @doc("更新後の最短予約受付時間（null 指定で解除）")
    minAdvanceBookingHours?: int32 | null;
  }

  @doc("サービスカテゴリの管理モデル")
  model CategoryModel {
    @doc("カテゴリ ID")
    id: CategoryId;

    @doc("カテゴリ名")
    name: string;

    @doc("カテゴリ説明")
    description: string;

    @doc("親カテゴリ ID")
    parentId?: CategoryId;

    @doc("表示順序")
    displayOrder: int32;

    @doc("有効フラグ")
    isActive: boolean;

    ...AuditInfo;
  }
}
