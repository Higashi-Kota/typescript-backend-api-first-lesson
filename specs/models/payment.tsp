import "@typespec/http";
import "./_shared/common.tsp";

using TypeSpec.Http;

namespace BeautySalon.Models {
  @doc("""
    支払い方法区分 - サロンで利用可能な決済手段の種類
    
    cash: 現金 - 現金による支払い
    credit_card: クレジットカード - クレジットカードによる支払い
    debit_card: デビットカード - 銀行口座から直接引き落としのカード支払い
    e_money: 電子マネー - Suica、PASMO等の電子マネーによる支払い
    qr_payment: QRコード決済 - PayPay、LINE Pay等のQRコード決済
    bank_transfer: 銀行振込 - 銀行口座への振込による支払い
    point: ポイント - サロンのポイントを使用した支払い
    """)
  enum PaymentMethodType {
    cash,
    credit_card,
    debit_card,
    e_money,
    qr_payment,
    bank_transfer,
    point,
  }

  @doc("""
    支払いステータス区分 - 決済処理の進行状態を表す区分
    
    pending: 支払い待ち - 支払いが開始されたがまだ完了していない状態
    processing: 処理中 - 決済処理が進行中の状態
    completed: 完了 - 支払いが正常に完了した状態
    failed: 失敗 - 支払い処理が失敗した状態
    refunded: 返金済み - 全額返金が完了した状態
    partial_refund: 部分返金 - 一部金額の返金が完了した状態
    """)
  enum PaymentStatusCodeType {
    pending,
    processing,
    completed,
    failed,
    refunded,
    partial_refund,
  }

  @doc("支払い状態の詳細情報を表すユニオン")
  union PaymentStatus {
    pending: PendingPaymentStatus,
    processing: ProcessingPaymentStatus,
    completed: CompletedPaymentStatus,
    failed: FailedPaymentStatus,
    refunded: RefundedPaymentStatus,
    partial_refund: PartialRefundPaymentStatus,
  }

  @doc("支払い待ち状態の詳細")
  model PendingPaymentStatus {
    @doc("状態種別（pending 固定値）")
    type: "pending";

    @doc("支払いが登録された日時")
    createdAt: utcDateTime;
  }

  @doc("決済処理中の状態の詳細")
  model ProcessingPaymentStatus {
    @doc("状態種別（processing 固定値）")
    type: "processing";

    @doc("処理開始日時")
    startedAt: utcDateTime;

    @doc("処理を担当しているスタッフ ID")
    processorId?: StaffId;
  }

  @doc("支払い完了状態の詳細")
  model CompletedPaymentStatus {
    @doc("状態種別（completed 固定値）")
    type: "completed";

    @doc("支払い完了日時")
    completedAt: utcDateTime;

    @doc("実際に決済された金額")
    paidAmount: Money;

    @doc("発行されたレシート番号")
    receiptNumber?: string;
  }

  @doc("支払い失敗状態の詳細")
  model FailedPaymentStatus {
    @doc("状態種別（failed 固定値）")
    type: "failed";

    @doc("支払いが失敗した日時")
    failedAt: utcDateTime;

    @doc("失敗理由の説明")
    reason: string;

    @doc("再試行が可能かどうか")
    retryable?: boolean = false;
  }

  @doc("全額返金済み状態の詳細")
  model RefundedPaymentStatus {
    @doc("状態種別（refunded 固定値）")
    type: "refunded";

    @doc("返金が完了した日時")
    refundedAt: utcDateTime;

    @doc("返金金額")
    refundAmount: Money;

    @doc("関連する返金 ID")
    refundId?: RefundId;
  }

  @doc("部分返金済み状態の詳細")
  model PartialRefundPaymentStatus {
    @doc("状態種別（partial_refund 固定値）")
    type: "partial_refund";

    @doc("返金が行われた日時")
    refundedAt: utcDateTime;

    @doc("返金された金額")
    refundAmount: Money;

    @doc("返金後に残る請求金額")
    remainingAmount: Money;

    @doc("関連する返金 ID")
    refundId: RefundId;
  }

  @doc("請求金額の内訳")
  model PaymentAmounts {
    @doc("サービス代金の税抜合計")
    billed: Money;

    @doc("課税対象額に対する税額")
    tax?: Money;

    @doc("割引金額の合計")
    discount?: Money;

    @doc("チップとして受領する金額")
    tip?: Money;

    @doc("最終的な支払金額")
    totalPayable: Money;
  }

