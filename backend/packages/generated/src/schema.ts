import { z } from 'zod'

/**
 * @description
 * アレルギー重篤度区分 - アレルギー反応の重篤度を表し、対応レベルを決定
 *
 *
 * mild: 軽度 - 軽いかゆみや赤み程度、通常の施術で注意すれば対応可能
 *
 * moderate: 中等度 - 明確な皮膚反応、特別な配慮や代替品の使用が必要
 *
 * severe: 重度 - 激しい反応、特定の施術を避けるべきレベル
 */
export const AllergySeverityTypeSchema = z.enum(['mild', 'moderate', 'severe'])
/**
 * @description
 * アレルギー重篤度区分 - アレルギー反応の重篤度を表し、対応レベルを決定
 *
 *
 * mild: 軽度 - 軽いかゆみや赤み程度、通常の施術で注意すれば対応可能
 *
 * moderate: 中等度 - 明確な皮膚反応、特別な配慮や代替品の使用が必要
 *
 * severe: 重度 - 激しい反応、特定の施術を避けるべきレベル
 */
export type AllergySeverityType = z.infer<typeof AllergySeverityTypeSchema>

/**
 * @description
 * アレルギータイプ区分 - 顧客が持つアレルギーの種類を分類、施術時の注意事項として使用
 *
 *
 * chemical: 化学物質 - カラー剤、パーマ剤等の化学薬品に対するアレルギー
 *
 * fragrance: 香料 - 香水、シャンプー等の香料成分に対するアレルギー
 *
 * metal: 金属 - ヘアピン、ハサミ等の金属製品に対するアレルギー
 *
 * latex: ラテックス - 手袋等のゴム製品に対するアレルギー
 *
 * plant: 植物 - ヘナ、ハーブ等の植物由来成分に対するアレルギー
 *
 * other: その他 - 上記に分類されないアレルギー
 */
export const AllergyTypeSchema = z.enum([
  'chemical',
  'fragrance',
  'metal',
  'latex',
  'plant',
  'other',
])
/**
 * @description
 * アレルギータイプ区分 - 顧客が持つアレルギーの種類を分類、施術時の注意事項として使用
 *
 *
 * chemical: 化学物質 - カラー剤、パーマ剤等の化学薬品に対するアレルギー
 *
 * fragrance: 香料 - 香水、シャンプー等の香料成分に対するアレルギー
 *
 * metal: 金属 - ヘアピン、ハサミ等の金属製品に対するアレルギー
 *
 * latex: ラテックス - 手袋等のゴム製品に対するアレルギー
 *
 * plant: 植物 - ヘナ、ハーブ等の植物由来成分に対するアレルギー
 *
 * other: その他 - 上記に分類されないアレルギー
 */
export type AllergyType = z.infer<typeof AllergyTypeSchema>

/**
 * @description
 * 認証ユーザーロール区分 - 認証システムにおけるユーザーの役割
 *
 *
 * customer: 顧客ロール - サービスの予約が可能
 *
 * staff: スタッフロール - 自身のスケジュールと予約を管理可能
 *
 * admin: 管理者ロール - システムのフルアクセス権限
 */
export const AuthUserRoleTypeSchema = z.enum(['customer', 'staff', 'admin'])
/**
 * @description
 * 認証ユーザーロール区分 - 認証システムにおけるユーザーの役割
 *
 *
 * customer: 顧客ロール - サービスの予約が可能
 *
 * staff: スタッフロール - 自身のスケジュールと予約を管理可能
 *
 * admin: 管理者ロール - システムのフルアクセス権限
 */
export type AuthUserRoleType = z.infer<typeof AuthUserRoleTypeSchema>

/**
 * @description
 * 認証状態区分 - ユーザーの認証状態を表す区分
 *
 *
 * unauthenticated: 未認証 - ログインしていない状態
 *
 * authenticated: 認証済み - 正常にログインしている状態
 *
 * pending_two_factor: 2要素認証待ち - 2要素認証の入力を待っている状態
 *
 * locked: ロック中 - アカウントがロックされている状態
 */
export const AuthenticationStateTypeSchema = z.enum([
  'unauthenticated',
  'authenticated',
  'pending_two_factor',
  'locked',
])
/**
 * @description
 * 認証状態区分 - ユーザーの認証状態を表す区分
 *
 *
 * unauthenticated: 未認証 - ログインしていない状態
 *
 * authenticated: 認証済み - 正常にログインしている状態
 *
 * pending_two_factor: 2要素認証待ち - 2要素認証の入力を待っている状態
 *
 * locked: ロック中 - アカウントがロックされている状態
 */
export type AuthenticationStateType = z.infer<
  typeof AuthenticationStateTypeSchema
>

/**
 * @description
 * 予約要件タイプ区分 - サービス予約時に必要な条件や制約
 *
 *
 * deposit: デポジット - 予約時に支払う予約金
 *
 * consultation: 事前カウンセリング - 施術前の相談・カウンセリング
 *
 * patch_test: パッチテスト - アレルギー確認のための事前テスト
 *
 * age_restriction: 年齢制限 - 年齢による利用制限
 *
 * gender_restriction: 性別制限 - 性別による利用制限
 *
 * membership: 会員限定 - 特定の会員ランク以上の制限
 *
 * preparation: 事前準備 - 顧客が事前に行うべき準備
 */
export const BookingRequirementTypeSchema = z.enum([
  'deposit',
  'consultation',
  'patch_test',
  'age_restriction',
  'gender_restriction',
  'membership',
  'preparation',
])
/**
 * @description
 * 予約要件タイプ区分 - サービス予約時に必要な条件や制約
 *
 *
 * deposit: デポジット - 予約時に支払う予約金
 *
 * consultation: 事前カウンセリング - 施術前の相談・カウンセリング
 *
 * patch_test: パッチテスト - アレルギー確認のための事前テスト
 *
 * age_restriction: 年齢制限 - 年齢による利用制限
 *
 * gender_restriction: 性別制限 - 性別による利用制限
 *
 * membership: 会員限定 - 特定の会員ランク以上の制限
 *
 * preparation: 事前準備 - 顧客が事前に行うべき準備
 */
export type BookingRequirementType = z.infer<
  typeof BookingRequirementTypeSchema
>

/**
 * @description
 * 予約ステータスコード区分 - 予約の詳細な進行状態を表す区分
 *
 *
 * draft: 下書き - 予約内容を作成中、まだ確定していない状態
 *
 * pending: 保留中 - 予約リクエストを受付、確認待ちの状態
 *
 * confirmed: 確定 - 予約が確定し、スタッフが割り当てられた状態
 *
 * in_progress: 施術中 - 現在サービスを実施中の状態
 *
 * completed: 完了 - サービス提供が終了した状態
 *
 * cancelled: キャンセル - 予約がキャンセルされた状態
 *
 * no_show: 無断キャンセル - 顧客が連絡なしに来店しなかった状態
 */
export const BookingStatusCodeTypeSchema = z.enum([
  'draft',
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
])
/**
 * @description
 * 予約ステータスコード区分 - 予約の詳細な進行状態を表す区分
 *
 *
 * draft: 下書き - 予約内容を作成中、まだ確定していない状態
 *
 * pending: 保留中 - 予約リクエストを受付、確認待ちの状態
 *
 * confirmed: 確定 - 予約が確定し、スタッフが割り当てられた状態
 *
 * in_progress: 施術中 - 現在サービスを実施中の状態
 *
 * completed: 完了 - サービス提供が終了した状態
 *
 * cancelled: キャンセル - 予約がキャンセルされた状態
 *
 * no_show: 無断キャンセル - 顧客が連絡なしに来店しなかった状態
 */
export type BookingStatusCodeType = z.infer<typeof BookingStatusCodeTypeSchema>

/**
 * @description
 * カラーサブカテゴリー区分 - ヘアカラーリングサービスの詳細分類
 *
 *
 * full_color: フルカラー - 髪全体を染めるサービス
 *
 * root_touch: リタッチ - 根元の伸びた部分のみを染めるサービス
 *
 * highlights: ハイライト - 部分的に明るい色を入れるサービス
 *
 * lowlights: ローライト - 部分的に暗い色を入れるサービス
 *
 * balayage: バレイヤージュ - グラデーション染め技法
 *
 * ombre: オンブレ - 根元から毛先にかけてグラデーション染め
 *
 * bleach: ブリーチ - 髪の色を抜く脱色サービス
 *
 * color_correction: カラーコレクション - 色ムラや失敗したカラーの修正
 */
