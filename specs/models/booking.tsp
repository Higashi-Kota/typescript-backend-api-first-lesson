import "@typespec/http";
import "./_shared/common.tsp";
import "./payment.tsp";

using TypeSpec.Http;
using BeautySalon.Models;

namespace BeautySalon.Models {
  @doc("""
    予約ステータスコード区分 - 予約の詳細な進行状態を表す区分
    
    draft: 下書き - 予約内容を作成中、まだ確定していない状態
    pending: 保留中 - 予約リクエストを受付、確認待ちの状態
    confirmed: 確定 - 予約が確定し、スタッフが割り当てられた状態
    in_progress: 施術中 - 現在サービスを実施中の状態
    completed: 完了 - サービス提供が終了した状態
    cancelled: キャンセル - 予約がキャンセルされた状態
    no_show: 無断キャンセル - 顧客が連絡なしに来店しなかった状態
    """)
  enum BookingStatusCodeType {
    draft,
    pending,
    confirmed,
    in_progress,
    completed,
    cancelled,
    no_show,
  }

  @doc("予約の進行状況ごとに保持する詳細情報ユニオン。")
  union BookingStatus {
    @doc("下書き状態の詳細情報。")
    draft: DraftBookingStatus,

    @doc("保留状態の詳細情報。")
    pending: PendingBookingStatus,

    @doc("確定状態の詳細情報。")
    confirmed: ConfirmedBookingStatus,

    @doc("施術中状態の詳細情報。")
    in_progress: InProgressBookingStatus,

    @doc("完了状態の詳細情報。")
    completed: CompletedBookingStatus,

    @doc("キャンセル状態の詳細情報。")
    cancelled: CancelledBookingStatus,

    @doc("無断キャンセル状態の詳細情報。")
    no_show: NoShowBookingStatus,
  }

  @doc("予約が下書き段階にある場合の状態情報。")
  model DraftBookingStatus {
    @doc("固定値draft。下書き状態であることを示す。")
    type: "draft";

    @doc("下書きが作成された日時。")
    createdAt: utcDateTime;

    @doc("下書きの有効期限。無期限の場合はnull。")
    expiresAt: utcDateTime | null;
  }

  @doc("予約が確認待ち段階にある場合の状態情報。")
  model PendingBookingStatus {
    @doc("固定値pending。保留状態であることを示す。")
    type: "pending";

    @doc("顧客から予約リクエストを受け付けた日時。")
    requestedAt: utcDateTime;

    @doc("保留状態の有効期限。無期限の場合はnull。")
    holdExpiresAt: utcDateTime | null;

    @doc("仮割り当てされたスタッフID。スタッフが未確定の場合はnull。")
    assignedStaffId: StaffId | null;
  }

  @doc("予約が確定済みの場合の状態情報。")
  model ConfirmedBookingStatus {
    @doc("固定値confirmed。確定状態であることを示す。")
    type: "confirmed";

    @doc("予約を確定した日時。")
    confirmedAt: utcDateTime;

    @doc("担当するスタッフID。")
    staffId: StaffId;

    @doc("施術開始予定日時。")
    expectedStart: utcDateTime;
  }

  @doc("施術が進行中の場合の状態情報。")
  model InProgressBookingStatus {
    @doc("固定値in_progress。施術中であることを示す。")
    type: "in_progress";

    @doc("施術を開始した日時。")
    startedAt: utcDateTime;

    @doc("施術を行っているブースや席の名称。席が指定されていない場合はnull。")
    stationName: string | null;
  }

  @doc("施術が完了した場合の状態情報。")
  model CompletedBookingStatus {
    @doc("固定値completed。完了状態であることを示す。")
    type: "completed";

    @doc("施術が完了した日時。")
    completedAt: utcDateTime;

    @doc("関連する決済ID。支払いが未完了または不要の場合はnull。")
    paymentId: PaymentId | null;

    @doc("施術内容のサマリーメモ。メモを記録していない場合はnull。")
    serviceSummary: string | null;
  }

  @doc("予約がキャンセルされた場合の状態情報。")
  model CancelledBookingStatus {
    @doc("固定値cancelled。キャンセル状態であることを示す。")
    type: "cancelled";

    @doc("キャンセルが登録された日時。")
    cancelledAt: utcDateTime;

    @doc("キャンセル理由のメモ。理由が記録されていない場合はnull。")
    reason: string | null;

    @doc("キャンセルを実行した主体（customer: 顧客／salon: サロン側／system: システム判断）。")
    cancelledBy: "customer" | "salon" | "system";
  }

  @doc("来店が確認できなかった場合の状態情報。")
  model NoShowBookingStatus {
    @doc("固定値no_show。無断キャンセル状態であることを示す。")
    type: "no_show";

    @doc("無断キャンセルとして記録した日時。")
    recordedAt: utcDateTime;

    @doc("ペナルティを適用したかどうか。既定値はfalse。")
    penaltyApplied: boolean = false;
  }

  @doc("予約確定前に預かるデポジット情報。")
  model BookingDeposit {
    @doc("預かり金額。")
    amount: Money;

    @doc("デポジットの状態区分（pending: 入金待ち／paid: 入金済み／refunded: 返金済み／forfeited: 没収）。")
    status: "pending" | "paid" | "refunded" | "forfeited";

    @doc("支払い期日。即時支払いまたは期日が未設定の場合はnull。")
    dueDate: utcDateTime | null;

    @doc("入金が確認された日時。未入金の場合はnull。")
    paidAt: utcDateTime | null;

    @doc("返金した日時。返金していない場合はnull。")
    refundedAt: utcDateTime | null;

    @doc("紐づく決済ID。決済がない場合はnull。")
    paymentId: PaymentId | null;

    @doc("デポジットに関する備考。備考がない場合はnull。")
    notes: string | null;
  }

