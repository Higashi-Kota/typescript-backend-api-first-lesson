import "@typespec/http";
import "./_shared/common.tsp";

using TypeSpec.Http;
using BeautySalon.Models;

namespace BeautySalon.Models {
  @doc("""
    スタッフシフトモデル - 通常勤務スケジュールと休憩時間、適用期間を定義し、予約可能時間の算出に利用する
    """)
  model StaffSchedule {
    @doc("対象となる曜日")
    dayOfWeek: DayOfWeekType;

    @doc("勤務開始時刻 (フォーマット例: HH:mm)")
    startTime: string;

    @doc("勤務終了時刻 (フォーマット例: HH:mm)")
    endTime: string;

    @doc("当日の休憩時間帯リスト - 休憩なしのフル勤務の場合はnull")
    breakTime: TimeSlot[] | null;

    @doc("シフトが有効となる期間 - 無期限スケジュールの場合はnull")
    effectivePeriod: DateRange | null;
  }

  @doc("""
    スタッフ資格モデル - 保有資格や認定情報を管理し、サービス提供に必要なスキル証明を保持する
    """)
  model StaffQualification {
    @doc("資格・認定の名称")
    name: string;

    @doc("資格を取得した日付")
    certificationDate: plainDate;

    @doc("資格の有効期限 - 無期限資格や更新不要の資格の場合はnull")
    expiryDate: plainDate | null;

    @doc("資格を発行した機関名 - 発行機関が不明または未記録の場合はnull")
    issuer: string | null;

    @doc("資格証明番号などの識別子 - 証明番号がない内部認定やサロン独自資格の場合はnull")
    credentialId: string | null;
  }

  @doc("""
    スタッフ権限モデル - スタッフアカウントに付与された操作対象と権限範囲を定義する
    """)
  model StaffPermission {
    @doc("操作対象リソースの識別子")
    resource: string;

    @doc("許可されたアクションの一覧")
    actions: string[];

    @doc("権限が適用される範囲や条件 - 全体権限の場合や特定範囲がない場合はnull")
    scope: string | null;

    @doc("権限の有効期限 (UTC) - 無期限権限の場合はnull")
    expiresAt: utcDateTime | null;
  }

  @doc("""
    スタッフモデル - サロンに所属するスタッフのプロフィール・資格・スケジュール・権限を統合管理する
    """)
  model Staff {
    @doc("スタッフを一意に識別するID")
    id: StaffId;

    @doc("所属サロンのID")
    salonId: SalonId;

    @doc("スタッフの氏名")
    name: string;

    @doc("連絡先情報 (電話・メール等)")
    contactInfo: ContactInfo;

    @doc("得意分野や専門メニューの一覧")
    specialties: string[];

    @doc("プロフィール画像のURL - プロフィール画像未設定の場合はnull")
    imageUrl: string | null;

    @doc("自己紹介や経歴の概要 - プロフィール未記入の新人スタッフの場合はnull")
    bio: string | null;

    @doc("実務経験年数 - 経験年数未記載またはアシスタントスタッフの場合はnull")
    yearsOfExperience: int32 | null;

    @doc("保有資格名の一覧 (テキスト管理) - 資格なしの新人やアシスタントの場合はnull")
    certifications: string[] | null;

    @doc("詳細な資格情報の一覧 - 詳細資格情報未登録の場合はnull")
    qualifications: StaffQualification[] | null;

    @doc("通常勤務スケジュールの一覧 - スケジュール未設定やフリーランススタッフの場合はnull")
    schedules: StaffSchedule[] | null;

    @doc("現在スタッフがアクティブに勤務可能かを示すフラグ")
    isActive: boolean;

    @doc("システム上で付与されている追加権限一覧 - 特別権限がない一般スタッフの場合はnull")
    permissions: StaffPermission[] | null;

    ...AuditInfo;
  }

  @doc("""
    スタッフ作成リクエスト - 新規スタッフ登録時に必要なプロフィール・連絡先・スケジュール情報を受け取る
    """)
  model CreateStaffRequest {
    @doc("所属サロンのID")
    salonId: SalonId;

    @doc("スタッフの氏名")
    name: string;

    @doc("連絡先情報")
    contactInfo: ContactInfo;

    @doc("得意分野や専門メニューの一覧")
    specialties: string[];

    @doc("プロフィール画像のURL - プロフィール画像未設定の場合はnull")
    imageUrl: string | null;

    @doc("自己紹介や経歴の概要 - プロフィール未記入の新人スタッフの場合はnull")
    bio: string | null;

    @doc("実務経験年数 - 経験年数未記載またはアシスタントスタッフの場合はnull")
    yearsOfExperience: int32 | null;

    @doc("保有資格名の一覧 - 資格なしの新人やアシスタントの場合はnull")
    certifications: string[] | null;

    @doc("詳細な資格情報の一覧 - 詳細資格情報未登録の場合はnull")
    qualifications: StaffQualification[] | null;

    @doc("通常勤務スケジュールの一覧 - スケジュール未設定やフリーランススタッフの場合はnull")
    schedules: StaffSchedule[] | null;

    @doc("付与する権限の一覧 - 特別権限がない一般スタッフの場合はnull")
    permissions: StaffPermission[] | null;
  }

  @doc("""
    スタッフ更新リクエスト - 任意項目を部分更新し、プロフィールや勤務状況を柔軟に調整する。null指定で値をリセット可能
    """)
  model UpdateStaffRequest {
    @doc("スタッフ名の更新")
    name?: string;

    @doc("連絡先情報の更新")
    contactInfo?: ContactInfo;

    @doc("得意分野一覧の更新")
    specialties?: string[];

    @doc("プロフィール画像URLの更新（null指定で初期化可能）")
    imageUrl?: string | null;

    @doc("自己紹介文の更新（null指定で初期化可能）")
    bio?: string | null;

    @doc("経験年数の更新（null指定で初期化可能）")
    yearsOfExperience?: int32 | null;

    @doc("資格名一覧の更新（null指定で初期化可能）")
    certifications?: string[] | null;

    @doc("資格詳細一覧の更新（null指定で初期化可能）")
    qualifications?: StaffQualification[] | null;

    @doc("勤務スケジュール一覧の更新（null指定で初期化可能）")
    schedules?: StaffSchedule[] | null;

    @doc("付与権限一覧の更新（null指定で初期化可能）")
    permissions?: StaffPermission[] | null;

    @doc("アクティブ状態の更新")
    isActive?: boolean;
  }

  @doc("""
    スタッフ空き状況モデル - 個別時間帯の空き枠を表し、スポット予約や検索レスポンスに利用する
    """)
  model StaffAvailability {
    @doc("対象スタッフのID")
    staffId: StaffId;

    @doc("対象曜日")
    dayOfWeek: DayOfWeekType;

    @doc("空き枠の開始時刻 (HH:mm)")
    startTime: string;

    @doc("空き枠の終了時刻 (HH:mm)")
    endTime: string;

    @doc("休憩などの開始時刻 - 休憩なしの連続勤務の場合はnull")
    breakStart: string | null;

    @doc("休憩などの終了時刻 - 休憩なしの連続勤務の場合はnull")
    breakEnd: string | null;
  }
}