export const ColorSubCategoryTypeSchema = z.enum([
  'full_color',
  'root_touch',
  'highlights',
  'lowlights',
  'balayage',
  'ombre',
  'bleach',
  'color_correction',
])
/**
 * @description
 * カラーサブカテゴリー区分 - ヘアカラーリングサービスの詳細分類
 *
 *
 * full_color: フルカラー - 髪全体を染めるサービス
 *
 * root_touch: リタッチ - 根元の伸びた部分のみを染めるサービス
 *
 * highlights: ハイライト - 部分的に明るい色を入れるサービス
 *
 * lowlights: ローライト - 部分的に暗い色を入れるサービス
 *
 * balayage: バレイヤージュ - グラデーション染め技法
 *
 * ombre: オンブレ - 根元から毛先にかけてグラデーション染め
 *
 * bleach: ブリーチ - 髪の色を抜く脱色サービス
 *
 * color_correction: カラーコレクション - 色ムラや失敗したカラーの修正
 */
export type ColorSubCategoryType = z.infer<typeof ColorSubCategoryTypeSchema>

/**
 * @description
 * 連絡方法区分 - 顧客との連絡・コミュニケーション手段の優先設定
 *
 *
 * email: Eメール - 電子メールによる連絡方法
 *
 * sms: SMS - ショートメッセージサービスによる連絡方法
 *
 * phone: 電話 - 音声通話による連絡方法
 *
 * push: プッシュ通知 - アプリ内プッシュ通知による連絡方法
 */
export const ContactMethodTypeSchema = z.enum(['email', 'sms', 'phone', 'push'])
/**
 * @description
 * 連絡方法区分 - 顧客との連絡・コミュニケーション手段の優先設定
 *
 *
 * email: Eメール - 電子メールによる連絡方法
 *
 * sms: SMS - ショートメッセージサービスによる連絡方法
 *
 * phone: 電話 - 音声通話による連絡方法
 *
 * push: プッシュ通知 - アプリ内プッシュ通知による連絡方法
 */
export type ContactMethodType = z.infer<typeof ContactMethodTypeSchema>

/**
 * @description
 * 通貨コード区分 - ISO 4217準拠の通貨コード定義
 *
 *
 * JPY: 日本円 - Japanese Yen
 *
 * USD: 米ドル - United States Dollar
 *
 * EUR: ユーロ - Euro
 *
 * GBP: 英ポンド - British Pound Sterling
 *
 * AUD: 豪ドル - Australian Dollar
 *
 * CAD: カナダドル - Canadian Dollar
 *
 * CNY: 中国人民元 - Chinese Yuan
 *
 * KRW: 韓国ウォン - South Korean Won
 *
 * SGD: シンガポールドル - Singapore Dollar
 *
 * TWD: 台湾ドル - Taiwan Dollar
 */
export const CurrencyCodeTypeSchema = z.enum([
  'JPY',
  'USD',
  'EUR',
  'GBP',
  'AUD',
  'CAD',
  'CNY',
  'KRW',
  'SGD',
  'TWD',
])
/**
 * @description
 * 通貨コード区分 - ISO 4217準拠の通貨コード定義
 *
 *
 * JPY: 日本円 - Japanese Yen
 *
 * USD: 米ドル - United States Dollar
 *
 * EUR: ユーロ - Euro
 *
 * GBP: 英ポンド - British Pound Sterling
 *
 * AUD: 豪ドル - Australian Dollar
 *
 * CAD: カナダドル - Canadian Dollar
 *
 * CNY: 中国人民元 - Chinese Yuan
 *
 * KRW: 韓国ウォン - South Korean Won
 *
 * SGD: シンガポールドル - Singapore Dollar
 *
 * TWD: 台湾ドル - Taiwan Dollar
 */
export type CurrencyCodeType = z.infer<typeof CurrencyCodeTypeSchema>

/**
 * @description
 * 性別区分 - 顧客の性別を表す区分（多様性に配慮した選択肢を含む）
 *
 *
 * male: 男性
 *
 * female: 女性
 *
 * other: その他 - 男性・女性以外の性自認を持つ方
 *
 * prefer_not_to_say: 回答しない - 性別の回答を希望しない方
 */
export const CustomerGenderTypeSchema = z.enum([
  'male',
  'female',
  'other',
  'prefer_not_to_say',
])
/**
 * @description
 * 性別区分 - 顧客の性別を表す区分（多様性に配慮した選択肢を含む）
 *
 *
 * male: 男性
 *
 * female: 女性
 *
 * other: その他 - 男性・女性以外の性自認を持つ方
 *
 * prefer_not_to_say: 回答しない - 性別の回答を希望しない方
 */
export type CustomerGenderType = z.infer<typeof CustomerGenderTypeSchema>

/**
 * @description
 * 顧客ステータス区分 - 顧客アカウントの活動状態や利用可否を表す区分
 *
 *
 * active: アクティブ - 通常利用可能な状態
 *
 * inactive: 休眠中 - 長期間利用がないがアカウントは維持されている状態
 *
 * suspended: 停止中 - 一時的に利用が停止されている状態
 *
 * deleted: 削除済み - アカウントが論理削除された状態
 *
 * blacklisted: ブラックリスト - 利用を禁止された状態
 */
export const CustomerStatusTypeSchema = z.enum([
  'active',
  'inactive',
  'suspended',
  'deleted',
  'blacklisted',
])
/**
 * @description
 * 顧客ステータス区分 - 顧客アカウントの活動状態や利用可否を表す区分
 *
 *
 * active: アクティブ - 通常利用可能な状態
 *
 * inactive: 休眠中 - 長期間利用がないがアカウントは維持されている状態
 *
 * suspended: 停止中 - 一時的に利用が停止されている状態
 *
 * deleted: 削除済み - アカウントが論理削除された状態
 *
 * blacklisted: ブラックリスト - 利用を禁止された状態
 */
export type CustomerStatusType = z.infer<typeof CustomerStatusTypeSchema>

/**
 * @description
 * カットサブカテゴリー区分 - カットサービスの詳細分類
 *
 *
 * mens_cut: メンズカット - 男性向けヘアカットサービス
 *
 * womens_cut: レディースカット - 女性向けヘアカットサービス
 *
 * kids_cut: キッズカット - 子供向けヘアカットサービス
 *
 * bang_trim: 前髪カット - 前髪のみのカットサービス
 *
 * beard_trim: 髭トリミング - 髭の整えサービス
 */
export const CutSubCategoryTypeSchema = z.enum([
  'mens_cut',
  'womens_cut',
  'kids_cut',
  'bang_trim',
  'beard_trim',
])
/**
 * @description
 * カットサブカテゴリー区分 - カットサービスの詳細分類
 *
 *
 * mens_cut: メンズカット - 男性向けヘアカットサービス
 *
 * womens_cut: レディースカット - 女性向けヘアカットサービス
 *
 * kids_cut: キッズカット - 子供向けヘアカットサービス
 *
 * bang_trim: 前髪カット - 前髪のみのカットサービス
 *
 * beard_trim: 髭トリミング - 髭の整えサービス
 */
export type CutSubCategoryType = z.infer<typeof CutSubCategoryTypeSchema>

/**
 * @description
 * 曜日区分 - 営業日やスケジュール管理で使用される曜日の定義
 *
 *
 * monday: 月曜日
 *
 * tuesday: 火曜日
 *
 * wednesday: 水曜日
 *
 * thursday: 木曜日
 *
 * friday: 金曜日
 *
 * saturday: 土曜日
 *
 * sunday: 日曜日
 */
export const DayOfWeekTypeSchema = z.enum([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
])
/**
 * @description
 * 曜日区分 - 営業日やスケジュール管理で使用される曜日の定義
 *
 *
 * monday: 月曜日
 *
 * tuesday: 火曜日
 *
 * wednesday: 水曜日
 *
 * thursday: 木曜日
 *
 * friday: 金曜日
 *
 * saturday: 土曜日
 *
 * sunday: 日曜日
 */
export type DayOfWeekType = z.infer<typeof DayOfWeekTypeSchema>

