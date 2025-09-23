import "@typespec/http";

using TypeSpec.Http;

namespace BeautySalon.Models {
  using TypeSpec.OpenAPI;
  @doc("システム利用者（顧客・スタッフ・管理者）を一意に識別するブランド付きUUID。")
  @format("uuid")
  scalar UserId extends string;

  @doc("ログインセッションを追跡するためのブランド付きUUID。")
  @format("uuid")
  scalar SessionId extends string;

  @doc("サロン店舗・拠点を識別するためのブランド付きUUID。")
  @format("uuid")
  scalar SalonId extends string;

  @doc("施術スタッフや従業員を識別するためのブランド付きUUID。")
  @format("uuid")
  scalar StaffId extends string;

  @doc("提供メニュー・施術サービスを識別するためのブランド付きUUID。")
  @format("uuid")
  scalar ServiceId extends string;

  @doc("顧客（来店者）を識別するためのブランド付きUUID。")
  @format("uuid")
  scalar CustomerId extends string;

  @doc("予約申込レコードを識別するためのブランド付きUUID。")
  @format("uuid")
  scalar ReservationId extends string;

  @doc("確定済みの予約（スケジュール確保）を識別するブランド付きUUID。")
  @format("uuid")
  scalar BookingId extends string;

  @doc("顧客レビューや口コミを識別するブランド付きUUID。")
  @format("uuid")
  scalar ReviewId extends string;

  @doc("サービスカテゴリやメニュー分類を識別するブランド付きUUID。")
  @format("uuid")
  scalar CategoryId extends string;

  @doc("在庫アイテムや消耗品を識別するブランド付きUUID。")
  @format("uuid")
  scalar InventoryId extends string;

  @doc("サプライヤー発注・仕入れオーダーを識別するブランド付きUUID。")
  @format("uuid")
  scalar OrderId extends string;

  @doc("決済取引や請求のレコードを識別するブランド付きUUID。")
  @format("uuid")
  scalar PaymentId extends string;

  @doc("施術記録やカウンセリングメモを識別するブランド付きUUID。")
  @format("uuid")
  scalar TreatmentRecordId extends string;

  @doc("カルテ（メディカルチャート）を識別するブランド付きUUID。")
  @format("uuid")
  scalar MedicalChartId extends string;

  @doc("添付ファイル・画像データを識別するブランド付きUUID。")
  @format("uuid")
  scalar AttachmentId extends string;

  @doc("ロールベース権限管理で利用する役割IDを識別するブランド付きUUID。")
  @format("uuid")
  scalar RoleId extends string;

  @doc("アクセス許可や操作権限を識別するブランド付きUUID。")
  @format("uuid")
  scalar PermissionId extends string;

  @doc("顧客ポイントの加算・減算履歴を識別するブランド付きUUID。")
  @format("uuid")
  scalar PointTransactionId extends string;

  @doc("ロイヤルティプログラムの会員ランクを識別するブランド付きUUID。")
  @format("uuid")
  scalar LoyaltyTierId extends string;

  @doc("返金処理のトランザクションを識別するブランド付きUUID。")
  @format("uuid")
  scalar RefundId extends string;

  @doc("税率や金額計算で用いる汎用小数型。")
  scalar decimal extends float64;

  @doc("""
    曜日区分 - 営業日やスケジュール管理で使用される曜日の定義
    
    monday: 月曜日
    tuesday: 火曜日
    wednesday: 水曜日
    thursday: 木曜日
    friday: 金曜日
    saturday: 土曜日
    sunday: 日曜日
    """)
  enum DayOfWeekType {
    monday,
    tuesday,
    wednesday,
    thursday,
    friday,
    saturday,
    sunday,
  }

  @doc("""
    サービスカテゴリー区分 - サロンで提供される主要なサービスカテゴリーの定義
    
    cut: カット - ヘアカット、トリミング等の切断系サービス
    color: カラー - ヘアカラー、ハイライト等の染色系サービス
    perm: パーマ - パーマネント、デジタルパーマ等のウェーブ形成サービス
    treatment: トリートメント - ヘアトリートメント、ヘアケア等の補修・改善サービス
    spa: スパ - ヘッドスパ、リラクゼーション等の癒し系サービス
    other: その他 - 上記カテゴリーに分類されないサービス
    """)
  enum ServiceCategoryType {
    cut,
    color,
    perm,
    treatment,
    spa,
    other,
  }

  @doc("""
    予約ステータス区分 - 予約の進行状態を表す状態定義
    
    pending: 保留中 - 予約申込を受け付けたが、まだ確定していない状態
    confirmed: 確定済み - サロン側で予約が承認・確定された状態
    cancelled: キャンセル済み - 顧客またはサロン側により予約が取り消された状態
    completed: 完了 - 予約された施術が実施され、サービス提供が完了した状態
    no_show: 無断キャンセル - 顧客が事前連絡なしに来店しなかった状態
    """)
  enum ReservationStatusType {
    pending,
    confirmed,
    cancelled,
    completed,
    no_show,
  }

