import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi3";
import "../models/customer.tsp";
import "../models/reservation.tsp";
import "../models/booking.tsp";
import "../models/_shared/common.tsp";
import "../models/_shared/common-api-patterns.tsp";
import "./_shared/base-operations.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.OpenAPI;
using BeautySalon.Models;
using BeautySalon.Operations;

namespace BeautySalon.Operations {
  @doc("顧客情報の管理とエンゲージメント施策を支えるAPI操作群です。プロフィールから予約履歴、ロイヤルティ施策まで一貫して扱います。")
  @route("/api/v1/customers")
  @tag("Customers")
  namespace CustomerOperations {
    @doc("顧客レコードの登録・更新・検索・監査を包括的に提供し、業務オペレーションの基盤を構築します。")
    @route("/")
    interface CustomerCrud
      extends CrudOperations<
          Customer,
          CustomerCreateRequest,
          CustomerUpdateRequest,
          CustomerSearchRequest,
          CustomerId
        >,
        BulkOperations<
          Customer,
          CustomerCreateRequest,
          CustomerUpdateRequest,
          CustomerId
        >,
        SearchOperations<Customer, CustomerSearchRequest>,
        AuditOperations<Customer, CustomerId> {}

    @doc("顧客の基本情報に加え、嗜好や連絡先など拡張情報を取得し、パーソナライズ対応に活かします。")
    @summary("Get customer profile")
    @get
    @route("{id}/profile")
    op getProfile(
      @path id: CustomerId,
      @header("Authorization") authorization?: string,
    ): {
      @statusCode statusCode: 200;
      @body response: ApiResponse<CustomerProfile>;
    } | {
      @statusCode statusCode: 401;
      @body error: ProblemDetails;
    } | {
      @statusCode statusCode: 404;
      @body error: ProblemDetails;
    };

    @doc("来店頻度や売上貢献度など顧客指標を集計し、セグメント施策やVIP判定に利用します。")
    @summary("Get customer statistics")
    @get
    @route("{id}/statistics")
    op getStatistics(
      @path id: CustomerId,

      @query
      @doc("集計対象期間（例: '7d', '1m', '3m', '1y'）")
      period?: string = "1y",

      @header("Authorization") authorization?: string,
    ): {
      @statusCode statusCode: 200;
      @body response: ApiResponse<CustomerStatistics>;
    } | {
      @statusCode statusCode: 401;
      @body error: ProblemDetails;
    } | {
      @statusCode statusCode: 404;
      @body error: ProblemDetails;
    };

    @doc("顧客が保持する予約履歴を取得し、来店予定や過去施術の確認に利用します。")
    @summary("Get customer reservations")
    @get
    @route("{id}/reservations")
    op getReservations(
      @path id: CustomerId,
      @query status?: ReservationStatusType,

      @query
      @doc("取得対象期間の開始日時")
      from?: utcDateTime,

      @query
      @doc("取得対象期間の終了日時")
      to?: utcDateTime,

      ...CursorPaginationParams,
      @header("Authorization") authorization?: string,
    ): {
      @statusCode statusCode: 200;
      @body response: CursorPaginationResponse<ReservationDetail>;
    } | {
      @statusCode statusCode: 401;
      @body error: ProblemDetails;
    } | {
      @statusCode statusCode: 404;
      @body error: ProblemDetails;
    };

    @doc("顧客単位の予約パッケージ情報を取得し、複数施術を跨いだ利用状況を把握します。")
    @summary("Get customer bookings")
    @get
    @route("{id}/bookings")
    op getBookings(
      @path id: CustomerId,
      @query status?: BookingStatusCodeType,

      @query
      @doc("取得対象期間の開始日時")
      from?: utcDateTime,

      @query
      @doc("取得対象期間の終了日時")
      to?: utcDateTime,

      ...CursorPaginationParams,
      @header("Authorization") authorization?: string,
    ): {
      @statusCode statusCode: 200;
      @body response: CursorPaginationResponse<BookingDetail>;
    } | {
      @statusCode statusCode: 401;
      @body error: ProblemDetails;
    } | {
      @statusCode statusCode: 404;
      @body error: ProblemDetails;
    };

