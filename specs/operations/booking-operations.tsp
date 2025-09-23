import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi3";
import "../models/booking.tsp";
import "../models/common.tsp";
import "../models/payment.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.OpenAPI;
using BeautySalon.Models;

namespace BeautySalon.Operations {
  @doc("複数予約や複合メニューをまとめた施術予約パッケージの管理を担うAPI操作群です。顧客体験と店舗オペレーションの整合を図ります。")
  @route("/api/v1/bookings")
  @tag("Bookings")
  namespace BookingOperations {
    @doc("サロン・顧客・ステータスなどの条件で予約パッケージを一覧表示し、受付状況を俯瞰します。")
    @summary("List bookings")
    @get
    op list(
      @query salonId?: SalonId,
      @query customerId?: CustomerId,
      @query status?: BookingStatusCodeType,
      @query from?: utcDateTime,
      @query to?: utcDateTime,
      ...PaginationParams,
    ): {
      @statusCode statusCode: 200;
      @body response: PaginationResponse<BookingDetail>;
    };

    @doc("新規の予約パッケージを作成し、施術メニューと顧客情報を紐づけて確定します。")
    @summary("Create booking")
    @post
    op create(@body booking: CreateBookingRequest): {
      @statusCode statusCode: 201;
      @header location: string;
      @body booking: Booking;
    } | {
      @statusCode statusCode: 400;
      @body error: Error;
    } | {
      @statusCode statusCode: 409;
      @body error: Error;
    };

    @doc("個別の予約パッケージ詳細を取得し、関連する予約枠や支払い状況を確認します。")
    @summary("Get booking")
    @get
    op get(@path id: BookingId): {
      @statusCode statusCode: 200;
      @body booking: BookingDetail;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    };

    @doc("既存の予約パッケージ内容を部分的に更新し、顧客要望の変更に対応します。")
    @summary("Update booking")
    @patch(#{ implicitOptionality: true })
    op update(@path id: BookingId, @body updates: UpdateBookingRequest): {
      @statusCode statusCode: 200;
      @body booking: Booking;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    } | {
      @statusCode statusCode: 400;
      @body error: Error;
    };

    @doc("予約パッケージを削除し、誤登録や無効となった複数予約を整理します。")
    @summary("Delete booking")
    @delete
    op delete(@path id: BookingId): {
      @statusCode statusCode: 204;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    } | {
      @statusCode statusCode: 409;
      @body error: Error;
    };

    @doc("仮状態の予約パッケージを確定ステータスへ変更し、顧客への案内やリソース確保を開始します。")
    @summary("Confirm booking")
    @route("/{id}/confirm")
    @post
    op confirm(@path id: BookingId): {
      @statusCode statusCode: 200;
      @body booking: Booking;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    } | {
      @statusCode statusCode: 409;
      @body error: Error;
    };

    @doc("確定済みの予約パッケージをキャンセルし、理由と連動予約の取り扱いを記録します。")
    @summary("Cancel booking")
    @route("/{id}/cancel")
    @post
    op cancel(
      @path id: BookingId,
      @body request: {
        reason?: string;
        cancelReservations?: boolean;
      },
    ): {
      @statusCode statusCode: 200;
      @body booking: Booking;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    } | {
      @statusCode statusCode: 409;
      @body error: Error;
    };

    @doc("予約パッケージに対する決済を処理し、支払い手段・金額・トランザクションIDを保存します。")
    @summary("Process payment")
    @route("/{id}/payment")
    @post
    op processPayment(
      @path id: BookingId,
      @body request: {
        paymentMethod: PaymentMethodType;
        amount: Money;
        transactionId?: string;
      },
    ): {
      @statusCode statusCode: 200;
      @body response: {
        booking: Booking;
        paymentId: PaymentId;
      };
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    } | {
      @statusCode statusCode: 400;
      @body error: Error;
    };

    @doc("既存の予約パッケージに個別の予約枠を追加し、まとめて管理します。")
    @summary("Add reservation to booking")
    @route("/{id}/reservations")
    @post
    op addReservation(
      @path id: BookingId,
      @body request: {
        reservationId: ReservationId;
      },
    ): {
      @statusCode statusCode: 200;
      @body booking: Booking;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    } | {
      @statusCode statusCode: 409;
      @body error: Error;
    };

    @doc("予約パッケージから紐づく予約枠を外し、構成内容を調整します。")
    @summary("Remove reservation from booking")
    @route("/{id}/reservations/{reservationId}")
    @delete
    op removeReservation(
      @path id: BookingId,
      @path reservationId: ReservationId,
    ): {
      @statusCode statusCode: 200;
      @body booking: Booking;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    };
  }
}
