import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi3";
import "../models/reservation.tsp";
import "../models/common.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.OpenAPI;
using BeautySalon.Models;

namespace BeautySalon.Operations {
  @doc("予約枠の作成・変更・完了を管理し、サロンの施術スケジュール全体を整えるAPI操作群です。")
  @route("/api/v1/reservations")
  @tag("Reservations")
  namespace ReservationOperations {
    @doc("サロン、顧客、スタッフなどの条件で予約一覧を取得し、当日の稼働状況を把握します。")
    @summary("List reservations")
    @get
    op list(
      @query salonId?: SalonId,
      @query customerId?: CustomerId,
      @query staffId?: StaffId,
      @query status?: ReservationStatusType,
      @query from?: utcDateTime,
      @query to?: utcDateTime,
      ...PaginationParams,
    ): {
      @statusCode statusCode: 200;
      @body response: PaginationResponse<ReservationDetail>;
    };

    @doc("新しい施術予約を登録し、枠の確保と関連リソースの仮押さえを行います。")
    @summary("Create reservation")
    @post
    op create(@body reservation: CreateReservationRequest): {
      @statusCode statusCode: 201;
      @header location: string;
      @body reservation: Reservation;
    } | {
      @statusCode statusCode: 400;
      @body error: Error;
    } | {
      @statusCode statusCode: 409;
      @body error: Error;
    };

    @doc("個別予約の詳細情報を取得し、施術内容や担当者、タイムラインを確認します。")
    @summary("Get reservation")
    @get
    op get(@path id: ReservationId): {
      @statusCode statusCode: 200;
      @body reservation: ReservationDetail;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    };

    @doc("予約内容を部分的に更新し、サービス内容や担当スタッフの変更に対応します。")
    @summary("Update reservation")
    @patch(#{ implicitOptionality: true })
    op update(
      @path id: ReservationId,
      @body updates: UpdateReservationRequest,
    ):
      | {
          @statusCode statusCode: 200;
          @body reservation: Reservation;
        }
      | {
          @statusCode statusCode: 404;
          @body error: Error;
        }
      | {
          @statusCode statusCode: 400;
          @body error: Error;
        }
      | {
          @statusCode statusCode: 409;
          @body error: Error;
        };

    @doc("確定済みの予約をキャンセルし、理由の記録と枠の開放を行います。")
    @summary("Cancel reservation")
    @route("/{id}/cancel")
    @post
    op cancel(
      @path id: ReservationId,
      @body request: {
        reason?: string;
      },
    ): {
      @statusCode statusCode: 200;
      @body reservation: Reservation;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    } | {
      @statusCode statusCode: 409;
      @body error: Error;
    };

    @doc("施術完了を登録し、実績データや売上計上に利用するステータスへ更新します。")
    @summary("Complete reservation")
    @route("/{id}/complete")
    @post
    op complete(@path id: ReservationId): {
      @statusCode statusCode: 200;
      @body reservation: Reservation;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    } | {
      @statusCode statusCode: 409;
      @body error: Error;
    };

    @doc("予約日時や担当者の調整が必要な際に、新しいスケジュールへ付け替えます。")
    @summary("Reschedule reservation")
    @route("/{id}/reschedule")
    @post
    op reschedule(
      @path id: ReservationId,
      @body request: {
        newStartTime: utcDateTime;
        staffId?: StaffId;
      },
    ): {
      @statusCode statusCode: 200;
      @body reservation: Reservation;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    } | {
      @statusCode statusCode: 409;
      @body error: Error;
    };
  }

  @doc("各サロンの予約可能時間帯を算出し、オンライン予約枠表示やスタッフ提案に使用するAPI操作群です。")
  @route("/api/v1/salons/{salonId}/available-slots")
  @tag("Reservations")
  namespace AvailabilityOperations {
    @doc("指定日の予約可能枠を取得し、空き枠一覧や予約フォームに反映します。")
    @summary("Get available slots")
    @get
    op getAvailableSlots(
      @path salonId: SalonId,
      @query staffId?: StaffId,
      @query serviceId: ServiceId,
      @query date: plainDate,
      @query duration?: int32,
    ): {
      @statusCode statusCode: 200;
      @body slots: AvailableSlot[];
    } | {
      @statusCode statusCode: 400;
      @body error: Error;
    };

    @doc("希望する日時・スタッフの組み合わせが予約可能か即時判定し、ダブルブッキングを防ぎます。")
    @summary("Check availability")
    @route("/check")
    @post
    op checkAvailability(
      @path salonId: SalonId,
      @body request: {
        staffId: StaffId;
        serviceId: ServiceId;
        startTime: utcDateTime;
      },
    ): {
      @statusCode statusCode: 200;
      @body response: {
        isAvailable: boolean;
        conflicts?: ReservationId[];
      };
    };
  }
}
