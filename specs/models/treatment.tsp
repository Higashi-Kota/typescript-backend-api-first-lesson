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

    @doc("施術の詳細メモ - 特記事項がない通常施術の場合はnull")
    notes: string | null;

    @doc("使用した資材・商材の記録 - カットのみなど商材を使用しない施術の場合はnull")
    usedMaterials: MaterialUsage[] | null;

    @doc("施術前後の写真 ID - 写真撮影を希望しない顧客や撮影が不要な施術の場合はnull")
    photos: AttachmentId[] | null;

    @doc("顧客のフィードバック - 施術直後でフィードバック未収集の場合はnull")
    customerFeedback: string | null;

    @doc("次回来店への提案内容 - 特に提案事項がない場合や定期メンテナンスのみの場合はnull")
    nextRecommendations: string | null;

    @doc("請求総額")
    totalAmount: float32;

    @doc("適用した割引額 - 割引を適用しない定価施術の場合はnull")
    discountAmount: float32 | null;

    @doc("付与したポイント数 - ポイント対象外の施術やポイント制度未導入サロンの場合はnull")
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

    @doc("備考メモ - 特記事項がない標準的な使用量の場合はnull")
    notes: string | null;
  }

  @doc("顧客ごとのカルテ情報")
  model MedicalChart {
    @doc("カルテ ID")
    id: MedicalChartId;

    @doc("対象顧客 ID")
    customerId: CustomerId;

    @doc("アレルギー・敏感情報 - アレルギーがない顧客の場合はnull")
    allergies: string[] | null;

    @doc("頭皮状態のメモ - 頭皮に問題がない健康な状態の場合はnull")
    scalpCondition: string | null;

    @doc("毛髪状態のメモ - 毛髪に特筆すべき問題がない場合はnull")
    hairCondition: string | null;

    @doc("過去に実施したケミカル施術履歴 - 初回来店やケミカル施術経験がない顧客の場合はnull")
    previousTreatments: PreviousTreatment[] | null;

    @doc("注意が必要な持病・体調情報 - 健康上の問題がない顧客の場合はnull")
    medicalConditions: string | null;

    @doc("好みの商材・ブランド - 特定の好みがない顧客の場合はnull")
    preferredProducts: string[] | null;

    @doc("避けるべき商材 - 特に避けるべき商材がない顧客の場合はnull")
    avoidProducts: string[] | null;

    @doc("自由記述メモ - 追加情報がない標準的なカルテの場合はnull")
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

    @doc("施術を受けたサロン名 - 自店での施術や不明な場合はnull")
    salonName: string | null;

    @doc("施術に関するメモ - 特記事項がない通常の過去施術の場合はnull")
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

    @doc("施術メモ - 特記事項がない通常施術の場合はnull")
    notes: string | null;

    @doc("使用した資材一覧 - カットのみなど商材を使用しない施術の場合はnull")
    usedMaterials: MaterialUsage[] | null;

    @doc("顧客フィードバック - 施術直後でフィードバック未収集の場合はnull")
    customerFeedback: string | null;

    @doc("次回来店への提案内容 - 特に提案事項がない場合や定期メンテナンスのみの場合はnull")
    nextRecommendations: string | null;

    @doc("請求総額")
    totalAmount: float32;

    @doc("割引額 - 割引を適用しない定価施術の場合はnull")
    discountAmount: float32 | null;

    @doc("付与ポイント数 - ポイント対象外の施術やポイント制度未導入サロンの場合はnull")
    pointsEarned: int32 | null;
  }

  @doc("施術記録を更新する入力モデル")
  model TreatmentRecordUpdateRequest {
    @doc("施術メモ - 特記事項がない通常施術の場合はnull、null指定で値をリセット可能")
    notes?: string | null;

    @doc("使用した資材一覧 - カットのみなど商材を使用しない施術の場合はnull、null指定で値をリセット可能")
    usedMaterials?: MaterialUsage[] | null;

    @doc("顧客フィードバック - 施術直後でフィードバック未収集の場合はnull、null指定で値をリセット可能")
    customerFeedback?: string | null;

    @doc("次回来店への提案内容 - 特に提案事項がない場合や定期メンテナンスのみの場合はnull、null指定で値をリセット可能")
    nextRecommendations?: string | null;

    @doc("施術前後写真 ID - 写真撮影を希望しない顧客や撮影が不要な施術の場合はnull、null指定で値をリセット可能")
    photos?: AttachmentId[] | null;
  }

  @doc("カルテを新規作成する入力モデル")
  model MedicalChartCreateRequest {
    @doc("対象顧客 ID")
    customerId: CustomerId;

    @doc("アレルギー情報 - アレルギーがない顧客の場合はnull")
    allergies: string[] | null;

    @doc("頭皮状態 - 頭皮に問題がない健康な状態の場合はnull")
    scalpCondition: string | null;

    @doc("毛髪状態 - 毛髪に特筆すべき問題がない場合はnull")
    hairCondition: string | null;

    @doc("過去施術の履歴 - 初回来店やケミカル施術経験がない顧客の場合はnull")
    previousTreatments: PreviousTreatment[] | null;

    @doc("注意すべき体調・持病 - 健康上の問題がない顧客の場合はnull")
    medicalConditions: string | null;

    @doc("好みの商材 - 特定の好みがない顧客の場合はnull")
    preferredProducts: string[] | null;

    @doc("避けるべき商材 - 特に避けるべき商材がない顧客の場合はnull")
    avoidProducts: string[] | null;

    @doc("その他メモ - 追加情報がない標準的なカルテの場合はnull")
    notes: string | null;
  }

  @doc("カルテ情報を更新する入力モデル")
  model MedicalChartUpdateRequest {
    @doc("アレルギー情報 - アレルギーがない顧客の場合はnull、null指定で値をリセット可能")
    allergies?: string[] | null;

    @doc("頭皮状態 - 頭皮に問題がない健康な状態の場合はnull、null指定で値をリセット可能")
    scalpCondition?: string | null;

    @doc("毛髪状態 - 毛髪に特筆すべき問題がない場合はnull、null指定で値をリセット可能")
    hairCondition?: string | null;

    @doc("過去施術の履歴 - 初回来店やケミカル施術経験がない顧客の場合はnull、null指定で値をリセット可能")
    previousTreatments?: PreviousTreatment[] | null;

    @doc("注意すべき体調・持病 - 健康上の問題がない顧客の場合はnull、null指定で値をリセット可能")
    medicalConditions?: string | null;

    @doc("好みの商材 - 特定の好みがない顧客の場合はnull、null指定で値をリセット可能")
    preferredProducts?: string[] | null;

    @doc("避けるべき商材 - 特に避けるべき商材がない顧客の場合はnull、null指定で値をリセット可能")
    avoidProducts?: string[] | null;

    @doc("その他メモ - 追加情報がない標準的なカルテの場合はnull、null指定で値をリセット可能")
    notes?: string | null;
  }
}
