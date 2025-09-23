import "@typespec/http";
import "@typespec/rest";
import "./common.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;

namespace BeautySalon.Models {
  // ============================================================================
  // Staff Level Enums
  // ============================================================================

  @doc("""
    スタッフレベル区分 - スタッフの技術レベルや経験を表す階層
    
    junior: ジュニア - 新人・見習いレベル、基本的な施術が可能
    stylist: スタイリスト - 標準レベル、一般的な施術が可能
    senior: シニア - 上級レベル、高度な技術と経験を保有
    expert: エキスパート - 専門家レベル、特殊技術や指導が可能
    director: ディレクター - 管理職レベル、サロンの技術的な指導を担当
    """)
  enum StaffLevelType {
    junior,
    stylist,
    senior,
    expert,
    director,
  }

  // ============================================================================
  // Authentication State Types
  // ============================================================================

  @doc("""
    認証状態区分 - ユーザーの認証状態を表す区分
    
    unauthenticated: 未認証 - ログインしていない状態
    authenticated: 認証済み - 正常にログインしている状態
    pending_two_factor: 2要素認証待ち - 2要素認証の入力を待っている状態
    locked: ロック中 - アカウントがロックされている状態
    """)
  enum AuthenticationStateType {
    unauthenticated,
    authenticated,
    pending_two_factor,
    locked,
  }

  @doc("認証状態ごとの詳細情報を格納するモデル。")
  model AuthenticationStateDetail {
    @doc("現在の認証状態区分。")
    type: AuthenticationStateType;

    @doc("状態に紐づくセッションID。未確立の場合はnull。")
    sessionId?: SessionId;

    @doc("該当状態が失効する日時。")
    expiresAt?: utcDateTime;

    @doc("2要素認証や一時アクセスに利用する暫定トークン。")
    tempToken?: string;

    @doc("ロックや制限状態が解除される予定日時。")
    until?: utcDateTime;

    @doc("認証失敗などの試行回数。")
    attempts?: int32;

    @doc("状態が発生した具体的な理由メッセージ。")
    reason?: string;
  }

  // ============================================================================
  // Email Verification State
  // ============================================================================

  @doc("""
    メール確認状態区分 - メールアドレスの確認状態を表す区分
    
    verified: 確認済み - メールアドレスが確認された状態
    unverified: 未確認 - メールアドレスが未確認の状態
    pending: 確認中 - 確認メールを送信し、確認待ちの状態
    """)
  enum EmailVerificationStateType {
    verified,
    unverified,
    pending,
  }

  @doc("メールアドレス確認フローの進行状況を保持するモデル。")
  model EmailVerificationStateDetail {
    @doc("現在の確認状態区分。")
    type: EmailVerificationStateType;

    @doc("確認完了日時。未確認の場合はnull。")
    verifiedAt?: utcDateTime;

    @doc("確認メールに含めるトークン。再送未実施の場合はnull。")
    token?: string;

    @doc("トークンの有効期限。")
    expiresAt?: utcDateTime;

    @doc("確認メールを送信した日時。")
    sentAt?: utcDateTime;
  }

  // ============================================================================
  // Password Reset State
  // ============================================================================

  @doc("""
    パスワードリセット状態区分 - パスワードリセットの進行状態を表す区分
    
    none: なし - パスワードリセットが要求されていない状態
    requested: リクエスト中 - パスワードリセットが要求された状態
    completed: 完了 - パスワードリセットが完了した状態
    """)
  enum PasswordResetStateType {
    none,
    requested,
    completed,
  }

  @doc("パスワード再設定リクエストの状態管理モデル。")
  model PasswordResetStateDetail {
    @doc("現在のリセット状態区分。")
    type: PasswordResetStateType;

    @doc("リセット手続きに使用するトークン。")
    token?: string;

    @doc("トークンの有効期限。")
    expiresAt?: utcDateTime;

    @doc("リセットを要求した日時。")
    requestedAt?: utcDateTime;

    @doc("リセット完了日時。未完了の場合はnull。")
    completedAt?: utcDateTime;
  }

  // ============================================================================
  // Extended User Role Types
  // ============================================================================

  @doc("""
    ユーザーロール区分 - システム内でのユーザーの役割と権限レベル
    
    customer: 顧客 - サービスの予約・利用が可能なユーザー
    staff: スタッフ - 施術を提供するサロン従業員
    manager: マネージャー - サロンの管理業務を担当する管理者
    admin: 管理者 - システム全体の管理権限を持つユーザー
    owner: オーナー - サロンの所有者、最高権限を保持
    """)
  enum UserRoleType {
    customer,
    staff,
    manager,
    admin,
    owner,
  }