    @doc("顧客の施術好みや連絡手段などの希望設定を更新し、パーソナライズされた提案に反映します。")
    @summary("Update customer preferences")
    @put
    @route("{id}/preferences")
    op updatePreferences(
      @path id: CustomerId,
      @body preferences: CustomerPreferencesUpdateRequest,
      @header("Authorization") authorization?: string,
    ):
      | {
          @statusCode statusCode: 200;
          @body response: ApiResponse<CustomerPreferences>;
        }
      | {
          @statusCode statusCode: 400;
          @body error: ProblemDetails;
        }
      | {
          @statusCode statusCode: 401;
          @body error: ProblemDetails;
        }
      | {
          @statusCode statusCode: 404;
          @body error: ProblemDetails;
        };

    @doc("重複登録された顧客レコードを統合し、履歴やポイントを一本化します。")
    @summary("Merge customer records")
    @post
    @route("merge")
    op merge(
      @body request: {
        @doc("統合後も残すメイン顧客ID")
        primaryCustomerId: CustomerId;

        @doc("統合して削除するサブ顧客ID")
        secondaryCustomerId: CustomerId;

        @doc("重複データの優先ルール")
        conflictResolution?: "keep_primary" | "keep_secondary" | "keep_newest";
      },
      @header("Authorization") authorization?: string,
    ):
      | {
          @statusCode statusCode: 200;
          @body response: ApiResponse<Customer>;
        }
      | {
          @statusCode statusCode: 400;
          @body error: ProblemDetails;
        }
      | {
          @statusCode statusCode: 401;
          @body error: ProblemDetails;
        }
      | {
          @statusCode statusCode: 404;
          @body error: ProblemDetails;
        }
      | {
          @statusCode statusCode: 409;
          @body error: ProblemDetails;
        };

    @doc("顧客が自身のデータを取得できるようエクスポートし、GDPR等の個人情報規制に対応します。")
    @summary("Export customer data")
    @get
    @route("{id}/export")
    op exportData(
      @path id: CustomerId,

      @query
      @doc("エクスポート形式")
      format?: "json" | "csv" | "pdf" = "json",

      @header("Authorization") authorization?: string,
    ): {
      @statusCode statusCode: 200;
      @body response: bytes;
      @header("Content-Type") content: string;
      @header("Content-Disposition") contentDisposition: string;
    } | {
      @statusCode statusCode: 401;
      @body error: ProblemDetails;
    } | {
      @statusCode statusCode: 404;
      @body error: ProblemDetails;
    };

    @doc("顧客からの削除要請を受け付け、規制に沿った消去フローを開始します。")
    @summary("Request customer data deletion")
    @post
    @route("{id}/deletion-request")
    op requestDeletion(
      @path id: CustomerId,
      @body request: {
        @doc("削除を希望する理由")
        reason: string;

        @doc("削除に伴う影響を理解しているか")
        confirmed: boolean;
      },
      @header("Authorization") authorization?: string,
    ):
      | {
          @statusCode statusCode: 202;
          @body response: ApiResponse<{
            @doc("削除リクエストID")
            requestId: string;

            @doc("予定される削除日")
            scheduledDate: utcDateTime;

            @doc("猶予期間（日数）")
            gracePeriodDays: int32;
          }>;
        }
      | {
          @statusCode statusCode: 400;
          @body error: ProblemDetails;
        }
      | {
          @statusCode statusCode: 401;
          @body error: ProblemDetails;
        }
      | {
          @statusCode statusCode: 404;
          @body error: ProblemDetails;
        };

    @doc("来店やキャンペーンに応じてロイヤルティポイントを加算し、顧客維持を促進します。")
    @summary("Add loyalty points")
    @post
    @route("{id}/loyalty-points")
    op addLoyaltyPoints(
      @path id: CustomerId,
      @body request: {
        @doc("加算するポイント数")
        @minValue(1)
        points: int32;

        @doc("ポイント加算の理由")
        reason: string;

        @doc("関連する参照ID（例: 予約ID）")
        referenceId?: string;
      },
      @header("Authorization") authorization?: string,
    ):
      | {
          @statusCode statusCode: 200;
          @body response: ApiResponse<{
            @doc("更新後のポイント残高")
            balance: int32;

            @doc("トランザクションID")
            transactionId: string;
          }>;
        }
      | {
          @statusCode statusCode: 400;
          @body error: ProblemDetails;
        }
      | {
          @statusCode statusCode: 401;
          @body error: ProblemDetails;
        }
      | {
          @statusCode statusCode: 404;
          @body error: ProblemDetails;
        };
  }
}
