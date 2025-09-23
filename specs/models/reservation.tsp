import "@typespec/http";
import "./common.tsp";

using TypeSpec.Http;
using BeautySalon.Models;

namespace BeautySalon.Models {
  @doc("""
    予約モデル - 顧客がサロンに依頼した施術予約の全情報を保持し、日時・担当者・料金・支払い状態を一元管理する中核レコード
    """)
  model Reservation {
    @doc("予約を一意に識別するID")
    id: ReservationId;

    @doc("予約が紐づくサロンのID")
    salonId: SalonId;

    @doc("予約を行った顧客のID")
    customerId: CustomerId;

    @doc("施術を担当するスタッフのID")
    staffId: StaffId;

    @doc("予約された施術メニューのID")
    serviceId: ServiceId;

    @doc("施術開始予定日時 (UTC)")
    startTime: utcDateTime;

    @doc("施術終了予定日時 (UTC)")
    endTime: utcDateTime;

    @doc("予約の現在ステータスを表す区分値")
    status: ReservationStatusType;

    @doc("顧客からの特記事項やサロン側メモ")
    notes?: string;

    @doc("施術料金の合計金額 (税・割引適用後)")
    totalAmount: int32;

    @doc("事前に受領した内金・デポジット金額")
    depositAmount?: int32;

    @doc("予約に対する決済が完了しているかを示すフラグ")
    isPaid: boolean;

    @doc("キャンセルが発生した場合の理由")
    cancellationReason?: string;

    ...AuditInfo;
  }

  @doc("""
    予約作成リクエスト - 新規予約登録時に必要なサロン・顧客・メニュー・希望日時の情報を受け取る
    """)
  model CreateReservationRequest {
    @doc("予約対象のサロンID")
    salonId: SalonId;

    @doc("予約を申し込む顧客ID")
    customerId: CustomerId;

    @doc("担当予定のスタッフID")
    staffId: StaffId;

    @doc("希望する施術メニューID")
    serviceId: ServiceId;

    @doc("希望する施術開始日時 (UTC)")
    startTime: utcDateTime;

    @doc("顧客要望や注意事項のメモ")
    notes?: string;
  }

  @doc("""
    予約更新リクエスト - 部分更新に対応した任意項目の変更指示を受け取り、既存予約を調整する
    """)
  model UpdateReservationRequest {
    @doc("更新後の予約ステータス")
    status?: ReservationStatusType;

    @doc("最新の顧客メモや社内備考")
    notes?: string;

    @doc("調整後の施術開始日時 (UTC)")
    startTime?: utcDateTime;

    @doc("再割当先のスタッフID")
    staffId?: StaffId;
  }

  @doc("""
    リセット対応予約更新リクエスト - null指定により備考等を初期化しつつ、予約情報を更新できる
    """)
  model UpdateReservationRequestWithReset {
    @doc("更新後の予約ステータス")
    status?: ReservationStatusType;

    @doc("null指定で備考のリセットも可能な顧客メモ")
    notes?: string | null;

    @doc("調整後の施術開始日時 (UTC)")
    startTime?: utcDateTime;

    @doc("再割当先のスタッフID")
    staffId?: StaffId;
  }

  @doc("""
    空き枠情報モデル - スタッフごとの提供可能時間帯を表し、予約可能枠の算出に使用する
    """)
  model AvailableSlot {
    @doc("対象スタッフのID")
    staffId: StaffId;

    @doc("空き枠の開始日時 (UTC)")
    startTime: utcDateTime;

    @doc("空き枠の終了日時 (UTC)")
    endTime: utcDateTime;
  }

  @doc("""
    予約詳細モデル - 基本予約情報に顧客・スタッフ・メニュー名称やカテゴリなどの表示用情報を付加した拡張ビュー
    """)
  model ReservationDetail extends Reservation {
    @doc("顧客の表示名")
    customerName: string;

    @doc("担当スタッフの表示名")
    staffName: string;

    @doc("施術メニューの名称")
    serviceName: string;

    @doc("施術メニューが属するカテゴリ区分")
    serviceCategory: ServiceCategoryType;

    @doc("施術メニューの所要時間 (分)")
    serviceDuration: int32;
  }
}
