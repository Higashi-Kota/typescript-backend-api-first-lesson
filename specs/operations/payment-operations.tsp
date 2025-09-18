import "@typespec/http";
import "@typespec/rest";
import "../models/common.tsp";
import "../models/payment.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using BeautySalon.Models;

namespace BeautySalon.Operations {
  @route("/payments")
  @tag("Payments")
  interface PaymentOperations {
    @doc("List payments with filters")
    @get
    listPayments(
      @query salonId?: SalonId,
      @query customerId?: CustomerId,
      @query status?: PaymentStatusCode,
      @query method?: PaymentMethod,
      ...DateRangeFilter,
      ...PaginationParams,
    ): Result<PaginationResponse<Payment>>;

    @doc("Get payment by ID")
    @get
    @route("/{id}")
    getPayment(@path id: PaymentId): Result<Payment>;

    @doc("Create new payment")
    @post
    createPayment(@body payment: PaymentCreateInput): Result<Payment>;

    @doc("Update payment status")
    @patch
    @route("/{id}")
    updatePayment(
      @path id: PaymentId,
      @body updates: PaymentUpdateInput,
    ): Result<Payment>;

    @doc("Process payment")
    @post
    @route("/{id}/process")
    processPayment(@path id: PaymentId): Result<Payment>;

    @doc("Cancel payment")
    @post
    @route("/{id}/cancel")
    cancelPayment(@path id: PaymentId, @body reason: { reason: string }): Result<Payment>;

    @doc("Process refund")
    @post
    @route("/{id}/refund")
    processRefund(@path id: PaymentId, @body refund: RefundInput): Result<Payment>;

    @doc("Get payment receipt")
    @get
    @route("/{id}/receipt")
    getReceipt(@path id: PaymentId): Result<{
      receiptNumber: string,
      payment: Payment,
      items: Record<unknown>[],
      issuedAt: utcDateTime,
    }>;

    @doc("Get customer payment history")
    @get
    @route("/customer/{customerId}")
    getCustomerPayments(
      @path customerId: CustomerId,
      ...DateRangeFilter,
      ...PaginationParams,
    ): Result<PaginationResponse<Payment>>;

    @doc("Calculate payment summary")
    @post
    @route("/calculate")
    calculatePayment(
      @body request: {
        services: ServiceId[],
        discountCode?: string,
        pointsToUse?: int32,
        customerId?: CustomerId,
        bookingId?: BookingId,
      },
    ): Result<PaymentPreview>;
  }

  @route("/sales-reports")
  @tag("Sales Reports")
  interface SalesReportOperations {
    @doc("Get sales report for a period")
    @get
    getSalesReport(...SalesReportQuery): Result<SalesReport>;

    @doc("Get daily sales summary")
    @get
    @route("/daily")
    getDailySales(
      @query salonId: SalonId,
      @query date: plainDate,
    ): Result<{
      date: plainDate,
      sales: Money,
      transactions: int32,
      refunds: Money,
      net: Money,
    }>;

    @doc("Get sales by staff")
    @get
    @route("/by-staff")
    getSalesByStaff(
      @query salonId: SalonId,
      ...DateRangeFilter,
    ): Result<StaffPerformance[]>;

    @doc("Get sales by service category")
    @get
    @route("/by-category")
    getSalesByCategory(
      @query salonId: SalonId,
      ...DateRangeFilter,
    ): Result<SalesByCategory[]>;

    @doc("Get sales trends")
    @get
    @route("/trends")
    getSalesTrends(
      @query salonId: SalonId,
      @query period: "daily" | "weekly" | "monthly",
      ...DateRangeFilter,
    ): Result<{
      labels: string[],
      sales: Money[],
      transactions: int32[],
      average: Money[],
    }>;

    @doc("Export sales report")
    @post
    @route("/export")
    exportSalesReport(@body request: {
      salonId: SalonId,
      startDate: utcDateTime,
      endDate: utcDateTime,
      format: "csv" | "excel" | "pdf",
    }): Result<{ downloadUrl: string }>;
  }

  @route("/points")
  @tag("Points")
  interface PointOperations {
    @doc("Get customer point balance")
    @get
    @route("/customer/{customerId}/balance")
    getPointBalance(@path customerId: CustomerId): Result<PointInfo>;

    @doc("Get point transaction history")
    @get
    @route("/customer/{customerId}/transactions")
    getPointTransactions(
      @path customerId: CustomerId,
      ...DateRangeFilter,
      ...PaginationParams,
    ): Result<PaginationResponse<PointTransaction>>;

    @doc("Add points to customer")
    @post
    @route("/earn")
    earnPoints(@body transaction: PointTransactionCreateInput): Result<PointTransaction>;

    @doc("Use customer points")
    @post
    @route("/use")
    usePoints(@body transaction: PointTransactionCreateInput): Result<PointTransaction>;

    @doc("Adjust customer points")
    @post
    @route("/adjust")
    adjustPoints(@body transaction: PointTransactionCreateInput): Result<PointTransaction>;

    @doc("Get expiring points")
    @get
    @route("/customer/{customerId}/expiring")
    getExpiringPoints(
      @path customerId: CustomerId,
      @query days?: int32 = 30,
    ): Result<{
      customerId: CustomerId,
      expiringPoints: int32,
      expirationDate: utcDateTime,
      transactions: PointTransaction[],
    }>;

    @doc("Process expired points")
    @post
    @route("/expire")
    processExpiredPoints(@body request: {
      customerId?: CustomerId,
      processBefore?: utcDateTime,
    }): Result<{
      processedCount: int32,
      totalPoints: int32,
    }>;
  }
}
