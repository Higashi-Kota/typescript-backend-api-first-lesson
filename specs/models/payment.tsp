import "@typespec/http";
import "./common.tsp";

using TypeSpec.Http;

namespace BeautySalon.Models {
  enum PaymentMethodType {
    cash,
    credit_card,
    debit_card,
    e_money,
    qr_payment,
    bank_transfer,
    point,
  }

  enum PaymentStatusCodeType {
    pending,
    processing,
    completed,
    failed,
    refunded,
    partial_refund,
  }

  union PaymentStatus {
    pending: PendingPaymentStatus,
    processing: ProcessingPaymentStatus,
    completed: CompletedPaymentStatus,
    failed: FailedPaymentStatus,
    refunded: RefundedPaymentStatus,
    partial_refund: PartialRefundPaymentStatus,
  }

  model PendingPaymentStatus {
    type: "pending";
    createdAt: utcDateTime;
  }

  model ProcessingPaymentStatus {
    type: "processing";
    startedAt: utcDateTime;
    processorId?: StaffId;
  }

  model CompletedPaymentStatus {
    type: "completed";
    completedAt: utcDateTime;
    paidAmount: Money;
    receiptNumber?: string;
  }

  model FailedPaymentStatus {
    type: "failed";
    failedAt: utcDateTime;
    reason: string;
    retryable?: boolean = false;
  }

  model RefundedPaymentStatus {
    type: "refunded";
    refundedAt: utcDateTime;
    refundAmount: Money;
    refundId?: RefundId;
  }

  model PartialRefundPaymentStatus {
    type: "partial_refund";
    refundedAt: utcDateTime;
    refundAmount: Money;
    remainingAmount: Money;
    refundId: RefundId;
  }

  model PaymentAmounts {
    billed: Money;
    tax?: Money;
    discount?: Money;
    tip?: Money;
    totalPayable: Money;
  }

  @doc("Payment record for services")
  model Payment {
    id: PaymentId;
    salonId: SalonId;
    customerId: CustomerId;
    bookingId?: BookingId;
    treatmentRecordId?: TreatmentRecordId;
    method: PaymentMethodType;
    status: PaymentStatus;
    amounts: PaymentAmounts;
    pointsUsed?: int32;
    depositApplied?: Money;
    outstandingAmount?: Money;
    externalReference?: string;
    receiptNumber?: string;
    history: PaymentHistory[];
    refunds?: Refund[];
    metadata?: Record<unknown>;
    notes?: string;
    ...AuditInfo;
  }

  model PaymentHistory {
    eventId: string;
    paymentId: PaymentId;
    status: PaymentStatus;
    occurredAt: utcDateTime;
    actor?: "system" | "staff" | "customer";
    actorId?: string;
    note?: string;
    metadata?: Record<unknown>;
  }

  model Refund {
    id: RefundId;
    paymentId: PaymentId;
    amount: Money;
    reason: string;
    refundedAt: utcDateTime;
    status: "requested" | "processing" | "completed" | "failed";
    processedBy?: StaffId;
    method?: PaymentMethodType;
    referenceCode?: string;
    notes?: string;
  }

  model PaymentBreakdown {
    subtotal: Money;
    tax: Money;
    discount: Money;
    pointsDiscount?: Money;
    total: Money;
  }

  model PaymentPreview {
    salonId: SalonId;
    customerId?: CustomerId;
    bookingId?: BookingId;
    breakdown: PaymentBreakdown;
    recommendedMethods: PaymentMethodType[];
    notes?: string;
  }

  @doc("Sales report summary")
  model SalesReport {
    salonId: SalonId;
    periodStart: utcDateTime;
    periodEnd: utcDateTime;
    totalSales: Money;
    totalTax: Money;
    totalDiscounts: Money;
    totalRefunds: Money;
    netSales: Money;
    transactionCount: int32;
    averageTransactionValue: Money;
    salesByMethod: SalesByMethod[];
    salesByCategory: SalesByCategory[];
    topStaff: StaffPerformance[];
  }

  @doc("Sales breakdown by payment method")
  model SalesByMethod {
    method: PaymentMethodType;
    amount: Money;
    count: int32;
    percentage: float32;
  }

  @doc("Sales breakdown by category")
  model SalesByCategory {
    category: ServiceCategoryType;
    amount: Money;
    count: int32;
    percentage: float32;
  }

  @doc("Staff performance metrics")
  model StaffPerformance {
    staffId: StaffId;
    staffName: string;
    totalSales: Money;
    serviceCount: int32;
    averageServiceValue: Money;
    customerSatisfaction?: float32;
  }

  @doc("Point transaction record")
  model PointTransaction {
    id: PointTransactionId;
    customerId: CustomerId;

    @doc("Transaction type: earn or use")
    type: "earn" | "use" | "expire" | "adjust";

    @doc("Points amount (positive for earn, negative for use)")
    points: int32;

    @doc("Balance after transaction")
    balanceAfter: int32;

    @doc("Related payment or booking")
    paymentId?: PaymentId;

    bookingId?: BookingId;

    @doc("Transaction description")
    description: string;

    @doc("Expiration date for earned points")
    expiresAt?: utcDateTime;

    @doc("Transaction timestamp")
    transactedAt: utcDateTime;

    ...AuditInfo;
  }

  // Input/Output models
  model PaymentCreateInput {
    salonId: SalonId;
    customerId: CustomerId;
    bookingId?: BookingId;
    treatmentRecordId?: TreatmentRecordId;
    method: PaymentMethodType;
    amounts: PaymentAmounts;
    pointsUsed?: int32;
    depositApplied?: Money;
    externalReference?: string;
    notes?: string;
    metadata?: Record<unknown>;
  }

  model PaymentUpdateInput {
    method?: PaymentMethodType;
    status?: PaymentStatus;
    outstandingAmount?: Money;
    depositApplied?: Money | null;
    externalReference?: string | null;
    receiptNumber?: string | null;
    notes?: string | null;
    metadata?: Record<unknown> | null;
  }

  model RefundInput {
    paymentId: PaymentId;
    amount: Money;
    reason: string;
    referenceCode?: string;
    processedBy?: StaffId;
    notes?: string;
  }

  model PointTransactionCreateInput {
    customerId: CustomerId;
    type: "earn" | "use" | "expire" | "adjust";
    points: int32;
    paymentId?: PaymentId;
    bookingId?: BookingId;
    description: string;
    expiresAt?: utcDateTime;
  }

  model SalesReportQuery {
    salonId: SalonId;
    ...DateRangeFilter;
    @query groupBy?: "day" | "week" | "month";
    @query includeRefunds?: boolean = true;
  }
}