  @doc("""
    通貨コード区分 - ISO 4217準拠の通貨コード定義
    
    JPY: 日本円 - Japanese Yen
    USD: 米ドル - United States Dollar
    EUR: ユーロ - Euro
    GBP: 英ポンド - British Pound Sterling
    AUD: 豪ドル - Australian Dollar
    CAD: カナダドル - Canadian Dollar
    CNY: 中国人民元 - Chinese Yuan
    KRW: 韓国ウォン - South Korean Won
    SGD: シンガポールドル - Singapore Dollar
    TWD: 台湾ドル - Taiwan Dollar
    """)
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

  @doc("""
    在庫ステータス区分 - 商品・材料の在庫状態を表す区分
    
    in_stock: 在庫あり - 十分な在庫量がある状態
    low_stock: 在庫僅少 - 在庫量が設定された最小量に近づいている状態
    out_of_stock: 在庫切れ - 在庫がゼロになった状態
    ordered: 発注済み - 補充のための発注が行われた状態
    discontinued: 廃番 - 商品の取り扱いを終了した状態
    """)
  enum InventoryStatusType {
    in_stock,
    low_stock,
    out_of_stock,
    ordered,
    discontinued,
  }

  @doc("""
    発注ステータス区分 - 商品発注の進行状態を表す区分
    
    draft: 下書き - 発注内容を作成中の状態
    pending: 承認待ち - 発注内容が確定し、承認を待っている状態
    approved: 承認済み - 責任者により発注が承認された状態
    ordered: 発注済み - サプライヤーへ正式に発注が行われた状態
    shipped: 発送済み - サプライヤーから商品が発送された状態
    delivered: 配送完了 - 商品が到着し、受領が完了した状態
    cancelled: キャンセル - 発注が取り消された状態
    """)
  enum OrderStatusType {
    draft,
    pending,
    approved,
    ordered,
    shipped,
    delivered,
    cancelled,
  }

  @doc("""
    性別区分 - 顧客の性別を表す区分（多様性に配慮した選択肢を含む）
    
    male: 男性
    female: 女性
    other: その他 - 男性・女性以外の性自認を持つ方
    prefer_not_to_say: 回答しない - 性別の回答を希望しない方
    """)
  enum CustomerGenderType {
    male,
    female,
    other,
    prefer_not_to_say,
  }

  @doc("""
    施術タイプ区分 - サロンで提供される具体的な施術の種類
    
    cut: カット - ヘアカット、レイヤーカット等の切断技術
    color: カラー - ヘアカラー、白髪染め、ハイライト等の染色技術
    perm: パーマ - コールドパーマ、デジタルパーマ等のウェーブ技術
    treatment: トリートメント - ダメージケア、栄養補給等の毛髪改善技術
    head_spa: ヘッドスパ - 頭皮マッサージ、スカルプケア等の頭皮ケア技術
    styling: スタイリング - セット、アレンジ等のスタイリング技術
    extension: エクステンション - ヘアエクステ、増毛等の毛髪追加技術
    nail: ネイル - マニキュア、ジェルネイル等の爪装飾技術
    eyelash: まつげ - まつげエクステ、まつげパーマ等のまつげ装飾技術
    other: その他 - 上記に分類されない施術
    """)
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

  @doc("""
    通知タイプ区分 - 顧客への通知・連絡手段の種類
    
    email: Eメール - 電子メールによる通知
    sms: SMS - ショートメッセージサービスによる通知
    push: プッシュ通知 - モバイルアプリのプッシュ通知
    line: LINE - LINEメッセージングサービスによる通知
    """)
  enum NotificationType {
    email,
    sms,
    push,
    line,
  }

  @doc("""
    リマインダータイミング区分 - 予約リマインダーを送信するタイミングの設定
    
    one_day_before: 1日前 - 予約日の24時間前に通知
    three_hours_before: 3時間前 - 予約時刻の3時間前に通知
    one_hour_before: 1時間前 - 予約時刻の1時間前に通知
    thirty_minutes_before: 30分前 - 予約時刻の30分前に通知
    """)
  enum ReminderTimingType {
    one_day_before,
    three_hours_before,
    one_hour_before,
    thirty_minutes_before,
  }

  @doc("API全体で共通利用する業務エラーの基本モデル。")
  model Error {
    @doc("エラーの種類を特定するアプリケーション固有コード。")
    code: string;

    @doc("ユーザーまたはオペレーターに提示するエラーメッセージ。")
    message: string;

    @doc("デバッグやサポート対応に役立つ追加情報。任意項目。")
    details: Record<unknown> | null;
  }

