import "@typespec/http";
import "./common.tsp";

using TypeSpec.Http;

namespace BeautySalon.Models {
  @doc("Inventory item")
  model InventoryItem {
    id: InventoryId;
    salonId: SalonId;

    @doc("Product code/SKU")
    productCode: string;

    @doc("Product name")
    productName: string;

    @doc("Product description")
    description?: string;

    @doc("Category")
    category: string;

    @doc("Brand")
    brand?: string;

    @doc("Supplier information")
    supplier?: string;

    @doc("Current stock quantity")
    currentStock: float32;

    @doc("Minimum stock level")
    minimumStock: float32;

    @doc("Maximum stock level")
    maximumStock?: float32;

    @doc("Unit of measurement")
    unit: string;

    @doc("Unit cost")
    unitCost: float32;

    @doc("Selling price (if sold to customers)")
    sellingPrice?: float32;

    @doc("Stock status")
    status: InventoryStatusType;

    @doc("Location in salon")
    location?: string;

    @doc("Expiration date")
    expirationDate?: utcDateTime;

    @doc("Last restocked date")
    lastRestocked?: utcDateTime;

    @doc("Notes")
    notes?: string;

    ...AuditInfo;
  }

  model InventoryTransaction {
    id: string;
    itemId: InventoryId;
    salonId: SalonId;
    type: "in" | "out" | "adjustment" | "transfer";
    quantity: float32;
    reason: string;
    performedBy: StaffId;
    occurredAt: utcDateTime;
    referenceId?: string;
    notes?: string;
    metadata?: Record<unknown>;
  }

  @doc("Stock movement record")
  model StockMovement {
    ...InventoryTransaction;
    inventoryId: InventoryId;

    @doc("Stock level after movement")
    stockAfter: float32;

    @doc("Reason for movement")
    orderId?: OrderId;

    @doc("Related treatment")
    treatmentRecordId?: TreatmentRecordId;

    @doc("Movement timestamp")
    movedAt: utcDateTime;

    ...AuditInfo;
  }

  @doc("Purchase order")
  model PurchaseOrder {
    id: OrderId;
    salonId: SalonId;

    @doc("Order number")
    orderNumber: string;

    @doc("Supplier name")
    supplier: string;

    @doc("Order status")
    status: OrderStatusType;

    @doc("Order items")
    items: OrderItem[];

    @doc("Subtotal amount")
    subtotal: float32;

    @doc("Tax amount")
    taxAmount: float32;

    @doc("Shipping cost")
    shippingCost?: float32;

    @doc("Total amount")
    totalAmount: float32;

    @doc("Order date")
    orderDate: utcDateTime;

    @doc("Expected delivery date")
    expectedDelivery?: utcDateTime;

    @doc("Actual delivery date")
    actualDelivery?: utcDateTime;

    @doc("Delivery notes")
    deliveryNotes?: string;

    @doc("Payment terms")
    paymentTerms?: string;

    @doc("Order notes")
    notes?: string;

    @doc("Approved by")
    approvedBy?: StaffId;

    @doc("Approved date")
    approvedAt?: utcDateTime;

    ...AuditInfo;
  }

  @doc("Order item detail")
  model OrderItem {
    inventoryId: InventoryId;
    productCode: string;
    productName: string;
    quantity: float32;
    unit: string;
    unitPrice: float32;
    totalPrice: float32;
    notes?: string;
  }

  model StockAlert {
    itemId: InventoryId;
    threshold: float32;
    currentStock: float32;
    triggeredAt: utcDateTime;
  }

  @doc("Inventory alert")
  model InventoryAlert {
    ...StockAlert;
    inventoryId: InventoryId;
    alert: "low_stock" | "expiring" | "expired" | "overstock";
    message: string;
    severity: "info" | "warning" | "critical";
    acknowledged?: boolean;
    acknowledgedBy?: StaffId;
    acknowledgedAt?: utcDateTime;
  }

  // Input/Output models
  model InventoryItemCreateInput {
    salonId: SalonId;
    productCode: string;
    productName: string;
    description?: string;
    category: string;
    brand?: string;
    supplier?: string;
    currentStock: float32;
    minimumStock: float32;
    maximumStock?: float32;
    unit: string;
    unitCost: float32;
    sellingPrice?: float32;
    location?: string;
    expirationDate?: utcDateTime;
    notes?: string;
  }

  model InventoryItemUpdateInput {
    productName?: string;
    description?: string;
    category?: string;
    brand?: string;
    supplier?: string;
    minimumStock?: float32;
    maximumStock?: float32;
    unitCost?: float32;
    sellingPrice?: float32;
    location?: string;
    expirationDate?: utcDateTime;
    status?: InventoryStatusType;
    notes?: string;
  }

  model StockMovementInput {
    inventoryId: InventoryId;
    type: "in" | "out" | "adjustment" | "transfer";
    quantity: float32;
    reason: string;
    orderId?: OrderId;
    treatmentRecordId?: TreatmentRecordId;
    notes?: string;
  }

  model PurchaseOrderCreateInput {
    supplier: string;
    items: OrderItem[];
    taxAmount: float32;
    shippingCost?: float32;
    expectedDelivery?: utcDateTime;
    paymentTerms?: string;
    notes?: string;
  }

  model PurchaseOrderUpdateInput {
    status?: OrderStatusType;
    expectedDelivery?: utcDateTime;
    actualDelivery?: utcDateTime;
    deliveryNotes?: string;
    notes?: string;
  }

  /**
   * Inventory search request
   */
  model SearchInventoryRequest {
    @query salonId: SalonId;
    @query category?: string;
    @query status?: InventoryStatusType;
    @query lowStock?: boolean;
    @query expiringSoon?: boolean;
    ...SearchParams;
  }
}