/**
 * @description
 * ドメインエラータイプ区分 - ビジネスロジック層で発生するエラーの分類
 *
 *
 * VALIDATION_ERROR: 検証エラー - 入力値の検証で失敗
 *
 * NOT_FOUND: 未検出 - 指定されたリソースが存在しない
 *
 * ALREADY_EXISTS: 既存 - リソースが既に存在し、重複が許可されない
 *
 * BUSINESS_RULE_VIOLATION: ビジネスルール違反 - ビジネスロジックの制約に違反
 *
 * UNAUTHORIZED: 未認証 - 認証が必要であるが認証されていない
 *
 * FORBIDDEN: 禁止 - 認証されているが権限が不足
 *
 * INTERNAL_ERROR: 内部エラー - システム内部で予期しないエラーが発生
 *
 * DATABASE_ERROR: データベースエラー - データベース操作中のエラー
 *
 * EXTERNAL_SERVICE_ERROR: 外部サービスエラー - 外部APIやサービスでのエラー
 */
export const DomainErrorTypeSchema = z.enum([
  'VALIDATION_ERROR',
  'NOT_FOUND',
  'ALREADY_EXISTS',
  'BUSINESS_RULE_VIOLATION',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'INTERNAL_ERROR',
  'DATABASE_ERROR',
  'EXTERNAL_SERVICE_ERROR',
])
/**
 * @description
 * ドメインエラータイプ区分 - ビジネスロジック層で発生するエラーの分類
 *
 *
 * VALIDATION_ERROR: 検証エラー - 入力値の検証で失敗
 *
 * NOT_FOUND: 未検出 - 指定されたリソースが存在しない
 *
 * ALREADY_EXISTS: 既存 - リソースが既に存在し、重複が許可されない
 *
 * BUSINESS_RULE_VIOLATION: ビジネスルール違反 - ビジネスロジックの制約に違反
 *
 * UNAUTHORIZED: 未認証 - 認証が必要であるが認証されていない
 *
 * FORBIDDEN: 禁止 - 認証されているが権限が不足
 *
 * INTERNAL_ERROR: 内部エラー - システム内部で予期しないエラーが発生
 *
 * DATABASE_ERROR: データベースエラー - データベース操作中のエラー
 *
 * EXTERNAL_SERVICE_ERROR: 外部サービスエラー - 外部APIやサービスでのエラー
 */
export type DomainErrorType = z.infer<typeof DomainErrorTypeSchema>

/**
 * @description
 * メール確認状態区分 - メールアドレスの確認状態を表す区分
 *
 *
 * verified: 確認済み - メールアドレスが確認された状態
 *
 * unverified: 未確認 - メールアドレスが未確認の状態
 *
 * pending: 確認中 - 確認メールを送信し、確認待ちの状態
 */
export const EmailVerificationStateTypeSchema = z.enum([
  'verified',
  'unverified',
  'pending',
])
/**
 * @description
 * メール確認状態区分 - メールアドレスの確認状態を表す区分
 *
 *
 * verified: 確認済み - メールアドレスが確認された状態
 *
 * unverified: 未確認 - メールアドレスが未確認の状態
 *
 * pending: 確認中 - 確認メールを送信し、確認待ちの状態
 */
export type EmailVerificationStateType = z.infer<
  typeof EmailVerificationStateTypeSchema
>

/**
 * @description
 * エラーコードタイプ区分 - 一貫したエラー処理のための標準化されたエラーコード
 * // 認証・認可 (1xxx)
 *
 *
 * 1001: 認証必須 - アクセスには認証が必要
 *
 * 1002: 無効な資格情報 - ユーザー名またはパスワードが不正
 *
 * 1003: トークン期限切れ - 認証トークンが期限切れ
 *
 * 1004: トークン無効 - 認証トークンが無効または破損
 *
 * 1005: 権限不足 - 操作を実行する権限が不足
 *
 * 1006: アカウントロック - アカウントがロックされている
 *
 * 1007: 2要素認証必須 - 2要素認証の入力が必要
 * // バリデーション (2xxx)
 *
 * 2001: 検証失敗 - 入力データの検証に失敗
 *
 * 2002: 不正な形式 - データ形式が不正
 *
 * 2003: 必須フィールド欠落 - 必須フィールドが入力されていない
 *
 * 2004: 範囲外の値 - 値が許可された範囲を超えている
 *
 * 2005: 重複値 - 一意であるべき値が重複している
 * // ビジネスロジック (3xxx)
 *
 * 3001: リソース未検出 - 指定されたリソースが存在しない
 *
 * 3002: リソース既存 - リソースが既に存在する
 *
 * 3003: 操作不可 - 現在の状態では操作が許可されない
 *
 * 3004: ビジネスルール違反 - ビジネスルールに違反している
 *
 * 3005: 残高不足 - ポイントや残高が不足
 *
 * 3006: 予約競合 - 予約時間が重複している
 *
 * 3007: 容量超過 - 利用可能な容量を超えている
 * // システム (4xxx)
 *
 * 4001: 内部サーバーエラー - サーバー内部でエラーが発生
 *
 * 4002: サービス利用不可 - サービスが一時的に利用できない
 *
 * 4003: データベースエラー - データベース処理中にエラーが発生
 *
 * 4004: 外部サービスエラー - 外部サービスでエラーが発生
 *
 * 4005: レート制限超過 - APIレート制限を超えた
 */
export const ErrorCodeTypeSchema = z.enum([
  '1001',
  '1002',
  '1003',
  '1004',
  '1005',
  '1006',
  '1007',
  '2001',
  '2002',
  '2003',
  '2004',
  '2005',
  '3001',
  '3002',
  '3003',
  '3004',
  '3005',
  '3006',
  '3007',
  '4001',
  '4002',
  '4003',
  '4004',
  '4005',
])
/**
 * @description
 * エラーコードタイプ区分 - 一貫したエラー処理のための標準化されたエラーコード
 * // 認証・認可 (1xxx)
 *
 *
 * 1001: 認証必須 - アクセスには認証が必要
 *
 * 1002: 無効な資格情報 - ユーザー名またはパスワードが不正
 *
 * 1003: トークン期限切れ - 認証トークンが期限切れ
 *
 * 1004: トークン無効 - 認証トークンが無効または破損
 *
 * 1005: 権限不足 - 操作を実行する権限が不足
 *
 * 1006: アカウントロック - アカウントがロックされている
 *
 * 1007: 2要素認証必須 - 2要素認証の入力が必要
 * // バリデーション (2xxx)
 *
 * 2001: 検証失敗 - 入力データの検証に失敗
 *
 * 2002: 不正な形式 - データ形式が不正
 *
 * 2003: 必須フィールド欠落 - 必須フィールドが入力されていない
 *
 * 2004: 範囲外の値 - 値が許可された範囲を超えている
 *
 * 2005: 重複値 - 一意であるべき値が重複している
 * // ビジネスロジック (3xxx)
 *
 * 3001: リソース未検出 - 指定されたリソースが存在しない
 *
 * 3002: リソース既存 - リソースが既に存在する
 *
 * 3003: 操作不可 - 現在の状態では操作が許可されない
 *
 * 3004: ビジネスルール違反 - ビジネスルールに違反している
 *
 * 3005: 残高不足 - ポイントや残高が不足
 *
 * 3006: 予約競合 - 予約時間が重複している
 *
 * 3007: 容量超過 - 利用可能な容量を超えている
 * // システム (4xxx)
 *
 * 4001: 内部サーバーエラー - サーバー内部でエラーが発生
 *
 * 4002: サービス利用不可 - サービスが一時的に利用できない
 *
 * 4003: データベースエラー - データベース処理中にエラーが発生
 *
 * 4004: 外部サービスエラー - 外部サービスでエラーが発生
 *
 * 4005: レート制限超過 - APIレート制限を超えた
 */
export type ErrorCodeType = z.infer<typeof ErrorCodeTypeSchema>

/**
 * @description
 * ファイルタイプ区分 - アップロードされるファイルの種類を分類
 *
 *
 * image: 画像 - 写真やイラスト等の画像ファイル（jpg, png, gif等）
 *
 * document: ドキュメント - PDF、Word、Excel等の文書ファイル
 *
 * other: その他 - 上記に分類されないファイル
 */
