import "@typespec/http";
import "./_shared/common.tsp";

using TypeSpec.Http;

namespace BeautySalon.Models {
  @doc("顧客来店時の施術記録")
  model TreatmentRecord {
    @doc("施術記録 ID")
    id: TreatmentRecordId;

    @doc("紐づく予約 ID")
    bookingId: BookingId;

    @doc("施術を受けた顧客 ID")
    customerId: CustomerId;

    @doc("施術担当スタッフ ID")
    staffId: StaffId;

    @doc("施術を実施したサロン ID")
    salonId: SalonId;

    @doc("実施した施術タイプ")
    treatment: TreatmentType;

    @doc("施術で提供したサービス ID 一覧")
    serviceIds: ServiceId[];

    @doc("施術開始日時")
    startTime: utcDateTime;

    @doc("施術終了日時")
    endTime: utcDateTime;

    @doc("施術の詳細メモ")
    notes: string | null;

    @doc("使用した資材・商材の記録")
    usedMaterials: MaterialUsage[] | null;

    @doc("施術前後の写真 ID")
    photos: AttachmentId[] | null;

    @doc("顧客のフィードバック")
    customerFeedback: string | null;

    @doc("次回来店への提案内容")
    nextRecommendations: string | null;

    @doc("請求総額")
    totalAmount: float32;

    @doc("適用した割引額")
    discountAmount: float32 | null;

    @doc("付与したポイント数")
    pointsEarned: int32 | null;

    ...AuditInfo;
  }

  @doc("施術で使用した資材の記録")
  model MaterialUsage {
    @doc("使用した在庫 ID")
    inventoryId: InventoryId;

    @doc("資材名")
    productName: string;

    @doc("使用量")
    quantity: float32;

    @doc("数量単位")
    unit: string;

    @doc("備考メモ")
    notes: string | null;
  }

  @doc("顧客ごとのカルテ情報")
  model MedicalChart {
    @doc("カルテ ID")
    id: MedicalChartId;

    @doc("対象顧客 ID")
    customerId: CustomerId;

    @doc("アレルギー・敏感情報")
    allergies: string[] | null;

    @doc("頭皮状態のメモ")
    scalpCondition: string | null;

    @doc("毛髪状態のメモ")
    hairCondition: string | null;

    @doc("過去に実施したケミカル施術履歴")
    previousTreatments: PreviousTreatment[] | null;

    @doc("注意が必要な持病・体調情報")
    medicalConditions: string | null;

    @doc("好みの商材・ブランド")
    preferredProducts: string[] | null;

    @doc("避けるべき商材")
    avoidProducts: string[] | null;

    @doc("自由記述メモ")
    notes: string | null;

    @doc("最終更新日時")
    lastUpdated: utcDateTime;

    ...AuditInfo;
  }

  @doc("過去施術の履歴")
  model PreviousTreatment {
    @doc("施術タイプ")
    treatment: TreatmentType;

    @doc("施術日")
    date: utcDateTime;

    @doc("施術を受けたサロン名")
    salonName: string | null;

    @doc("施術に関するメモ")
    notes: string | null;
  }

  @doc("施術記録を新規登録する入力モデル")
  model TreatmentRecordCreateRequest {
    @doc("紐づく予約 ID")
    bookingId: BookingId;

    @doc("施術を受けた顧客 ID")
    customerId: CustomerId;

    @doc("施術担当スタッフ ID")
    staffId: StaffId;

    @doc("施術タイプ")
    treatment: TreatmentType;

    @doc("提供したサービス ID 一覧")
    serviceIds: ServiceId[];

    @doc("施術開始日時")
    startTime: utcDateTime;

    @doc("施術終了日時")
    endTime: utcDateTime;

    @doc("施術メモ")
    notes: string | null;

    @doc("使用した資材一覧")
    usedMaterials: MaterialUsage[] | null;

    @doc("顧客フィードバック")
    customerFeedback: string | null;

    @doc("次回来店への提案内容")
    nextRecommendations: string | null;

    @doc("請求総額")
    totalAmount: float32;

    @doc("割引額")
    discountAmount: float32 | null;

    @doc("付与ポイント数")
    pointsEarned: int32 | null;
  }

  @doc("施術記録を更新する入力モデル")
  model TreatmentRecordUpdateRequest {
    @doc("施術メモ")
    notes?: string | null;

    @doc("使用した資材一覧")
    usedMaterials?: MaterialUsage[] | null;

    @doc("顧客フィードバック")
    customerFeedback?: string | null;

    @doc("次回来店への提案内容")
    nextRecommendations?: string | null;

    @doc("施術前後写真 ID")
    photos?: AttachmentId[] | null;
  }

  @doc("カルテを新規作成する入力モデル")
  model MedicalChartCreateRequest {
    @doc("対象顧客 ID")
    customerId: CustomerId;

    @doc("アレルギー情報")
    allergies: string[] | null;

    @doc("頭皮状態")
    scalpCondition: string | null;

    @doc("毛髪状態")
    hairCondition: string | null;

    @doc("過去施術の履歴")
    previousTreatments: PreviousTreatment[] | null;

    @doc("注意すべき体調・持病")
    medicalConditions: string | null;

    @doc("好みの商材")
    preferredProducts: string[] | null;

    @doc("避けるべき商材")
    avoidProducts: string[] | null;

    @doc("その他メモ")
    notes: string | null;
  }

  @doc("カルテ情報を更新する入力モデル")
  model MedicalChartUpdateRequest {
    @doc("アレルギー情報")
    allergies?: string[] | null;

    @doc("頭皮状態")
    scalpCondition?: string | null;

    @doc("毛髪状態")
    hairCondition?: string | null;

    @doc("過去施術の履歴")
    previousTreatments?: PreviousTreatment[] | null;

    @doc("注意すべき体調・持病")
    medicalConditions?: string | null;

    @doc("好みの商材")
    preferredProducts?: string[] | null;

    @doc("避けるべき商材")
    avoidProducts?: string[] | null;

    @doc("その他メモ")
    notes?: string | null;
  }
}