  @doc("ユーザーの詳細な役割情報と所属を表すモデル。")
  model UserRoleDetail {
    @doc("システム内での基礎的な役割区分。")
    type: UserRoleType;

    @doc("役割が適用されるサロンID。全社権限の場合はnull。")
    salonId?: SalonId;

    @doc("スタッフに対して設定される技術レベル。")
    level?: StaffLevelType;
  }
  @doc("""
    認証ユーザーロール区分 - 認証システムにおけるユーザーの役割
    
    customer: 顧客ロール - サービスの予約が可能
    staff: スタッフロール - 自身のスケジュールと予約を管理可能
    admin: 管理者ロール - システムのフルアクセス権限
    """)
  enum AuthUserRoleType {
    customer: "customer",
    staff: "staff",
    admin: "admin",
  }

  @doc("""
    ユーザーアカウントステータス区分 - アカウントの利用可否状態
    
    active: アクティブ - 正常に利用可能なアカウント
    unverified: メール未確認 - メールアドレスが確認されていないアカウント
    locked: ロック - ログイン失敗回数超過によりロックされたアカウント
    suspended: 停止 - 管理者によって停止されたアカウント
    deleted: 削除済み - 削除されたアカウント
    """)
  enum UserAccountStatusType {
    active: "active",
    unverified: "unverified",
    locked: "locked",
    suspended: "suspended",
    deleted: "deleted",
  }

  @doc("""
    2要素認証ステータス区分 - 2要素認証の設定状態
    
    disabled: 無効 - 2要素認証が設定されていない状態
    pending: 設定中 - 2要素認証の設定が進行中の状態
    enabled: 有効 - 2要素認証が有効化されている状態
    """)
  enum TwoFactorStatusType {
    disabled: "disabled",
    pending: "pending",
    enabled: "enabled",
  }

  @doc("認証基盤で管理するユーザーアカウント情報。")
  model User {
    @key
    @doc("ユーザーを一意に識別するID。")
    id: string;

    @doc("ログインに利用するメールアドレス（ユニーク）。")
    email: string;

    @doc("顧客・スタッフの表示名。")
    name: string;

    @doc("認証システム上での役割区分。")
    role: AuthUserRoleType;

    @doc("アカウントの稼働状態。")
    status: UserAccountStatusType;

    @doc("メールアドレスが確認済みかどうか。")
    emailVerified: boolean;

    @doc("メール確認に利用するトークン。内部管理用。")
    emailVerificationToken?: string;

    @doc("メール確認トークンの有効期限。")
    emailVerificationTokenExpiry?: utcDateTime;

    @doc("2要素認証の設定状態。")
    twoFactorStatus: TwoFactorStatusType;

    @doc("暗号化された2要素認証シークレット。")
    twoFactorSecret?: string;

    @doc("2要素認証の復旧用バックアップコード一覧。")
    backupCodes?: string[];

    @doc("連続したログイン失敗回数。")
    failedLoginAttempts: int32 = 0;

    @doc("アカウントをロックした日時。未ロックの場合はnull。")
    lockedAt?: utcDateTime;

    @doc("パスワードリセットに利用するトークン。内部管理用。")
    passwordResetToken?: string;

    @doc("パスワードリセットトークンの有効期限。")
    passwordResetTokenExpiry?: utcDateTime;

    @doc("最後にパスワードを変更した日時。")
    lastPasswordChangeAt?: utcDateTime;

    @doc("再利用防止のため保持する過去パスワードハッシュ。")
    passwordHistory?: string[];

    @doc("信頼済みIPアドレスのリスト。")
    trustedIpAddresses?: string[];

    @doc("ユーザーが顧客の場合の顧客プロファイルID。")
    customerId?: CustomerId;

    @doc("ユーザーがスタッフの場合のスタッフプロファイルID。")
    staffId?: StaffId;

    @doc("担当サロンやレベル等を含む拡張ロール情報。")
    roleDetail?: UserRoleDetail;

    @doc("現在の認証状態区分。")
    authState?: AuthenticationStateType;

    @doc("メール確認状態区分。")
    emailVerificationState?: EmailVerificationStateType;

    @doc("パスワードリセット状態区分。")
    passwordResetState?: PasswordResetStateType;

    @doc("ユーザーアカウント作成日時。")
    createdAt: utcDateTime;

    @doc("ユーザー情報の最終更新日時。")
    updatedAt: utcDateTime;

    @doc("直近のログイン日時。")
    lastLoginAt?: utcDateTime;

    @doc("直近ログイン時のIPアドレス。")
    lastLoginIp?: string;
  }