export const FileTypeSchema = z.enum(['image', 'document', 'other'])
/**
 * @description
 * ファイルタイプ区分 - アップロードされるファイルの種類を分類
 *
 *
 * image: 画像 - 写真やイラスト等の画像ファイル（jpg, png, gif等）
 *
 * document: ドキュメント - PDF、Word、Excel等の文書ファイル
 *
 * other: その他 - 上記に分類されないファイル
 */
export type FileType = z.infer<typeof FileTypeSchema>

/**
 * @description
 * 髪の太さ区分 - 髪の毛一本の太さを分類、カットやスタイリングの参考に使用
 *
 *
 * fine: 細毛 - 柔らかく細い髪、ボリュームが出にくい
 *
 * medium: 普通毛 - 平均的な太さの髪、扱いやすい
 *
 * thick: 太毛 - しっかりとした太い髪、ボリュームが出やすい
 */
export const HairThicknessTypeSchema = z.enum(['fine', 'medium', 'thick'])
/**
 * @description
 * 髪の太さ区分 - 髪の毛一本の太さを分類、カットやスタイリングの参考に使用
 *
 *
 * fine: 細毛 - 柔らかく細い髪、ボリュームが出にくい
 *
 * medium: 普通毛 - 平均的な太さの髪、扱いやすい
 *
 * thick: 太毛 - しっかりとした太い髪、ボリュームが出やすい
 */
export type HairThicknessType = z.infer<typeof HairThicknessTypeSchema>

/**
 * @description
 * 髪質タイプ区分 - 顧客の髪のクセや形状を分類、適切な施術提案に使用
 *
 *
 * straight: ストレート - 直毛、クセがほとんどない髪質
 *
 * wavy: ウェービー - 緩やかな波状、S字カーブの髪質
 *
 * curly: カーリー - 明確なカール、螺旋状の髪質
 *
 * coily: コイリー - 非常に細かいカール、ジグザグ状の髪質
 */
export const HairTypeSchema = z.enum(['straight', 'wavy', 'curly', 'coily'])
/**
 * @description
 * 髪質タイプ区分 - 顧客の髪のクセや形状を分類、適切な施術提案に使用
 *
 *
 * straight: ストレート - 直毛、クセがほとんどない髪質
 *
 * wavy: ウェービー - 緩やかな波状、S字カーブの髪質
 *
 * curly: カーリー - 明確なカール、螺旋状の髪質
 *
 * coily: コイリー - 非常に細かいカール、ジグザグ状の髪質
 */
export type HairType = z.infer<typeof HairTypeSchema>

/**
 * @description
 * 在庫ステータス区分 - 商品・材料の在庫状態を表す区分
 *
 *
 * in_stock: 在庫あり - 十分な在庫量がある状態
 *
 * low_stock: 在庫僅少 - 在庫量が設定された最小量に近づいている状態
 *
 * out_of_stock: 在庫切れ - 在庫がゼロになった状態
 *
 * ordered: 発注済み - 補充のための発注が行われた状態
 *
 * discontinued: 廃番 - 商品の取り扱いを終了した状態
 */
export const InventoryStatusTypeSchema = z.enum([
  'in_stock',
  'low_stock',
  'out_of_stock',
  'ordered',
  'discontinued',
])
/**
 * @description
 * 在庫ステータス区分 - 商品・材料の在庫状態を表す区分
 *
 *
 * in_stock: 在庫あり - 十分な在庫量がある状態
 *
 * low_stock: 在庫僅少 - 在庫量が設定された最小量に近づいている状態
 *
 * out_of_stock: 在庫切れ - 在庫がゼロになった状態
 *
 * ordered: 発注済み - 補充のための発注が行われた状態
 *
 * discontinued: 廃番 - 商品の取り扱いを終了した状態
 */
export type InventoryStatusType = z.infer<typeof InventoryStatusTypeSchema>

/**
 * @description
 * ロイヤルティティア区分 - 顧客ロイヤルティプログラムの会員ランク
 *
 *
 * bronze: ブロンズ - 基本会員ランク、初期段階の特典を提供
 *
 * silver: シルバー - 中級会員ランク、標準的な特典を提供
 *
 * gold: ゴールド - 上級会員ランク、優待特典を提供
 *
 * platinum: プラチナ - 最上級会員ランク、最高レベルの特典を提供
 */
export const LoyaltyTierTypeSchema = z.enum([
  'bronze',
  'silver',
  'gold',
  'platinum',
])
/**
 * @description
 * ロイヤルティティア区分 - 顧客ロイヤルティプログラムの会員ランク
 *
 *
 * bronze: ブロンズ - 基本会員ランク、初期段階の特典を提供
 *
 * silver: シルバー - 中級会員ランク、標準的な特典を提供
 *
 * gold: ゴールド - 上級会員ランク、優待特典を提供
 *
 * platinum: プラチナ - 最上級会員ランク、最高レベルの特典を提供
 */
export type LoyaltyTierType = z.infer<typeof LoyaltyTierTypeSchema>

/**
 * @description
 * メイクアップサブカテゴリー区分 - メイクアップサービスの詳細分類
 *
 *
 * everyday_makeup: デイリーメイク - 普段使いのナチュラルメイク
 *
 * event_makeup: イベントメイク - パーティーやイベント用の華やかなメイク
 *
 * bridal_makeup: ブライダルメイク - 花嫁向けの特別なメイクアップ
 *
 * photoshoot_makeup: 撮影用メイク - 写真撮影用のプロフェッショナルメイク
 */
export const MakeupSubCategoryTypeSchema = z.enum([
  'everyday_makeup',
  'event_makeup',
  'bridal_makeup',
  'photoshoot_makeup',
])
/**
 * @description
 * メイクアップサブカテゴリー区分 - メイクアップサービスの詳細分類
 *
 *
 * everyday_makeup: デイリーメイク - 普段使いのナチュラルメイク
 *
 * event_makeup: イベントメイク - パーティーやイベント用の華やかなメイク
 *
 * bridal_makeup: ブライダルメイク - 花嫁向けの特別なメイクアップ
 *
 * photoshoot_makeup: 撮影用メイク - 写真撮影用のプロフェッショナルメイク
 */
export type MakeupSubCategoryType = z.infer<typeof MakeupSubCategoryTypeSchema>

/**
 * @description
 * 会員特典タイプ区分 - 会員ランクに応じて提供される特典の種類
 *
 *
 * discount_rate: 割引率 - サービス料金に対するパーセンテージ割引
 *
 * point_multiplier: ポイント倍率 - 通常のポイント付与率に対する乗数
 *
 * priority_booking: 優先予約 - 一般公開前の優先的な予約権利
 *
 * free_service: 無料サービス - 特定サービスの無料提供
 *
 * birthday_special: 誕生日特典 - 誕生月に提供される特別サービス
 *
 * exclusive_access: 特別アクセス権 - VIP専用メニューや特別イベントへの参加権
 */
export const MembershipBenefitTypeSchema = z.enum([
  'discount_rate',
  'point_multiplier',
  'priority_booking',
  'free_service',
  'birthday_special',
  'exclusive_access',
])
/**
 * @description
 * 会員特典タイプ区分 - 会員ランクに応じて提供される特典の種類
 *
 *
 * discount_rate: 割引率 - サービス料金に対するパーセンテージ割引
 *
 * point_multiplier: ポイント倍率 - 通常のポイント付与率に対する乗数
 *
 * priority_booking: 優先予約 - 一般公開前の優先的な予約権利
 *
 * free_service: 無料サービス - 特定サービスの無料提供
 *
 * birthday_special: 誕生日特典 - 誕生月に提供される特別サービス
 *
 * exclusive_access: 特別アクセス権 - VIP専用メニューや特別イベントへの参加権
 */
export type MembershipBenefitType = z.infer<typeof MembershipBenefitTypeSchema>

/**
 * @description
 * 会員ランク区分 - 顧客の会員ランクを表し、特典・優待内容を決定する区分
 *
 *
 * regular: 一般会員 - 基本ランク、標準的なサービスを提供
 *
 * silver: シルバー会員 - 中級ランク、5%の基本割引等の特典付与
 *
 * gold: ゴールド会員 - 上級ランク、10%の割引や優先予約等の特典付与
 *
 * platinum: プラチナ会員 - 最上級ランク、15%の割引や特別サービス提供
 *
 * vip: VIP会員 - 特別会員、完全カスタマイズされた特別待遇を提供
 */