  @doc("認証されていないアクセスを表す標準エラーモデル。")
  @error
  model UnauthorizedError {
    @doc("固定値UNAUTHORIZED。クライアントでのハンドリングを容易にする識別子。")
    code: "UNAUTHORIZED";

    @doc("エラー内容を伝えるメッセージ。")
    message: string;
  }

  @doc("一覧取得APIで利用するページネーション共通パラメータ。")
  model PaginationParams {
    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("1ページあたりの取得件数。省略時は20件。")
    limit?: int32 = 20;

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("取得開始位置を表すオフセット。省略時は0。")
    offset?: int32 = 0;
  }

  @doc("ページネーションされた一覧レスポンスの共通構造。")
  model PaginationResponse<T> {
    @doc("取得した要素の配列。")
    data: T[];

    @doc("条件に一致する全件数。")
    total: int32;

    @doc("1ページあたりの件数。")
    limit: int32;

    @doc("取得開始位置のオフセット。")
    offset: int32;
  }

  @doc("曜日別および特定日の営業時間を管理するモデル。")
  model OpeningHours {
    @doc("対象となる曜日。特定日設定のみの場合はnull。")
    dayOfWeek: DayOfWeekType | null;

    @doc("特別営業日の個別日付。通常スケジュールの場合はnull。")
    date: plainDate | null;

    @doc("開店時刻（HH:mm形式）。未設定の場合は休業扱い。")
    openTime: string | null;

    @doc("閉店時刻（HH:mm形式）。未設定の場合は休業扱い。")
    closeTime: string | null;

    @doc("休業日かどうかを示すフラグ。")
    isHoliday: boolean;

    @doc("祝日名称や社内呼称などの休業理由。未設定時はnull。")
    holidayName: string | null;

    @doc("備考や注意事項。未設定時はnull。")
    notes: string | null;
  }

  @doc("サロンや顧客の住所情報を表す共通モデル。")
  model Address {
    @doc("番地や建物名を含む詳細住所。")
    street: string;

    @doc("市区町村名。")
    city: string;

    @doc("都道府県名。")
    prefecture: string;

    @doc("郵便番号。未設定の場合はnull。")
    postalCode: string | null;

    @doc("国名。既定値はJapan。")
    country: string = "Japan";
  }

  @doc("顧客やサロンの連絡先情報を表す共通モデル。")
  model ContactInfo {
    @doc("主要連絡先として利用するメールアドレス。")
    email: string;

    @doc("主要連絡先として利用する電話番号。")
    phoneNumber: string;

    @doc("緊急連絡用などの予備電話番号。未設定時はnull。")
    alternativePhone: string | null;

    @doc("公式サイトや予約ページのURL。未設定時はnull。")
    websiteUrl: string | null;
  }

  @doc("作成・更新ユーザーとタイムスタンプを保持する共通監査情報。")
  model AuditInfo {
    @doc("レコード作成日時。")
    createdAt: utcDateTime;

    @doc("レコードを作成したユーザーID。匿名作成の場合はnull。")
    createdBy: string | null;

    @doc("レコード最終更新日時。")
    updatedAt: utcDateTime;

    @doc("レコードを最後に更新したユーザーID。匿名更新の場合はnull。")
    updatedBy: string | null;
  }

  @doc("ビジネスロジックの成功・失敗を明示する共通Result型。")
  union Result<TSuccess, TError = Error> {
    @doc("成功時の戻り値をラップした結果。")
    success: SuccessResult<TSuccess>,

    @doc("失敗時のエラー情報をラップした結果。")
    error: ErrorResult<TError>,
  }

  @doc("成功時のデータとステータスを保持するモデル。")
  model SuccessResult<T> {
    @doc("固定値success。成功結果であることを示す。")
    status: "success";

    @doc("成功時に返却するドメインデータ。")
    data: T;
  }

  @doc("失敗時のエラー情報とステータスを保持するモデル。")
  model ErrorResult<T = Error> {
    @doc("固定値error。エラー結果であることを示す。")
    status: "error";

    @doc("失敗時に返却するエラー情報。")
    error: T;
  }

  @doc("一覧検索で使用する共通クエリパラメータセット。")
  model SearchParams {
    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("フリーワード検索用キーワード。")
    q?: string;

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("並び替え対象カラム名。")
    sortBy?: string;

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("昇順ascまたは降順descの指定。")
    sortOrder?: "asc" | "desc";

    ...PaginationParams;
  }

  @doc("期間指定や有効期間に利用する共通レンジ型。")
  model DateRange {
    @doc("期間の開始日時。")
    startDate: utcDateTime;

    @doc("期間の終了日時。")
    endDate: utcDateTime;
  }

