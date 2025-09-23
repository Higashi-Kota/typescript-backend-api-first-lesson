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

    @doc("当日の休憩時間帯リスト")
    breakTime?: TimeSlot[];

    @doc("シフトが有効となる期間")
    effectivePeriod?: DateRange;
  }

  @doc("""
    スタッフ資格モデル - 保有資格や認定情報を管理し、サービス提供に必要なスキル証明を保持する
    """)
  model StaffQualification {
    @doc("資格・認定の名称")
    name: string;

    @doc("資格を取得した日付")
    certificationDate: plainDate;

    @doc("資格の有効期限。無期限の場合は省略")
    expiryDate?: plainDate;

    @doc("資格を発行した機関名")
    issuer?: string;

    @doc("資格証明番号などの識別子")
    credentialId?: string;
  }

  @doc("""
    スタッフ権限モデル - スタッフアカウントに付与された操作対象と権限範囲を定義する
    """)
  model StaffPermission {
    @doc("操作対象リソースの識別子")
    resource: string;

    @doc("許可されたアクションの一覧")
    actions: string[];

    @doc("権限が適用される範囲や条件")
    scope?: string;

    @doc("権限の有効期限 (UTC)")
    expiresAt?: utcDateTime;
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

    @doc("プロフィール画像のURL")
    imageUrl?: string;

    @doc("自己紹介や経歴の概要")
    bio?: string;

    @doc("実務経験年数")
    yearsOfExperience?: int32;

    @doc("保有資格名の一覧 (テキスト管理)")
    certifications?: string[];

    @doc("詳細な資格情報の一覧")
    qualifications?: StaffQualification[];

    @doc("通常勤務スケジュールの一覧")
    schedules?: StaffSchedule[];

    @doc("現在スタッフがアクティブに勤務可能かを示すフラグ")
    isActive: boolean;

    @doc("システム上で付与されている追加権限一覧")
    permissions?: StaffPermission[];

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

    @doc("プロフィール画像のURL")
    imageUrl?: string;

    @doc("自己紹介や経歴の概要")
    bio?: string;

    @doc("実務経験年数")
    yearsOfExperience?: int32;

    @doc("保有資格名の一覧")
    certifications?: string[];

    @doc("詳細な資格情報の一覧")
    qualifications?: StaffQualification[];

    @doc("通常勤務スケジュールの一覧")
    schedules?: StaffSchedule[];

    @doc("付与する権限の一覧")
    permissions?: StaffPermission[];
  }

  @doc("""
    スタッフ更新リクエスト - 任意項目を部分更新し、プロフィールや勤務状況を柔軟に調整する
    """)
  model UpdateStaffRequest {
    @doc("スタッフ名の更新")
    name?: string;

    @doc("連絡先情報の更新")
    contactInfo?: ContactInfo;

    @doc("得意分野一覧の更新")
    specialties?: string[];

    @doc("プロフィール画像URLの更新")
    imageUrl?: string;

    @doc("自己紹介文の更新")
    bio?: string;

    @doc("経験年数の更新")
    yearsOfExperience?: int32;

    @doc("資格名一覧の更新")
    certifications?: string[];

    @doc("資格詳細一覧の更新")
    qualifications?: StaffQualification[];

    @doc("勤務スケジュール一覧の更新")
    schedules?: StaffSchedule[];

    @doc("付与権限一覧の更新")
    permissions?: StaffPermission[];

    @doc("アクティブ状態の更新")
    isActive?: boolean;
  }

  @doc("""
    リセット対応スタッフ更新リクエスト - null指定を許可しつつプロフィールやスケジュールを再設定する
    """)
  model UpdateStaffRequestWithReset {
    @doc("スタッフ名の更新")
    name?: string;

    @doc("連絡先情報の更新")
    contactInfo?: ContactInfo;

    @doc("得意分野一覧の更新")
    specialties?: string[];

    @doc("null指定も可能なプロフィール画像URL")
    imageUrl?: string | null;

    @doc("null指定も可能な自己紹介文")
    bio?: string | null;

    @doc("null指定も可能な経験年数")
    yearsOfExperience?: int32 | null;

    @doc("null指定も可能な資格名一覧")
    certifications?: string[] | null;

    @doc("null指定も可能な資格詳細一覧")
    qualifications?: StaffQualification[] | null;

    @doc("null指定も可能な勤務スケジュール一覧")
    schedules?: StaffSchedule[] | null;

    @doc("null指定も可能な付与権限一覧")
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

    @doc("休憩などの開始時刻")
    breakStart?: string;

    @doc("休憩などの終了時刻")
    breakEnd?: string;
  }
}