export const MembershipTierTypeSchema = z.enum([
  'regular',
  'silver',
  'gold',
  'platinum',
  'vip',
])
/**
 * @description
 * 会員ランク区分 - 顧客の会員ランクを表し、特典・優待内容を決定する区分
 *
 *
 * regular: 一般会員 - 基本ランク、標準的なサービスを提供
 *
 * silver: シルバー会員 - 中級ランク、5%の基本割引等の特典付与
 *
 * gold: ゴールド会員 - 上級ランク、10%の割引や優先予約等の特典付与
 *
 * platinum: プラチナ会員 - 最上級ランク、15%の割引や特別サービス提供
 *
 * vip: VIP会員 - 特別会員、完全カスタマイズされた特別待遇を提供
 */
export type MembershipTierType = z.infer<typeof MembershipTierTypeSchema>

/**
 * @description
 * ネイルサブカテゴリー区分 - ネイルケアサービスの詳細分類
 *
 *
 * manicure: マニキュア - 手の爪のケアと装飾
 *
 * pedicure: ペディキュア - 足の爪のケアと装飾
 *
 * gel_nail: ジェルネイル - UV/LEDライトで硬化させるジェルネイル
 *
 * nail_art: ネイルアート - デザインや装飾を施したアートネイル
 *
 * nail_removal: ネイルリムーバル - ジェルやマニキュアの除去サービス
 */
export const NailSubCategoryTypeSchema = z.enum([
  'manicure',
  'pedicure',
  'gel_nail',
  'nail_art',
  'nail_removal',
])
/**
 * @description
 * ネイルサブカテゴリー区分 - ネイルケアサービスの詳細分類
 *
 *
 * manicure: マニキュア - 手の爪のケアと装飾
 *
 * pedicure: ペディキュア - 足の爪のケアと装飾
 *
 * gel_nail: ジェルネイル - UV/LEDライトで硬化させるジェルネイル
 *
 * nail_art: ネイルアート - デザインや装飾を施したアートネイル
 *
 * nail_removal: ネイルリムーバル - ジェルやマニキュアの除去サービス
 */
export type NailSubCategoryType = z.infer<typeof NailSubCategoryTypeSchema>

/**
 * @description
 * 通知タイプ区分 - 顧客への通知・連絡手段の種類
 *
 *
 * email: Eメール - 電子メールによる通知
 *
 * sms: SMS - ショートメッセージサービスによる通知
 *
 * push: プッシュ通知 - モバイルアプリのプッシュ通知
 *
 * line: LINE - LINEメッセージングサービスによる通知
 */
export const NotificationTypeSchema = z.enum(['email', 'sms', 'push', 'line'])
/**
 * @description
 * 通知タイプ区分 - 顧客への通知・連絡手段の種類
 *
 *
 * email: Eメール - 電子メールによる通知
 *
 * sms: SMS - ショートメッセージサービスによる通知
 *
 * push: プッシュ通知 - モバイルアプリのプッシュ通知
 *
 * line: LINE - LINEメッセージングサービスによる通知
 */
export type NotificationType = z.infer<typeof NotificationTypeSchema>

/**
 * @description
 * 発注ステータス区分 - 商品発注の進行状態を表す区分
 *
 *
 * draft: 下書き - 発注内容を作成中の状態
 *
 * pending: 承認待ち - 発注内容が確定し、承認を待っている状態
 *
 * approved: 承認済み - 責任者により発注が承認された状態
 *
 * ordered: 発注済み - サプライヤーへ正式に発注が行われた状態
 *
 * shipped: 発送済み - サプライヤーから商品が発送された状態
 *
 * delivered: 配送完了 - 商品が到着し、受領が完了した状態
 *
 * cancelled: キャンセル - 発注が取り消された状態
 */
export const OrderStatusTypeSchema = z.enum([
  'draft',
  'pending',
  'approved',
  'ordered',
  'shipped',
  'delivered',
  'cancelled',
])
/**
 * @description
 * 発注ステータス区分 - 商品発注の進行状態を表す区分
 *
 *
 * draft: 下書き - 発注内容を作成中の状態
 *
 * pending: 承認待ち - 発注内容が確定し、承認を待っている状態
 *
 * approved: 承認済み - 責任者により発注が承認された状態
 *
 * ordered: 発注済み - サプライヤーへ正式に発注が行われた状態
 *
 * shipped: 発送済み - サプライヤーから商品が発送された状態
 *
 * delivered: 配送完了 - 商品が到着し、受領が完了した状態
 *
 * cancelled: キャンセル - 発注が取り消された状態
 */
export type OrderStatusType = z.infer<typeof OrderStatusTypeSchema>

/**
 * @description
 * パスワードリセット状態区分 - パスワードリセットの進行状態を表す区分
 *
 *
 * none: なし - パスワードリセットが要求されていない状態
 *
 * requested: リクエスト中 - パスワードリセットが要求された状態
 *
 * completed: 完了 - パスワードリセットが完了した状態
 */
export const PasswordResetStateTypeSchema = z.enum([
  'none',
  'requested',
  'completed',
])
/**
 * @description
 * パスワードリセット状態区分 - パスワードリセットの進行状態を表す区分
 *
 *
 * none: なし - パスワードリセットが要求されていない状態
 *
 * requested: リクエスト中 - パスワードリセットが要求された状態
 *
 * completed: 完了 - パスワードリセットが完了した状態
 */
export type PasswordResetStateType = z.infer<
  typeof PasswordResetStateTypeSchema
>

/**
 * @description
 * 支払い方法区分 - サロンで利用可能な決済手段の種類
 *
 *
 * cash: 現金 - 現金による支払い
 *
 * credit_card: クレジットカード - クレジットカードによる支払い
 *
 * debit_card: デビットカード - 銀行口座から直接引き落としのカード支払い
 *
 * e_money: 電子マネー - Suica、PASMO等の電子マネーによる支払い
 *
 * qr_payment: QRコード決済 - PayPay、LINE Pay等のQRコード決済
 *
 * bank_transfer: 銀行振込 - 銀行口座への振込による支払い
 *
 * point: ポイント - サロンのポイントを使用した支払い
 */
export const PaymentMethodTypeSchema = z.enum([
  'cash',
  'credit_card',
  'debit_card',
  'e_money',
  'qr_payment',
  'bank_transfer',
  'point',
])
/**
 * @description
 * 支払い方法区分 - サロンで利用可能な決済手段の種類
 *
 *
 * cash: 現金 - 現金による支払い
 *
 * credit_card: クレジットカード - クレジットカードによる支払い
 *
 * debit_card: デビットカード - 銀行口座から直接引き落としのカード支払い
 *
 * e_money: 電子マネー - Suica、PASMO等の電子マネーによる支払い
 *
 * qr_payment: QRコード決済 - PayPay、LINE Pay等のQRコード決済
 *
 * bank_transfer: 銀行振込 - 銀行口座への振込による支払い
 *
 * point: ポイント - サロンのポイントを使用した支払い
 */
export type PaymentMethodType = z.infer<typeof PaymentMethodTypeSchema>

/**
 * @description
 * 支払いステータス区分 - 決済処理の進行状態を表す区分
 *
 *
 * pending: 支払い待ち - 支払いが開始されたがまだ完了していない状態
 *
 * processing: 処理中 - 決済処理が進行中の状態
 *
 * completed: 完了 - 支払いが正常に完了した状態
 *
 * failed: 失敗 - 支払い処理が失敗した状態
 *
 * refunded: 返金済み - 全額返金が完了した状態
 *
 * partial_refund: 部分返金 - 一部金額の返金が完了した状態
 */
export const PaymentStatusCodeTypeSchema = z.enum([
  'pending',
  'processing',
  'completed',
  'failed',
  'refunded',
  'partial_refund',
])
/**
 * @description
 * 支払いステータス区分 - 決済処理の進行状態を表す区分
 *
 *
 * pending: 支払い待ち - 支払いが開始されたがまだ完了していない状態
 *
 * processing: 処理中 - 決済処理が進行中の状態
 *
 * completed: 完了 - 支払いが正常に完了した状態
 *
 * failed: 失敗 - 支払い処理が失敗した状態
 *
 * refunded: 返金済み - 全額返金が完了した状態
 *
 * partial_refund: 部分返金 - 一部金額の返金が完了した状態
 */