  @doc("サロンで発生する支払いを管理する決済記録")
  model Payment {
    @doc("決済レコード ID")
    id: PaymentId;

    @doc("決済が紐づくサロン ID")
    salonId: SalonId;

    @doc("支払いを行う顧客 ID")
    customerId: CustomerId;

    @doc("関連する予約 ID")
    bookingId?: BookingId;

    @doc("関連する施術記録 ID")
    treatmentRecordId?: TreatmentRecordId;

    @doc("使用した支払い方法")
    method: PaymentMethodType;

    @doc("現在の支払い状態の詳細")
    status: PaymentStatus;

    @doc("請求金額の内訳情報")
    amounts: PaymentAmounts;

    @doc("使用したポイント数")
    pointsUsed?: int32;

    @doc("予約時に適用した預り金額")
    depositApplied?: Money;

    @doc("未収残高がある場合の金額")
    outstandingAmount?: Money;

    @doc("外部決済サービスの参照番号")
    externalReference?: string;

    @doc("発行したレシート番号")
    receiptNumber?: string;

    @doc("状態変遷の履歴一覧")
    history: PaymentHistory[];

    @doc("関連する返金記録の一覧")
    refunds?: Refund[];

    @doc("外部サービス連携向けのメタデータ")
    metadata?: Record<unknown>;

    @doc("スタッフ用の備考メモ")
    notes?: string;

    ...AuditInfo;
  }

  @doc("決済状態の変更履歴")
  model PaymentHistory {
    @doc("履歴イベント ID")
    eventId: string;

    @doc("対象となる決済 ID")
    paymentId: PaymentId;

    @doc("変更後の支払い状態")
    status: PaymentStatus;

    @doc("変更が発生した日時")
    occurredAt: utcDateTime;

    @doc("操作主体の区分")
    actor?: "system" | "staff" | "customer";

    @doc("操作主体の ID")
    actorId?: string;

    @doc("変更内容の補足メモ")
    note?: string;

    @doc("履歴に紐づく追加メタデータ")
    metadata?: Record<unknown>;
  }

  @doc("返金処理の記録")
  model Refund {
    @doc("返金 ID")
    id: RefundId;

    @doc("元となる決済 ID")
    paymentId: PaymentId;

    @doc("返金金額")
    amount: Money;

    @doc("返金理由")
    reason: string;

    @doc("返金処理日時")
    refundedAt: utcDateTime;

    @doc("返金処理の進捗状態")
    status: "requested" | "processing" | "completed" | "failed";

    @doc("返金処理を担当したスタッフ ID")
    processedBy?: StaffId;

    @doc("返金に使用した支払い方法")
    method?: PaymentMethodType;

    @doc("外部返金参照コード")
    referenceCode?: string;

    @doc("返金処理に関する備考")
    notes?: string;
  }

  @doc("支払金額の内訳プレビュー")
  model PaymentBreakdown {
    @doc("商品の税抜小計")
    subtotal: Money;

    @doc("適用される税額")
    tax: Money;

    @doc("割引金額")
    discount: Money;

    @doc("ポイント適用による割引額")
    pointsDiscount?: Money;

    @doc("支払総額")
    total: Money;
  }

  @doc("決済前の支払見積情報")
  model PaymentPreview {
    @doc("見積対象のサロン ID")
    salonId: SalonId;

    @doc("見積対象の顧客 ID")
    customerId?: CustomerId;

    @doc("関連する予約 ID")
    bookingId?: BookingId;

    @doc("金額内訳のプレビュー")
    breakdown: PaymentBreakdown;

    @doc("推奨する支払い方法の一覧")
    recommendedMethods: PaymentMethodType[];

    @doc("顧客・スタッフ向けの備考")
    notes?: string;
  }

  @doc("期間内の売上実績を集計したレポート")
  model SalesReport {
    @doc("対象サロン ID")
    salonId: SalonId;

    @doc("集計期間の開始日時")
    periodStart: utcDateTime;

    @doc("集計期間の終了日時")
    periodEnd: utcDateTime;

    @doc("総売上額")
    totalSales: Money;

    @doc("累計税額")
    totalTax: Money;

    @doc("累計割引額")
    totalDiscounts: Money;

    @doc("累計返金額")
    totalRefunds: Money;

    @doc("返金考慮後の純売上額")
    netSales: Money;

    @doc("取引件数")
    transactionCount: int32;

    @doc("平均取引単価")
    averageTransactionValue: Money;

    @doc("支払い方法別の売上内訳")
    salesByMethod: SalesByMethod[];

    @doc("サービスカテゴリ別の売上内訳")
    salesByCategory: SalesByCategory[];

    @doc("売上貢献度の高いスタッフ情報")
    topStaff: StaffPerformance[];
  }

  @doc("支払い方法別の売上集計行")
  model SalesByMethod {
    @doc("支払い方法区分")
    method: PaymentMethodType;

    @doc("売上金額")
    amount: Money;

    @doc("取引件数")
    count: int32;

    @doc("総売上に対する構成比率（%）")
    percentage: float32;
  }

