import "@typespec/http";
import "./common.tsp";

using TypeSpec.Http;

namespace BeautySalon.Models {
  @doc("サロンで管理する在庫アイテムの基本情報")
  model InventoryItem {
    @doc("在庫 ID")
    id: InventoryId;

    @doc("在庫を管理するサロン ID")
    salonId: SalonId;

    @doc("商品コード・SKU")
    productCode: string;

    @doc("商品名")
    productName: string;

    @doc("商品説明文")
    description?: string;

    @doc("分類カテゴリ")
    category: string;

    @doc("ブランド名")
    brand?: string;

    @doc("仕入先情報")
    supplier?: string;

    @doc("現在の在庫数量")
    currentStock: float32;

    @doc("最低在庫数（警告閾値）")
    minimumStock: float32;

    @doc("最大在庫数（上限管理用）")
    maximumStock?: float32;

    @doc("数量の単位")
    unit: string;

    @doc("仕入単価")
    unitCost: float32;

    @doc("顧客販売価格")
    sellingPrice?: float32;

    @doc("在庫状態区分")
    status: InventoryStatusType;

    @doc("サロン内の保管場所")
    location?: string;

    @doc("賞味・使用期限")
    expirationDate?: utcDateTime;

    @doc("直近の入庫日時")
    lastRestocked?: utcDateTime;

    @doc("備考メモ")
    notes?: string;

    ...AuditInfo;
  }

  @doc("在庫の入出庫トランザクション")
  model InventoryTransaction {
    @doc("トランザクション ID")
    id: string;

    @doc("対象在庫アイテム ID")
    itemId: InventoryId;

    @doc("処理を行うサロン ID")
    salonId: SalonId;

    @doc("在庫操作区分（入庫/出庫/調整/移動）")
    type: "in" | "out" | "adjustment" | "transfer";

    @doc("操作した数量")
    quantity: float32;

    @doc("操作理由")
    reason: string;

    @doc("操作を担当したスタッフ ID")
    performedBy: StaffId;

    @doc("操作日時")
    occurredAt: utcDateTime;

    @doc("関連する外部参照 ID")
    referenceId?: string;

    @doc("備考メモ")
    notes?: string;

    @doc("追加のメタデータ")
    metadata?: Record<unknown>;
  }

  @doc("在庫の移動履歴")
  model StockMovement {
    ...InventoryTransaction;

    @doc("対象在庫アイテム ID")
    inventoryId: InventoryId;

    @doc("移動後の在庫数量")
    stockAfter: float32;

    @doc("紐づく発注 ID")
    orderId?: OrderId;

    @doc("紐づく施術記録 ID")
    treatmentRecordId?: TreatmentRecordId;

    @doc("移動が確定した日時")
    movedAt: utcDateTime;

    ...AuditInfo;
  }

  @doc("仕入れ発注の基本情報")
  model PurchaseOrder {
    @doc("発注 ID")
    id: OrderId;

    @doc("発注を行うサロン ID")
    salonId: SalonId;

    @doc("発注番号")
    orderNumber: string;

    @doc("仕入先名")
    supplier: string;

    @doc("発注ステータス区分")
    status: OrderStatusType;

    @doc("発注明細の一覧")
    items: OrderItem[];

    @doc("税抜小計金額")
    subtotal: float32;

    @doc("税額")
    taxAmount: float32;

    @doc("送料")
    shippingCost?: float32;

    @doc("発注合計金額")
    totalAmount: float32;

    @doc("発注日")
    orderDate: utcDateTime;

    @doc("予定納期")
    expectedDelivery?: utcDateTime;

    @doc("実際の納品日")
    actualDelivery?: utcDateTime;

    @doc("納品に関するメモ")
    deliveryNotes?: string;

    @doc("支払条件")
    paymentTerms?: string;

    @doc("その他備考")
    notes?: string;

    @doc("発注承認を行ったスタッフ ID")
    approvedBy?: StaffId;

    @doc("承認日時")
    approvedAt?: utcDateTime;

    ...AuditInfo;
  }

  @doc("発注明細の詳細情報")
  model OrderItem {
    @doc("紐づく在庫 ID")
    inventoryId: InventoryId;

    @doc("商品コード")
    productCode: string;

    @doc("商品名")
    productName: string;

    @doc("発注数量")
    quantity: float32;

    @doc("数量単位")
    unit: string;

    @doc("単価")
    unitPrice: float32;

    @doc("明細ごとの金額")
    totalPrice: float32;

    @doc("備考メモ")
    notes?: string;
  }

  @doc("在庫残量の閾値警告")
  model StockAlert {
    @doc("対象在庫 ID")
    itemId: InventoryId;

    @doc("設定した閾値")
    threshold: float32;

    @doc("警告発生時の在庫数")
    currentStock: float32;

    @doc("警告が発生した日時")
    triggeredAt: utcDateTime;
  }