export type PaymentStatusCodeType = z.infer<typeof PaymentStatusCodeTypeSchema>

/**
 * @description
 * パーマサブカテゴリー区分 - パーマネントサービスの詳細分類
 *
 *
 * regular_perm: 通常パーマ - コールドパーマ等の標準的なパーマ
 *
 * digital_perm: デジタルパーマ - 熱を使った形状記憶パーマ
 *
 * spiral_perm: スパイラルパーマ - 螺旋状の強いカールを作るパーマ
 *
 * body_wave: ボディウェーブ - 大きなウェーブを作るパーマ
 *
 * straightening: ストレートパーマ - 縮毛矯正や髪をストレートにする施術
 */
export const PermSubCategoryTypeSchema = z.enum([
  'regular_perm',
  'digital_perm',
  'spiral_perm',
  'body_wave',
  'straightening',
])
/**
 * @description
 * パーマサブカテゴリー区分 - パーマネントサービスの詳細分類
 *
 *
 * regular_perm: 通常パーマ - コールドパーマ等の標準的なパーマ
 *
 * digital_perm: デジタルパーマ - 熱を使った形状記憶パーマ
 *
 * spiral_perm: スパイラルパーマ - 螺旋状の強いカールを作るパーマ
 *
 * body_wave: ボディウェーブ - 大きなウェーブを作るパーマ
 *
 * straightening: ストレートパーマ - 縮毛矯正や髪をストレートにする施術
 */
export type PermSubCategoryType = z.infer<typeof PermSubCategoryTypeSchema>

/**
 * @description
 * 価格戦略タイプ区分 - サービスの価格設定方法を定義
 *
 *
 * fixed: 固定価格 - 常に同じ価格で提供
 *
 * tiered: 段階価格 - 条件によって価格が変わる段階制
 *
 * dynamic: 動的価格 - 需要や時間帯によって変動する価格
 *
 * package: パッケージ価格 - 複数サービスをセットで提供
 *
 * membership: 会員価格 - 会員ランクに応じた特別価格
 *
 * custom: カスタム価格 - 個別に設定される特別価格
 */
export const PricingStrategyTypeSchema = z.enum([
  'fixed',
  'tiered',
  'dynamic',
  'package',
  'membership',
  'custom',
])
/**
 * @description
 * 価格戦略タイプ区分 - サービスの価格設定方法を定義
 *
 *
 * fixed: 固定価格 - 常に同じ価格で提供
 *
 * tiered: 段階価格 - 条件によって価格が変わる段階制
 *
 * dynamic: 動的価格 - 需要や時間帯によって変動する価格
 *
 * package: パッケージ価格 - 複数サービスをセットで提供
 *
 * membership: 会員価格 - 会員ランクに応じた特別価格
 *
 * custom: カスタム価格 - 個別に設定される特別価格
 */
export type PricingStrategyType = z.infer<typeof PricingStrategyTypeSchema>

/**
 * @description
 * リマインダータイミング区分 - 予約リマインダーを送信するタイミングの設定
 *
 *
 * one_day_before: 1日前 - 予約日の24時間前に通知
 *
 * three_hours_before: 3時間前 - 予約時刻の3時間前に通知
 *
 * one_hour_before: 1時間前 - 予約時刻の1時間前に通知
 *
 * thirty_minutes_before: 30分前 - 予約時刻の30分前に通知
 */
export const ReminderTimingTypeSchema = z.enum([
  'one_day_before',
  'three_hours_before',
  'one_hour_before',
  'thirty_minutes_before',
])
/**
 * @description
 * リマインダータイミング区分 - 予約リマインダーを送信するタイミングの設定
 *
 *
 * one_day_before: 1日前 - 予約日の24時間前に通知
 *
 * three_hours_before: 3時間前 - 予約時刻の3時間前に通知
 *
 * one_hour_before: 1時間前 - 予約時刻の1時間前に通知
 *
 * thirty_minutes_before: 30分前 - 予約時刻の30分前に通知
 */
export type ReminderTimingType = z.infer<typeof ReminderTimingTypeSchema>

/**
 * @description
 * 予約ステータス区分 - 予約の進行状態を表す状態定義
 *
 *
 * pending: 保留中 - 予約申込を受け付けたが、まだ確定していない状態
 *
 * confirmed: 確定済み - サロン側で予約が承認・確定された状態
 *
 * cancelled: キャンセル済み - 顧客またはサロン側により予約が取り消された状態
 *
 * completed: 完了 - 予約された施術が実施され、サービス提供が完了した状態
 *
 * no_show: 無断キャンセル - 顧客が事前連絡なしに来店しなかった状態
 */
export const ReservationStatusTypeSchema = z.enum([
  'pending',
  'confirmed',
  'cancelled',
  'completed',
  'no_show',
])
/**
 * @description
 * 予約ステータス区分 - 予約の進行状態を表す状態定義
 *
 *
 * pending: 保留中 - 予約申込を受け付けたが、まだ確定していない状態
 *
 * confirmed: 確定済み - サロン側で予約が承認・確定された状態
 *
 * cancelled: キャンセル済み - 顧客またはサロン側により予約が取り消された状態
 *
 * completed: 完了 - 予約された施術が実施され、サービス提供が完了した状態
 *
 * no_show: 無断キャンセル - 顧客が事前連絡なしに来店しなかった状態
 */
export type ReservationStatusType = z.infer<typeof ReservationStatusTypeSchema>

/**
 * @description
 * 頭皮状態区分 - 頭皮の状態を分類、適切なケア方法の選択に使用
 *
 *
 * normal: 正常 - 健康的な頭皮状態、特別なケア不要
 *
 * dry: 乾燥 - 乾燥しやすい頭皮、保湿ケアが必要
 *
 * oily: 脂性 - 皮脂分泌が多い頭皮、洗浄力のあるケアが必要
 *
 * sensitive: 敏感 - 刺激に弱い頭皮、低刺激の製品使用が必要
 */
export const ScalpConditionTypeSchema = z.enum([
  'normal',
  'dry',
  'oily',
  'sensitive',
  'dandruff',
])
/**
 * @description
 * 頭皮状態区分 - 頭皮の状態を分類、適切なケア方法の選択に使用
 *
 *
 * normal: 正常 - 健康的な頭皮状態、特別なケア不要
 *
 * dry: 乾燥 - 乾燥しやすい頭皮、保湿ケアが必要
 *
 * oily: 脂性 - 皮脂分泌が多い頭皮、洗浄力のあるケアが必要
 *
 * sensitive: 敏感 - 刺激に弱い頭皮、低刺激の製品使用が必要
 */
export type ScalpConditionType = z.infer<typeof ScalpConditionTypeSchema>

/**
 * @description
 * サービス提供可能性タイプ区分 - サービスが提供される時期や条件
 *
 *
 * always: 常時提供 - いつでも利用可能なサービス
 *
 * scheduled: スケジュール制 - 特定の時間帯のみ提供
 *
 * by_appointment: 予約制 - 事前予約が必要なサービス
 *
 * seasonal: 季節限定 - 特定の季節のみ提供
 *
 * limited: 数量限定 - 提供数に制限があるサービス
 */
export const ServiceAvailabilityTypeSchema = z.enum([
  'always',
  'scheduled',
  'by_appointment',
  'seasonal',
  'limited',
])
/**
 * @description
 * サービス提供可能性タイプ区分 - サービスが提供される時期や条件
 *
 *
 * always: 常時提供 - いつでも利用可能なサービス
 *
 * scheduled: スケジュール制 - 特定の時間帯のみ提供
 *
 * by_appointment: 予約制 - 事前予約が必要なサービス
 *
 * seasonal: 季節限定 - 特定の季節のみ提供
 *
 * limited: 数量限定 - 提供数に制限があるサービス
 */
export type ServiceAvailabilityType = z.infer<
  typeof ServiceAvailabilityTypeSchema
>

