import "@typespec/http";
import "./_shared/common.tsp";
import "./_shared/common-api-patterns.tsp";
import "./service.tsp";
import "./staff.tsp";
import "./customer.tsp";

using TypeSpec.Http;
using BeautySalon.Models;

namespace BeautySalon.Models {
  @doc("""
    サロン基本情報モデル - 美容室の店舗情報、顧客向け公開情報、運営に必要な基礎データを一元管理する
    """)
  model Salon {
    @doc("サロンを一意に識別するID")
    id: SalonId;

    @doc("公式名称またはブランド名称")
    name: string;

    @doc("サロンの特徴やコンセプトを伝える説明文。未設定の場合はnull")
    description: string | null;

    @doc("所在地・アクセス・郵便番号等を含む住所情報")
    address: Address;

    @doc("電話・メール・SNS等の問い合わせ窓口情報")
    contactInfo: ContactInfo;

    @doc("曜日別の基本営業時間帯一覧")
    openingHours: OpeningHours[];

    @doc("季節やキャンペーン等に合わせた営業スケジュール。通常営業時間のみの場合はnull")
    businessHours: BusinessHours[] | null;

    @doc("店舗写真や内装画像のURL一覧")
    imageUrls: string[];

    @doc("設備・サービス・こだわりポイント等の特徴タグ一覧")
    features: string[];

    @doc("顧客レビューから算出した平均評価。レビュー未登録の場合はnull")
    rating: float32 | null;

    @doc("蓄積されたレビュー件数。レビュー未登録の場合はnull")
    reviewCount: int32 | null;

    ...AuditInfo;
  }

  @doc("""
    サロン新規登録リクエスト - 全項目のキーが必須で、値は業務要件に応じてnull許可
    """)
  model CreateSalonRequest {
    @doc("新規登録時に必須となるサロン名")
    name: string;

    @doc("サロン紹介文。未設定の場合はnull")
    description: string | null;

    @doc("店舗の正規住所・連絡先配送先")
    address: Address;

    @doc("顧客問い合わせ用の電話やメール情報")
    contactInfo: ContactInfo;

    @doc("通常営業日の営業時間設定一覧")
    openingHours: OpeningHours[];

    @doc("特別営業スケジュールやシフト連動の営業時間。通常営業時間のみの場合はnull")
    businessHours: BusinessHours[] | null;

    @doc("店舗写真やメニュー画像のURL一覧")
    imageUrls: string[];

    @doc("バリアフリー対応や個室有無などの特徴タグ一覧")
    features: string[];
  }

  @doc("サロン情報を部分更新するためのリクエスト。null指定で値をリセット可能")
  model UpdateSalonRequest {
    @doc("名称変更を行う場合に指定")
    name?: string;

    @doc("紹介文を更新する場合に指定（null指定で初期化可能）")
    description?: string | null;

    @doc("住所情報の差し替えが必要な場合に指定")
    address?: Address;

    @doc("電話番号やメールアドレス等の連絡先を更新する場合に指定")
    contactInfo?: ContactInfo;

    @doc("通常営業時間の更新が必要な場合に指定")
    openingHours?: OpeningHours[];

    @doc("特別営業時間やシフト設定の更新に利用（null指定で初期化可能）")
    businessHours?: BusinessHours[] | null;

    @doc("画像URLリストを更新する場合に指定")
    imageUrls?: string[];

    @doc("特徴タグの追加・削除を行う場合に指定")
    features?: string[];
  }

  @doc("""
    サロン概要モデル - リスト表示や検索結果に必要な要約情報を提供
    """)
  model SalonSummary {
    @doc("対象サロンの一意なID")
    id: SalonId;

    @doc("表示用のサロン名称")
    name: string;

    @doc("ユーザーに提示する所在地情報")
    address: Address;

    @doc("レビュー平均値。レビュー未登録の場合はnull")
    rating: float32 | null;

    @doc("レビュー件数。レビュー未登録の場合はnull")
    reviewCount: int32 | null;
  }

  @doc("""
    サロン検索リクエスト - 高度な検索条件とページネーションを指定して店舗を絞り込む
    AdvancedSearchParamsを継承し、並び順やページ情報も含めて取得する
    """)
  model SalonSearchRequest extends AdvancedSearchParams {
    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("検索キーワード。qパラメータのエイリアス")
    keyword?: string;

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("市区町村名による絞り込み")
    city?: string;

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("都道府県名による絞り込み")
    prefecture?: string;

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("サービスカテゴリ（カット・カラー等）による絞り込み")
    categories?: ("cut" | "color" | "perm" | "treatment" | "spa" | "other")[];

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("設備やこだわり条件などの特徴タグによる絞り込み")
    features?: string[];

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("営業中サロンのみを対象にするかどうか")
    isActive?: boolean;

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("最低評価値による絞り込み")
    @minValue(0)
    @maxValue(5)
    minRating?: float32;

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("検索基点からの最大距離（km）")
    @minValue(0)
    maxDistance?: float32;

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("距離計算に使用する基準緯度")
    lat?: float64;

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("距離計算に使用する基準経度")
    lon?: float64;

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("現在営業中かどうかで絞り込むフラグ")
    openNow?: boolean;

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("特定日時に営業しているサロンを探すための基準日時")
    openAt?: utcDateTime;
  }