  @doc("ウェイティングリストに登録された顧客情報。")
  model WaitlistEntry {
    @doc("現在の待機順序。")
    position: int32;

    @doc("呼び出し予想時刻。時刻が未確定の場合はnull。")
    estimatedTime: utcDateTime | null;

    @doc("ウェイティングリストに参加した日時。")
    joinedAt: utcDateTime;

    @doc("待機権が失効する日時。無期限の場合はnull。")
    expiresAt: utcDateTime | null;

    @doc("呼び出し通知を送信した日時。未通知の場合はnull。")
    notifiedAt: utcDateTime | null;

    @doc("希望スタッフID。指名なしの場合はnull。")
    preferredStaffId: StaffId | null;

    @doc("希望サービスID。サービスを指定していない場合はnull。")
    preferredServiceId: ServiceId | null;

    @doc("追加メモ。メモがない場合はnull。")
    notes: string | null;
  }

  @doc("サロンで確定管理する予約の集約モデル。")
  model Booking {
    @doc("予約を一意に識別するID。")
    id: BookingId;

    @doc("予約が紐づくサロンID。")
    salonId: SalonId;

    @doc("予約を行った顧客ID。")
    customerId: CustomerId;

    @doc("関連する予約リクエストID一覧。")
    reservationIds: ReservationId[];

    @doc("進行状況ごとの詳細情報。")
    status: BookingStatus;

    @doc("現在のステータスコード。")
    statusCode: BookingStatusCodeType;

    @doc("ウェイティングリスト情報。ウェイティングリストに登録されていない場合はnull。")
    waitlistEntry: WaitlistEntry | null;

    @doc("預かり金に関する情報。デポジットが不要な場合はnull。")
    deposit: BookingDeposit | null;

    @doc("割引適用前の合計金額。")
    totalAmount: Money;

    @doc("適用された割引額")
    discountAmount: Money;

    @doc("最終的に請求する金額。")
    finalAmount: Money;

    @doc("未収金額。支払いが完了している場合はnull。")
    balanceDue: Money | null;

    @doc("予定している支払い方法。当日決定または未選択の場合はnull")
    paymentMethod: PaymentMethodType | null;

    @doc("支払いの進捗ステータス。支払いが未開始の場合はnull。")
    paymentStatus: PaymentStatusCodeType | null;

    @doc("スタッフ・顧客間で共有するメモ。メモがない場合はnull。")
    notes: string | null;

    ...AuditInfo;
  }

  @doc("予約を新規作成する際のリクエスト。")
  model CreateBookingRequest {
    @doc("予約対象のサロンID。")
    salonId: SalonId;

    @doc("予約を申し込む顧客ID。")
    customerId: CustomerId;

    @doc("紐付ける予約リクエストID一覧。")
    reservationIds: ReservationId[];

    @doc("ウェイティングリスト情報。ウェイティングリストに登録していない場合はnull。")
    waitlistEntry: WaitlistEntry | null;

    @doc("預かり金設定。デポジットが不要な場合はnull。")
    deposit: BookingDeposit | null;

    @doc("適用する割引額")
    discountAmount: Money;

    @doc("予定している支払い方法。当日決定または未選択の場合はnull")
    paymentMethod: PaymentMethodType | null;

    @doc("スタッフ向けの備考。備考がない場合はnull。")
    notes: string | null;

    @doc("外部連携や業務用に保持する任意メタデータ。追加情報が不要の場合はnull。")
    metadata: Record<unknown> | null;
  }

  @doc("予約情報を部分更新するためのリクエスト。null指定で値をリセット可能。")
  model BookingUpdateRequest {
    @doc("ステータス詳細の更新。")
    status?: BookingStatus;

    @doc("ステータスコードの更新。")
    statusCode?: BookingStatusCodeType;

    @doc("ウェイティングリスト情報の更新またはリセット。")
    waitlistEntry?: WaitlistEntry | null;

    @doc("デポジット情報の更新またはリセット。")
    deposit?: BookingDeposit | null;

    @doc("支払い方法の更新またはリセット。")
    paymentMethod?: PaymentMethodType | null;

    @doc("支払いステータスの更新またはリセット。")
    paymentStatus?: PaymentStatusCodeType | null;

    @doc("割引額の更新")
    discountAmount?: Money;

    @doc("最終請求額の更新。")
    finalAmount?: Money;

    @doc("未収金額の更新またはリセット。")
    balanceDue?: Money | null;

    @doc("備考の更新またはリセット。")
    notes?: string | null;

    @doc("任意メタデータの更新。")
    metadata?: Record<unknown>;
  }

  @doc("予約と関連情報をまとめた詳細ビュー。")
  model BookingDetail extends Booking {
    @doc("紐づく予約リクエストの詳細一覧。")
    reservations: ReservationDetail[];

    @doc("顧客の表示名。")
    customerName: string;

    @doc("サロンの表示名。")
    salonName: string;

    @doc("決済履歴の一覧。決済履歴がない場合はnull。")
    paymentHistory: PaymentHistory[] | null;

    @doc("ウェイティングリストの履歴。ウェイティングリストに登録したことがない場合はnull。")
    waitlistHistory: WaitlistEntry[] | null;
  }
}