/**
 * @description
 * サービスカテゴリー区分 - サロンで提供される主要なサービスカテゴリーの定義
 *
 *
 * cut: カット - ヘアカット、トリミング等の切断系サービス
 *
 * color: カラー - ヘアカラー、ハイライト等の染色系サービス
 *
 * perm: パーマ - パーマネント、デジタルパーマ等のウェーブ形成サービス
 *
 * treatment: トリートメント - ヘアトリートメント、ヘアケア等の補修・改善サービス
 *
 * spa: スパ - ヘッドスパ、リラクゼーション等の癒し系サービス
 *
 * other: その他 - 上記カテゴリーに分類されないサービス
 */
export const ServiceCategoryTypeSchema = z.enum([
  'cut',
  'color',
  'perm',
  'treatment',
  'spa',
  'other',
])
/**
 * @description
 * サービスカテゴリー区分 - サロンで提供される主要なサービスカテゴリーの定義
 *
 *
 * cut: カット - ヘアカット、トリミング等の切断系サービス
 *
 * color: カラー - ヘアカラー、ハイライト等の染色系サービス
 *
 * perm: パーマ - パーマネント、デジタルパーマ等のウェーブ形成サービス
 *
 * treatment: トリートメント - ヘアトリートメント、ヘアケア等の補修・改善サービス
 *
 * spa: スパ - ヘッドスパ、リラクゼーション等の癒し系サービス
 *
 * other: その他 - 上記カテゴリーに分類されないサービス
 */
export type ServiceCategoryType = z.infer<typeof ServiceCategoryTypeSchema>

/**
 * @description
 * サービスオプションタイプ区分 - サービスに追加できるオプションの種類
 *
 *
 * addon: アドオン - 基本サービスに追加できるオプション
 *
 * upgrade: アップグレード - サービスのグレードを上げるオプション
 *
 * duration: 時間延長 - サービス時間を延長するオプション
 *
 * product: 商品追加 - サービスに商品を含めるオプション
 *
 * combo: コンボ - 複数サービスの組み合わせオプション
 */
export const ServiceOptionTypeSchema = z.enum([
  'addon',
  'upgrade',
  'duration',
  'product',
  'combo',
])
/**
 * @description
 * サービスオプションタイプ区分 - サービスに追加できるオプションの種類
 *
 *
 * addon: アドオン - 基本サービスに追加できるオプション
 *
 * upgrade: アップグレード - サービスのグレードを上げるオプション
 *
 * duration: 時間延長 - サービス時間を延長するオプション
 *
 * product: 商品追加 - サービスに商品を含めるオプション
 *
 * combo: コンボ - 複数サービスの組み合わせオプション
 */
export type ServiceOptionType = z.infer<typeof ServiceOptionTypeSchema>

/**
 * @description
 * サービスステータス区分 - サービスの提供状態を表す区分
 *
 *
 * active: 有効 - 現在提供中のサービス
 *
 * inactive: 一時停止 - 一時的に提供を停止しているサービス
 *
 * seasonal: 季節限定 - 特定の季節のみ提供されるサービス
 *
 * limited: 数量限定 - 残りわずかなサービス
 *
 * discontinued: 廃止 - 提供を終了したサービス
 *
 * coming_soon: 近日公開 - 近々提供予定のサービス
 */
export const ServiceStatusTypeSchema = z.enum([
  'active',
  'inactive',
  'seasonal',
  'limited',
  'discontinued',
  'coming_soon',
])
/**
 * @description
 * サービスステータス区分 - サービスの提供状態を表す区分
 *
 *
 * active: 有効 - 現在提供中のサービス
 *
 * inactive: 一時停止 - 一時的に提供を停止しているサービス
 *
 * seasonal: 季節限定 - 特定の季節のみ提供されるサービス
 *
 * limited: 数量限定 - 残りわずかなサービス
 *
 * discontinued: 廃止 - 提供を終了したサービス
 *
 * coming_soon: 近日公開 - 近々提供予定のサービス
 */
export type ServiceStatusType = z.infer<typeof ServiceStatusTypeSchema>

/**
 * @description
 * スパサブカテゴリー区分 - スパ・リラクゼーションサービスの詳細分類
 *
 *
 * head_spa: ヘッドスパ - 頭部のマッサージと頭皮ケアを組み合わせたスパ
 *
 * scalp_massage: スカルプマッサージ - 頭皮の血行促進マッサージ
 *
 * aromatherapy: アロマテラピー - アロマオイルを使用したリラクゼーション
 *
 * relaxation: リラクゼーション - ストレス解消を目的とした総合的なケア
 */
export const SpaSubCategoryTypeSchema = z.enum([
  'head_spa',
  'scalp_massage',
  'aromatherapy',
  'relaxation',
])
/**
 * @description
 * スパサブカテゴリー区分 - スパ・リラクゼーションサービスの詳細分類
 *
 *
 * head_spa: ヘッドスパ - 頭部のマッサージと頭皮ケアを組み合わせたスパ
 *
 * scalp_massage: スカルプマッサージ - 頭皮の血行促進マッサージ
 *
 * aromatherapy: アロマテラピー - アロマオイルを使用したリラクゼーション
 *
 * relaxation: リラクゼーション - ストレス解消を目的とした総合的なケア
 */
export type SpaSubCategoryType = z.infer<typeof SpaSubCategoryTypeSchema>

/**
 * @description
 * スタッフレベル区分 - スタッフの技術レベルや経験を表す階層
 *
 *
 * junior: ジュニア - 新人・見習いレベル、基本的な施術が可能
 *
 * stylist: スタイリスト - 標準レベル、一般的な施術が可能
 *
 * senior: シニア - 上級レベル、高度な技術と経験を保有
 *
 * expert: エキスパート - 専門家レベル、特殊技術や指導が可能
 *
 * director: ディレクター - 管理職レベル、サロンの技術的な指導を担当
 */
export const StaffLevelTypeSchema = z.enum([
  'junior',
  'stylist',
  'senior',
  'expert',
  'director',
])
/**
 * @description
 * スタッフレベル区分 - スタッフの技術レベルや経験を表す階層
 *
 *
 * junior: ジュニア - 新人・見習いレベル、基本的な施術が可能
 *
 * stylist: スタイリスト - 標準レベル、一般的な施術が可能
 *
 * senior: シニア - 上級レベル、高度な技術と経験を保有
 *
 * expert: エキスパート - 専門家レベル、特殊技術や指導が可能
 *
 * director: ディレクター - 管理職レベル、サロンの技術的な指導を担当
 */
export type StaffLevelType = z.infer<typeof StaffLevelTypeSchema>

/**
 * @description
 * スタイリングサブカテゴリー区分 - ヘアスタイリングサービスの詳細分類
 *
 *
 * blowout: ブローアウト - ブロードライでボリュームを出すスタイリング
 *
 * updo: アップスタイル - まとめ髪、シニヨン等のヘアアレンジ
 *
 * braiding: 編み込み - 三つ編み、編み込みアレンジ等
 *
 * extensions: エクステンション - ヘアエクステの装着サービス
 *
 * event_styling: イベントスタイリング - 結婚式、パーティー等の特別なスタイリング
 */
export const StylingSubCategoryTypeSchema = z.enum([
  'blowout',
  'updo',
  'braiding',
  'extensions',
  'event_styling',
])
/**
 * @description
 * スタイリングサブカテゴリー区分 - ヘアスタイリングサービスの詳細分類
 *
 *
 * blowout: ブローアウト - ブロードライでボリュームを出すスタイリング
 *
 * updo: アップスタイル - まとめ髪、シニヨン等のヘアアレンジ
 *
 * braiding: 編み込み - 三つ編み、編み込みアレンジ等
 *
 * extensions: エクステンション - ヘアエクステの装着サービス
 *
 * event_styling: イベントスタイリング - 結婚式、パーティー等の特別なスタイリング
 */
export type StylingSubCategoryType = z.infer<
  typeof StylingSubCategoryTypeSchema
>

/**
 * @description
 * システムロールタイプ区分 - システムで事前定義されたロールの種類
 *
 *
 * super_admin: スーパー管理者 - システム全体へのフルアクセス権限
 *
 * salon_owner: サロンオーナー - サロン全体へのフルアクセス権限
 *
 * salon_manager: サロンマネージャー - サロンの管理業務権限
 *
 * senior_staff: シニアスタッフ - 上級スタイリスト・セラピストの権限
 *
 * staff: スタッフ - 一般スタッフの権限
 *
 * receptionist: 受付 - フロントデスク業務の権限
 *
 * customer: 顧客 - 顧客セルフサービスの権限
 *
 * guest: ゲスト - 限定的なゲストアクセス権限
 */
