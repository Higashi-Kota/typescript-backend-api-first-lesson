import "@typespec/http";
import "@typespec/rest";
import "../models/_shared/common.tsp";
import "../models/inventory.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using BeautySalon.Models;

namespace BeautySalon.Operations {
  @route("/inventory")
  @tag("Inventory")
  interface InventoryOperations {
    @doc("List inventory items with filters")
    @get
    listInventoryItems(
      ...InventorySearchRequest,
    ): Result<PaginationResponse<InventoryItem>>;

    @doc("Get inventory item by ID")
    @get
    @route("/{id}")
    getInventoryItem(@path id: InventoryId): Result<InventoryItem>;

    @doc("Create new inventory item")
    @post
    createInventoryItem(
      @body item: InventoryItemCreateRequest,
    ): Result<InventoryItem>;

    @doc("Update inventory item")
    @patch(#{ implicitOptionality: true })
    @route("/{id}")
    updateInventoryItem(
      @path id: InventoryId,
      @body updates: InventoryItemUpdateRequest,
    ): Result<InventoryItem>;

    @doc("Delete inventory item")
    @delete
    @route("/{id}")
    deleteInventoryItem(@path id: InventoryId): Result<{}>;

    @doc("Get low stock items")
    @get
    @route("/low-stock")
    getLowStockItems(
      @query salonId: SalonId,
      @query threshold?: float32,
    ): Result<InventoryItem[]>;

    @doc("Get expiring items")
    @get
    @route("/expiring")
    getExpiringItems(
      @query salonId: SalonId,
      @query days?: int32 = 30,
    ): Result<InventoryItem[]>;

    @doc("Record stock movement")
    @post
    @route("/movement")
    recordStockMovement(
      @body movement: StockMovementCreateRequest,
    ): Result<StockMovement>;

    @doc("Get stock movement history")
    @get
    @route("/{id}/movements")
    getStockMovements(
      @path id: InventoryId,
      ...DateRangeFilter,
      ...PaginationParams,
    ): Result<PaginationResponse<StockMovement>>;

    @doc("Perform stock count")
    @post
    @route("/stock-count")
    performStockCount(
      @body request: {
        salonId: SalonId;
        items: Array<{
          inventoryId: InventoryId;
          countedQuantity: float32;
        }>;
        notes?: string;
      },
    ): Result<{
      adjustments: StockMovement[];
      discrepancies: Array<{
        inventoryId: InventoryId;
        expected: float32;
        counted: float32;
        difference: float32;
      }>;
    }>;

    @doc("Get inventory value report")
    @get
    @route("/value-report")
    getInventoryValueReport(
      @query salonId: SalonId,
      @query category?: string,
    ): Result<{
      totalValue: float32;
      totalItems: int32;
      categories: Array<{
        category: string;
        value: float32;
        itemCount: int32;
      }>;
    }>;
  }

  @route("/purchase-orders")
  @tag("Purchase Orders")
  interface PurchaseOrderOperations {
    @doc("List purchase orders")
    @get
    listPurchaseOrders(
      @query salonId: SalonId,
      @query status?: OrderStatusType,
      @query supplier?: string,
      ...DateRangeFilter,
      ...PaginationParams,
    ): Result<PaginationResponse<PurchaseOrder>>;

    @doc("Get purchase order by ID")
    @get
    @route("/{id}")
    getPurchaseOrder(@path id: OrderId): Result<PurchaseOrder>;

    @doc("Create purchase order")
    @post
    createPurchaseOrder(
      @body order: PurchaseOrderCreateRequest,
    ): Result<PurchaseOrder>;

    @doc("Update purchase order")
    @patch(#{ implicitOptionality: true })
    @route("/{id}")
    updatePurchaseOrder(
      @path id: OrderId,
      @body updates: PurchaseOrderUpdateRequest,
    ): Result<PurchaseOrder>;

    @doc("Approve purchase order")
    @post
    @route("/{id}/approve")
    approvePurchaseOrder(
      @path id: OrderId,
      @body approval: {
        approvedBy: StaffId;
        notes?: string;
      },
    ): Result<PurchaseOrder>;

    @doc("Cancel purchase order")
    @post
    @route("/{id}/cancel")
    cancelPurchaseOrder(
      @path id: OrderId,
      @body cancellation: {
        reason: string;
      },
    ): Result<PurchaseOrder>;

    @doc("Receive purchase order")
    @post
    @route("/{id}/receive")
    receivePurchaseOrder(
      @path id: OrderId,
      @body receipt: {
        receivedItems: Array<{
          inventoryId: InventoryId;
          receivedQuantity: float32;
          notes?: string;
        }>;
        deliveryNotes?: string;
      },
    ): Result<PurchaseOrder>;

    @doc("Generate reorder suggestions")
    @get
    @route("/reorder-suggestions")
    getReorderSuggestions(@query salonId: SalonId): Result<Array<{
      inventoryId: InventoryId;
      productName: string;
      currentStock: float32;
      minimumStock: float32;
      suggestedQuantity: float32;
      supplier?: string;
      lastOrderDate?: utcDateTime;
    }>>;
  }

  @route("/inventory-alerts")
  @tag("Inventory Alerts")
  interface InventoryAlertOperations {
    @doc("Get active inventory alerts")
    @get
    getActiveAlerts(
      @query salonId: SalonId,
      @query type?: "low_stock" | "expiring" | "expired" | "overstock",
      @query severity?: "info" | "warning" | "critical",
    ): Result<InventoryAlert[]>;

    @doc("Acknowledge alert")
    @post
    @route("/{inventoryId}/acknowledge")
    acknowledgeAlert(
      @path inventoryId: InventoryId,
      @body acknowledgment: {
        acknowledgedBy: StaffId;
        notes?: string;
      },
    ): Result<InventoryAlert>;

    @doc("Get alert summary")
    @get
    @route("/summary")
    getAlertSummary(@query salonId: SalonId): Result<{
      totalAlerts: int32;
      criticalAlerts: int32;
      warningAlerts: int32;
      infoAlerts: int32;
      unacknowledged: int32;
    }>;
  }
}