  @doc("在庫に関するアラート情報")
  model InventoryAlert {
    ...StockAlert;

    @doc("関連する在庫 ID")
    inventoryId: InventoryId;

    @doc("アラート種別")
    alert: "low_stock" | "expiring" | "expired" | "overstock";

    @doc("通知メッセージ")
    message: string;

    @doc("重要度レベル")
    severity: "info" | "warning" | "critical";

    @doc("確認済みかどうか")
    acknowledged?: boolean;

    @doc("確認したスタッフ ID")
    acknowledgedBy?: StaffId;

    @doc("確認日時")
    acknowledgedAt?: utcDateTime;
  }

  @doc("在庫アイテムを新規登録する入力モデル")
  model InventoryItemCreateInput {
    @doc("在庫を追加するサロン ID")
    salonId: SalonId;

    @doc("商品コード・SKU")
    productCode: string;

    @doc("商品名")
    productName: string;

    @doc("商品説明文")
    description?: string;

    @doc("分類カテゴリ")
    category: string;

    @doc("ブランド名")
    brand?: string;

    @doc("仕入先情報")
    supplier?: string;

    @doc("登録時点の在庫数量")
    currentStock: float32;

    @doc("最低在庫数")
    minimumStock: float32;

    @doc("最大在庫数")
    maximumStock?: float32;

    @doc("数量単位")
    unit: string;

    @doc("仕入単価")
    unitCost: float32;

    @doc("顧客販売価格")
    sellingPrice?: float32;

    @doc("保管場所")
    location?: string;

    @doc("賞味・使用期限")
    expirationDate?: utcDateTime;

    @doc("備考メモ")
    notes?: string;
  }

  @doc("在庫アイテムの情報更新入力モデル")
  model InventoryItemUpdateInput {
    @doc("更新後の商品名")
    productName?: string;

    @doc("更新後の商品説明")
    description?: string;

    @doc("更新後のカテゴリ")
    category?: string;

    @doc("更新後のブランド名")
    brand?: string;

    @doc("更新後の仕入先情報")
    supplier?: string;

    @doc("更新後の最低在庫数")
    minimumStock?: float32;

    @doc("更新後の最大在庫数")
    maximumStock?: float32;

    @doc("更新後の仕入単価")
    unitCost?: float32;

    @doc("更新後の販売価格")
    sellingPrice?: float32;

    @doc("更新後の保管場所")
    location?: string;

    @doc("更新後の賞味・使用期限")
    expirationDate?: utcDateTime;

    @doc("在庫状態の更新")
    status?: InventoryStatusType;

    @doc("更新後の備考")
    notes?: string;
  }

  @doc("在庫移動処理を登録する入力モデル")
  model StockMovementInput {
    @doc("対象在庫 ID")
    inventoryId: InventoryId;

    @doc("在庫操作区分")
    type: "in" | "out" | "adjustment" | "transfer";

    @doc("操作数量")
    quantity: float32;

    @doc("操作理由")
    reason: string;

    @doc("関連する発注 ID")
    orderId?: OrderId;

    @doc("関連する施術記録 ID")
    treatmentRecordId?: TreatmentRecordId;

    @doc("備考メモ")
    notes?: string;
  }

  @doc("仕入れ発注を作成する入力モデル")
  model PurchaseOrderCreateInput {
    @doc("仕入先名")
    supplier: string;

    @doc("発注明細一覧")
    items: OrderItem[];

    @doc("税額")
    taxAmount: float32;

    @doc("送料")
    shippingCost?: float32;

    @doc("予定納期")
    expectedDelivery?: utcDateTime;

    @doc("支払条件")
    paymentTerms?: string;

    @doc("備考メモ")
    notes?: string;
  }

  @doc("仕入れ発注の更新入力モデル")
  model PurchaseOrderUpdateInput {
    @doc("更新後の発注ステータス")
    status?: OrderStatusType;

    @doc("更新後の予定納期")
    expectedDelivery?: utcDateTime;

    @doc("実際の納品日")
    actualDelivery?: utcDateTime;

    @doc("納品関連の備考")
    deliveryNotes?: string;

    @doc("その他の備考")
    notes?: string;
  }

  @doc("在庫検索のリクエスト条件")
  model SearchInventoryRequest {
    @doc("検索対象のサロン ID")
    @query
    salonId: SalonId;

    @doc("カテゴリでの絞り込み")
    @query
    category?: string;

    @doc("在庫状態での絞り込み")
    @query
    status?: InventoryStatusType;

    @doc("最低在庫を下回るもののみ取得するか")
    @query
    lowStock?: boolean;

    @doc("期限切れ間近の在庫を取得するか")
    @query
    expiringSoon?: boolean;

    ...SearchParams;
  }
}