export const SystemRoleTypeSchema = z.enum([
  'super_admin',
  'salon_owner',
  'salon_manager',
  'senior_staff',
  'staff',
  'receptionist',
  'customer',
  'guest',
])
/**
 * @description
 * システムロールタイプ区分 - システムで事前定義されたロールの種類
 *
 *
 * super_admin: スーパー管理者 - システム全体へのフルアクセス権限
 *
 * salon_owner: サロンオーナー - サロン全体へのフルアクセス権限
 *
 * salon_manager: サロンマネージャー - サロンの管理業務権限
 *
 * senior_staff: シニアスタッフ - 上級スタイリスト・セラピストの権限
 *
 * staff: スタッフ - 一般スタッフの権限
 *
 * receptionist: 受付 - フロントデスク業務の権限
 *
 * customer: 顧客 - 顧客セルフサービスの権限
 *
 * guest: ゲスト - 限定的なゲストアクセス権限
 */
export type SystemRoleType = z.infer<typeof SystemRoleTypeSchema>

/**
 * @description
 * トリートメントサブカテゴリー区分 - ヘアトリートメントサービスの詳細分類
 *
 *
 * deep_conditioning: ディープコンディショニング - 髪の内部まで栄養を浸透させるトリートメント
 *
 * protein_treatment: プロテイントリートメント - タンパク質を補給し髪を強化するトリートメント
 *
 * scalp_treatment: スカルプトリートメント - 頭皮ケアに特化したトリートメント
 *
 * keratin_treatment: ケラチントリートメント - ケラチンを補充し髪をストレートにするトリートメント
 *
 * olaplex: オラプレックス - ダメージした髪の内部結合を修復するトリートメント
 */
export const TreatmentSubCategoryTypeSchema = z.enum([
  'deep_conditioning',
  'protein_treatment',
  'scalp_treatment',
  'keratin_treatment',
  'olaplex',
])
/**
 * @description
 * トリートメントサブカテゴリー区分 - ヘアトリートメントサービスの詳細分類
 *
 *
 * deep_conditioning: ディープコンディショニング - 髪の内部まで栄養を浸透させるトリートメント
 *
 * protein_treatment: プロテイントリートメント - タンパク質を補給し髪を強化するトリートメント
 *
 * scalp_treatment: スカルプトリートメント - 頭皮ケアに特化したトリートメント
 *
 * keratin_treatment: ケラチントリートメント - ケラチンを補充し髪をストレートにするトリートメント
 *
 * olaplex: オラプレックス - ダメージした髪の内部結合を修復するトリートメント
 */
export type TreatmentSubCategoryType = z.infer<
  typeof TreatmentSubCategoryTypeSchema
>

/**
 * @description
 * 施術タイプ区分 - サロンで提供される具体的な施術の種類
 *
 *
 * cut: カット - ヘアカット、レイヤーカット等の切断技術
 *
 * color: カラー - ヘアカラー、白髪染め、ハイライト等の染色技術
 *
 * perm: パーマ - コールドパーマ、デジタルパーマ等のウェーブ技術
 *
 * treatment: トリートメント - ダメージケア、栄養補給等の毛髪改善技術
 *
 * head_spa: ヘッドスパ - 頭皮マッサージ、スカルプケア等の頭皮ケア技術
 *
 * styling: スタイリング - セット、アレンジ等のスタイリング技術
 *
 * extension: エクステンション - ヘアエクステ、増毛等の毛髪追加技術
 *
 * nail: ネイル - マニキュア、ジェルネイル等の爪装飾技術
 *
 * eyelash: まつげ - まつげエクステ、まつげパーマ等のまつげ装飾技術
 *
 * other: その他 - 上記に分類されない施術
 */
export const TreatmentTypeSchema = z.enum([
  'cut',
  'color',
  'perm',
  'treatment',
  'head_spa',
  'styling',
  'extension',
  'nail',
  'eyelash',
  'other',
])
/**
 * @description
 * 施術タイプ区分 - サロンで提供される具体的な施術の種類
 *
 *
 * cut: カット - ヘアカット、レイヤーカット等の切断技術
 *
 * color: カラー - ヘアカラー、白髪染め、ハイライト等の染色技術
 *
 * perm: パーマ - コールドパーマ、デジタルパーマ等のウェーブ技術
 *
 * treatment: トリートメント - ダメージケア、栄養補給等の毛髪改善技術
 *
 * head_spa: ヘッドスパ - 頭皮マッサージ、スカルプケア等の頭皮ケア技術
 *
 * styling: スタイリング - セット、アレンジ等のスタイリング技術
 *
 * extension: エクステンション - ヘアエクステ、増毛等の毛髪追加技術
 *
 * nail: ネイル - マニキュア、ジェルネイル等の爪装飾技術
 *
 * eyelash: まつげ - まつげエクステ、まつげパーマ等のまつげ装飾技術
 *
 * other: その他 - 上記に分類されない施術
 */
export type TreatmentType = z.infer<typeof TreatmentTypeSchema>

/**
 * @description
 * 2要素認証ステータス区分 - 2要素認証の設定状態
 *
 *
 * disabled: 無効 - 2要素認証が設定されていない状態
 *
 * pending: 設定中 - 2要素認証の設定が進行中の状態
 *
 * enabled: 有効 - 2要素認証が有効化されている状態
 */
export const TwoFactorStatusTypeSchema = z.enum([
  'disabled',
  'pending',
  'enabled',
])
/**
 * @description
 * 2要素認証ステータス区分 - 2要素認証の設定状態
 *
 *
 * disabled: 無効 - 2要素認証が設定されていない状態
 *
 * pending: 設定中 - 2要素認証の設定が進行中の状態
 *
 * enabled: 有効 - 2要素認証が有効化されている状態
 */
export type TwoFactorStatusType = z.infer<typeof TwoFactorStatusTypeSchema>

/**
 * @description
 * ユーザーアカウントステータス区分 - アカウントの利用可否状態
 *
 *
 * active: アクティブ - 正常に利用可能なアカウント
 *
 * unverified: メール未確認 - メールアドレスが確認されていないアカウント
 *
 * locked: ロック - ログイン失敗回数超過によりロックされたアカウント
 *
 * suspended: 停止 - 管理者によって停止されたアカウント
 *
 * deleted: 削除済み - 削除されたアカウント
 */
export const UserAccountStatusTypeSchema = z.enum([
  'active',
  'unverified',
  'locked',
  'suspended',
  'deleted',
])
/**
 * @description
 * ユーザーアカウントステータス区分 - アカウントの利用可否状態
 *
 *
 * active: アクティブ - 正常に利用可能なアカウント
 *
 * unverified: メール未確認 - メールアドレスが確認されていないアカウント
 *
 * locked: ロック - ログイン失敗回数超過によりロックされたアカウント
 *
 * suspended: 停止 - 管理者によって停止されたアカウント
 *
 * deleted: 削除済み - 削除されたアカウント
 */
export type UserAccountStatusType = z.infer<typeof UserAccountStatusTypeSchema>

/**
 * @description
 * ユーザーロール区分 - システム内でのユーザーの役割と権限レベル
 *
 *
 * customer: 顧客 - サービスの予約・利用が可能なユーザー
 *
 * staff: スタッフ - 施術を提供するサロン従業員
 *
 * manager: マネージャー - サロンの管理業務を担当する管理者
 *
 * admin: 管理者 - システム全体の管理権限を持つユーザー
 *
 * owner: オーナー - サロンの所有者、最高権限を保持
 */
export const UserRoleTypeSchema = z.enum([
  'customer',
  'staff',
  'manager',
  'admin',
  'owner',
])
/**
 * @description
 * ユーザーロール区分 - システム内でのユーザーの役割と権限レベル
 *
 *
 * customer: 顧客 - サービスの予約・利用が可能なユーザー
 *
 * staff: スタッフ - 施術を提供するサロン従業員
 *
 * manager: マネージャー - サロンの管理業務を担当する管理者
 *
 * admin: 管理者 - システム全体の管理権限を持つユーザー
 *
 * owner: オーナー - サロンの所有者、最高権限を保持
 */
export type UserRoleType = z.infer<typeof UserRoleTypeSchema>