  @doc("サロン運営指標を集計したダッシュボード向けレスポンスモデル")
  model SalonStatistics {
    @doc("登録されている提供メニューの総数")
    totalServices: int32;

    @doc("在籍スタッフの総数")
    totalStaff: int32;

    @doc("レビューから算出した平均評価。レビュー未登録の場合はnull")
    averageRating: float32 | null;

    @doc("累計レビュー件数")
    totalReviews: int32;

    @doc("当月の予約件数合計")
    monthlyBookings: int32;

    @doc("当月の売上総額。売上未集計の場合はnull")
    monthlyRevenue: Money | null;

    @doc("人気の高いサービス一覧")
    popularServices: ServiceSummary[];

    @doc("予約が集中する時間帯の一覧")
    busyHours: TimeSlot[];
  }

  @doc("指定した条件でサロンの予約枠の空き状況を確認するためのリクエスト")
  model SalonAvailabilityRequest {
    @doc("空き状況を確認したいサービスのID")
    serviceId: ServiceId;

    @doc("希望する施術日")
    date: plainDate;

    @doc("希望する時間帯。未指定の場合は全時間帯を対象")
    timeSlot?: TimeSlot;

    @doc("指名したいスタッフのID。指名なしの場合はnull")
    staffId?: StaffId;

    @doc("必要な枠数。デフォルトは1枠")
    @minValue(1)
    slots?: int32 = 1;
  }

  @doc("サロンの空き状況照会結果を返すレスポンス")
  model SalonAvailabilityResponse {
    @doc("予約可能な時間帯候補一覧")
    availableSlots: AvailableTimeSlot[];

    @doc("希望日が満席の場合に提示する次の空き日。空きがない場合はnull")
    nextAvailableDate: plainDate | null;

    @doc("ウェイトリスト登録の可否")
    waitlistAvailable: boolean;
  }

  @doc("予約可能な時間帯の詳細情報モデル")
  model AvailableTimeSlot {
    @doc("開始日時")
    startTime: utcDateTime;

    @doc("終了日時")
    endTime: utcDateTime;

    @doc("対応可能なスタッフの一覧")
    availableStaff: StaffSummary[];

    @doc("対応可能枠の充足率（%）")
    availability: int32;
  }

  @doc("検索基準地点からの距離情報を付与したサロンモデル")
  model SalonWithDistance extends Salon {
    @doc("基準地点からの距離（km）")
    distance: float32;

    @doc("想定移動時間（分）。計算不可の場合はnull")
    travelTime: int32 | null;
  }

  @doc("パーソナライズされたおすすめ度スコアを含むサロン推薦モデル")
  model SalonRecommendation extends SalonSummary {
    @doc("サロン推薦スコア（0-100）")
    score: int32;

    @doc("推薦理由のリスト")
    reasons: string[];

    @doc("要望に合致したサービス一覧")
    matchingServices: ServiceSummary[];
  }

  @doc("スタッフの勤務スケジュールと例外設定を管理するモデル")
  model StaffScheduleManagement {
    @doc("対象スタッフのID")
    staffId: StaffId;

    @doc("所属サロンのID")
    salonId: SalonId;

    @doc("通常勤務時間帯の一覧")
    regularHours: BusinessHours[];

    @doc("休暇や研修などの例外設定一覧")
    exceptions: ScheduleException[];

    @doc("スケジュールが有効になる開始日時")
    effectiveFrom: utcDateTime;

    @doc("スケジュールの終了日時。無期限の場合はnull")
    effectiveTo: utcDateTime | null;

    ...AuditTrail;
  }

  @doc("スタッフに発生する例外スケジュール（休暇・研修等）を表すモデル")
  model ScheduleException {
    @doc("例外が適用される日付")
    date: plainDate;

    @doc("例外の種別（休暇・病欠など）")
    type: "holiday" | "sick_leave" | "vacation" | "training" | "other";

    @doc("補足説明や注意事項。特記事項がない場合はnull")
    description: string | null;

    @doc("代替対応するスタッフのID。代替スタッフ未手配の場合はnull")
    alternativeStaffId: StaffId | null;
  }

  @doc("サロンからの最新情報通知を希望する顧客の購読リクエスト")
  model SalonSubscriptionRequest {
    @doc("通知を受け取る顧客ID")
    customerId: CustomerId;

    @doc("希望する通知カテゴリの種類一覧")
    notificationTypes: NotificationType[];

    @doc("関心の高いサービスカテゴリ。未指定の場合は全カテゴリ対象")
    categories: ("cut" | "color" | "perm" | "treatment" | "spa" | "other")[];
  }

  @doc("サロン通知購読の作成結果を返すレスポンスモデル")
  model SalonSubscriptionResponse {
    @doc("購読設定を一意に識別するID")
    subscriptionId: string;

    @doc("購読状態（常にactiveを返却）")
    status: "active";

    @doc("購読の有効期限。無期限の場合はnull")
    expiresAt: utcDateTime | null;
  }

  @doc("スタッフの勤務スケジュールを更新するためのリクエスト")
  model StaffScheduleUpdateRequest {
    @doc("更新後の通常勤務時間帯一覧")
    regularHours: BusinessHours[];

    @doc("休暇や特例などの例外設定一覧。例外がない場合はnull")
    exceptions: ScheduleException[] | null;

    @doc("更新内容の適用開始日時")
    effectiveFrom: utcDateTime;

    @doc("適用終了日時。無期限の場合はnull")
    effectiveTo: utcDateTime | null;
  }
}