  @doc("税抜・税込計算に利用する金額モデル。")
  model Money {
    @doc("通貨の最小単位で表現した金額値。")
    value: int64;

    @doc("使用する通貨コード。")
    currency: CurrencyCodeType;

    @doc("適用税率。任意設定。")
    taxRate: decimal | null;
  }

  @doc("期間条件で絞り込むための共通クエリモデル。")
  model DateRangeFilter {
    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("検索対象期間の開始日時。")
    startDate?: utcDateTime;

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("検索対象期間の終了日時。")
    endDate?: utcDateTime;
  }

  @doc("金額レンジで絞り込むための共通クエリモデル。")
  model PriceRangeFilter {
    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("下限価格。未指定の場合は制限なし。")
    minPrice?: float32;

    #suppress "@typespec/http/metadata-ignored" "Treated as queryParams"
    @query
    @doc("上限価格。未指定の場合は制限なし。")
    maxPrice?: float32;
  }

  @doc("営業時間や休憩時間を表現する単一の時間帯スロット。")
  model TimeSlot {
    @doc("開始時刻（HH:mm形式、24時間表記）。")
    startTime: string;

    @doc("終了時刻（HH:mm形式、24時間表記）。")
    endTime: string;
  }

  @doc("曜日単位で管理する営業スケジュール設定。")
  model BusinessHours {
    @doc("設定の対象となる曜日。")
    dayOfWeek: DayOfWeekType;

    @doc("営業時間帯の一覧。複数設定で分割営業に対応。")
    operatingSlots: TimeSlot[];

    @doc("休憩時間や中断時間帯の一覧。未設定時はnull。")
    breakSlots: TimeSlot[] | null;

    @doc("当該曜日を休業扱いとする場合のフラグ。既定値はfalse。")
    isClosed: boolean = false;

    @doc("季節営業などの適用期間。未設定時は通年有効。")
    effectivePeriod: DateRange | null;

    @doc("営業基準となるタイムゾーンID。未設定時はサロン既定値。")
    timezone: string | null;
  }

  @doc("顧客への通知チャネルとリマインダー設定をまとめたモデル。")
  model NotificationSettings {
    @doc("利用を許可する通知チャネルの一覧。")
    types: NotificationType[];

    @doc("リマインダー送信タイミングの一覧。")
    reminderTimings: ReminderTimingType[];

    @doc("通知機能全体の有効・無効フラグ。")
    enabled: boolean;
  }

  @doc("顧客ロイヤルティポイントの累積状況を表すモデル。")
  model PointInfo {
    @doc("現在保持している有効ポイント数。")
    currentPoints: int32;

    @doc("累計で獲得したポイント総数。")
    totalEarnedPoints: int32;

    @doc("累計で利用（消費）したポイント総数。")
    totalUsedPoints: int32;

    @doc("失効予定のポイント数。未設定時はnull。")
    expiringPoints: int32 | null;

    @doc("最も早く失効するポイントの失効日。未設定時はnull。")
    expirationDate: utcDateTime | null;
  }

  @doc("サービスメニューを一覧表示や候補選択で参照する際の要約情報。")
  model ServiceSummary {
    @doc("サービスメニューを識別するID。")
    id: ServiceId;

    @doc("顧客向けに表示するサービス名称。")
    name: string;

    @doc("対象サービスの予約件数。統計未計算時はnull。")
    bookingCount: int32 | null;
  }

  @doc("スタッフ一覧や選択候補で利用する要約情報。")
  model StaffSummary {
    @doc("スタッフを識別するID。")
    id: StaffId;

    @doc("スタッフの表示名。")
    name: string;

    @doc("平均評価スコア。未評価の場合はnull。")
    rating: float32 | null;

    @doc("担当した予約件数。統計未計算時はnull。")
    bookingCount: int32 | null;
  }

  @doc("""
    ロイヤルティティア区分 - 顧客ロイヤルティプログラムの会員ランク
    
    bronze: ブロンズ - 基本会員ランク、初期段階の特典を提供
    silver: シルバー - 中級会員ランク、標準的な特典を提供
    gold: ゴールド - 上級会員ランク、優待特典を提供
    platinum: プラチナ - 最上級会員ランク、最高レベルの特典を提供
    """)
  enum LoyaltyTierType {
    bronze: "bronze",
    silver: "silver",
    gold: "gold",
    platinum: "platinum",
  }

  @doc("""
    連絡方法区分 - 顧客との連絡・コミュニケーション手段の優先設定
    
    email: Eメール - 電子メールによる連絡方法
    sms: SMS - ショートメッセージサービスによる連絡方法
    phone: 電話 - 音声通話による連絡方法
    push: プッシュ通知 - アプリ内プッシュ通知による連絡方法
    """)
  enum ContactMethodType {
    email: "email",
    sms: "sms",
    phone: "phone",
    push: "push",
  }
}