  @doc("ログインセッションの状態と追跡情報。")
  model Session {
    @key
    @doc("セッションを一意に識別するID。")
    id: string;

    @doc("セッション所有者のユーザーID。")
    userId: UserId;

    @doc("アクセストークン再発行に使用するリフレッシュトークン。")
    refreshToken: string;

    @doc("セッション発行元のIPアドレス。")
    ipAddress: string;

    @doc("ブラウザやアプリを示すユーザーエージェント文字列。")
    userAgent: string;

    @doc("セッションの有効期限。")
    expiresAt: utcDateTime;

    @doc("永続化セッション（Remember me）を希望するかのフラグ。")
    rememberMe: boolean = false;

    @doc("セッション作成日時。")
    createdAt: utcDateTime;

    @doc("直近のアクティビティ日時。")
    lastActivityAt: utcDateTime;
  }

  @doc("ユーザーがログインする際の認証リクエスト。")
  model LoginRequest {
    @doc("ログインに使用するメールアドレス。")
    email: string;

    @doc("ログイン用パスワード。")
    password: string;

    @doc("永続セッションを希望するかどうかのフラグ。")
    rememberMe?: boolean = false;

    @doc("2要素認証が有効な場合に入力するワンタイムコード。")
    twoFactorCode?: string;
  }

  @doc("ログイン成功時に返却するトークン情報。")
  model LoginResponse {
    @doc("API呼び出しに利用するアクセストークン。")
    accessToken: string;

    @doc("アクセストークン再発行に使用するリフレッシュトークン。")
    refreshToken: string;

    @doc("トークン種別。常にBearer。")
    token: string = "Bearer";

    @doc("アクセストークンの有効期限（秒）。")
    expiresIn: int32;

    @doc("ログインしたユーザーの情報。")
    user: User;
  }

  @doc("新規ユーザー登録時のリクエスト。")
  model RegisterRequest {
    @doc("登録に使用するメールアドレス。")
    email: string;

    @doc("セキュリティ基準を満たすパスワード。")
    password: string;

    @doc("ユーザーの表示名。")
    name: string;

    @doc("付与するロール。既定はcustomer。")
    role?: AuthUserRoleType = AuthUserRoleType.customer;
  }

  @doc("パスワード再設定メール送信を要求するリクエスト。")
  model PasswordResetRequest {
    @doc("対象アカウントのメールアドレス。")
    email: string;
  }

  @doc("パスワード再設定を確定するためのリクエスト。")
  model PasswordResetConfirmRequest {
    @doc("メールで受け取った再設定トークン。")
    token: string;

    @doc("新しいパスワード。")
    newPassword: string;
  }

  @doc("ログイン中ユーザーがパスワードを変更するためのリクエスト。")
  model PasswordChangeRequest {
    @doc("本人確認のための現在パスワード。")
    currentPassword: string;

    @doc("変更後の新しいパスワード。")
    newPassword: string;
  }

  @doc("メールアドレス確認を完了させるリクエスト。")
  model EmailVerificationRequest {
    @doc("メールに記載された確認トークン。")
    token: string;
  }

  @doc("2要素認証を有効化する際の認証リクエスト。")
  model TwoFactorEnableRequest {
    @doc("本人確認のための現在パスワード。")
    password: string;
  }

  @doc("2要素認証の設定情報を返すレスポンス。")
  model TwoFactorSetupResponse {
    @doc("認証アプリで読み取るQRコードURL。")
    qrCodeUrl: string;

    @doc("手動登録用のシークレットキー。")
    secret: string;

    @doc("復旧用バックアップコード一覧。")
    backupCodes: string[];
  }

  @doc("2要素認証コードを検証するリクエスト。")
  model TwoFactorVerifyRequest {
    @doc("認証アプリが生成したTOTPコード。")
    code: string;
  }

  @doc("2要素認証を無効化する際の確認リクエスト。")
  model TwoFactorDisableRequest {
    @doc("本人確認のための現在パスワード。")
    password: string;

    @doc("無効化確認のための現在TOTPコード。")
    code: string;
  }

  @doc("アクセストークンを更新するためのリクエスト。")
  model TokenRefreshRequest {
    @doc("認証済みセッションに紐づくリフレッシュトークン。")
    refreshToken: string;
  }

  @doc("アクティブなセッション一覧を返すレスポンス。")
  model SessionListResponse {
    @doc("稼働中のセッション配列。")
    sessions: Session[];

    @doc("該当セッションの総数。")
    total: int32;
  }

  @doc("認証系APIで使用する汎用成功レスポンス。")
  model AuthSuccessResponse {
    @doc("完了メッセージ。")
    message: string;
  }
}