  @doc("サービスカテゴリ別の売上集計行")
  model SalesByCategory {
    @doc("サービスカテゴリ区分")
    category: ServiceCategoryType;

    @doc("売上金額")
    amount: Money;

    @doc("提供件数")
    count: int32;

    @doc("総売上に対する構成比率（%）")
    percentage: float32;
  }

  @doc("スタッフ別の売上パフォーマンス指標")
  model StaffPerformance {
    @doc("スタッフ ID")
    staffId: StaffId;

    @doc("スタッフ名")
    staffName: string;

    @doc("担当した売上金額")
    totalSales: Money;

    @doc("提供したサービス件数")
    serviceCount: int32;

    @doc("平均サービス単価")
    averageServiceValue: Money;

    @doc("顧客満足度評価（任意）")
    customerSatisfaction?: float32;
  }

  @doc("顧客ポイントの付与・利用履歴")
  model PointTransaction {
    @doc("ポイント取引 ID")
    id: PointTransactionId;

    @doc("対象顧客 ID")
    customerId: CustomerId;

    @doc("取引種別（獲得・利用など）")
    type: "earn" | "use" | "expire" | "adjust";

    @doc("ポイント変動量（獲得は正、利用は負）")
    points: int32;

    @doc("取引後のポイント残高")
    balanceAfter: int32;

    @doc("関連する決済 ID")
    paymentId?: PaymentId;

    @doc("関連する予約 ID")
    bookingId?: BookingId;

    @doc("取引内容の説明")
    description: string;

    @doc("獲得ポイントの有効期限")
    expiresAt?: utcDateTime;

    @doc("取引発生日時")
    transactedAt: utcDateTime;

    ...AuditInfo;
  }

  @doc("決済登録時に利用する入力モデル")
  model PaymentCreateInput {
    @doc("決済を登録するサロン ID")
    salonId: SalonId;

    @doc("支払う顧客 ID")
    customerId: CustomerId;

    @doc("紐づく予約 ID")
    bookingId?: BookingId;

    @doc("紐づく施術記録 ID")
    treatmentRecordId?: TreatmentRecordId;

    @doc("利用する支払い方法")
    method: PaymentMethodType;

    @doc("請求金額の内訳")
    amounts: PaymentAmounts;

    @doc("使用するポイント数")
    pointsUsed?: int32;

    @doc("適用する預り金額")
    depositApplied?: Money;

    @doc("外部決済参照番号")
    externalReference?: string;

    @doc("備考メモ")
    notes?: string;

    @doc("外部システム連携向けメタデータ")
    metadata?: Record<unknown>;
  }

  @doc("決済情報の更新入力モデル")
  model PaymentUpdateInput {
    @doc("変更後の支払い方法")
    method?: PaymentMethodType;

    @doc("変更後の支払い状態")
    status?: PaymentStatus;

    @doc("再計算した未収残高")
    outstandingAmount?: Money;

    @doc("更新後の預り金額（null 指定で解除）")
    depositApplied?: Money | null;

    @doc("更新後の外部参照番号（null 指定で解除）")
    externalReference?: string | null;

    @doc("更新後のレシート番号（null 指定で解除）")
    receiptNumber?: string | null;

    @doc("更新後の備考（null 指定で解除）")
    notes?: string | null;

    @doc("更新後のメタデータ（null 指定で解除）")
    metadata?: Record<unknown> | null;
  }

  @doc("返金処理を開始するための入力モデル")
  model RefundInput {
    @doc("対象となる決済 ID")
    paymentId: PaymentId;

    @doc("返金する金額")
    amount: Money;

    @doc("返金理由の説明")
    reason: string;

    @doc("外部返金参照コード")
    referenceCode?: string;

    @doc("返金を担当するスタッフ ID")
    processedBy?: StaffId;

    @doc("返金に関する備考")
    notes?: string;
  }

  @doc("ポイント取引を登録する入力モデル")
  model PointTransactionCreateInput {
    @doc("対象顧客 ID")
    customerId: CustomerId;

    @doc("ポイント取引種別")
    type: "earn" | "use" | "expire" | "adjust";

    @doc("ポイント変動量")
    points: int32;

    @doc("関連する決済 ID")
    paymentId?: PaymentId;

    @doc("関連する予約 ID")
    bookingId?: BookingId;

    @doc("取引内容の説明")
    description: string;

    @doc("ポイントの有効期限")
    expiresAt?: utcDateTime;
  }

  @doc("売上レポートの集計条件")
  model SalesReportQuery {
    @doc("集計対象のサロン ID")
    @query
    salonId: SalonId;

    ...DateRangeFilter;

    @doc("集計粒度（日/週/月）")
    @query
    groupBy?: "day" | "week" | "month";

    @doc("返金取引を集計に含めるかどうか")
    @query
    includeRefunds?: boolean = true;
  }
}
