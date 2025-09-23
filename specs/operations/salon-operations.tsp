import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi3";
import "../models/salon.tsp";
import "../models/_shared/common.tsp";
import "../models/_shared/common-api-patterns.tsp";
import "./_shared/base-operations.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.OpenAPI;
using BeautySalon.Models;
using BeautySalon.Operations;

namespace BeautySalon.Operations {
  @doc("サロン拠点の登録・運営状況を統括し、予約導線や顧客体験の基盤となる情報を管理するAPI操作群です。")
  @route("/api/v1/salons")
  @tag("Salons")
  namespace SalonOperations {
    @doc("サロンの登録、更新、検索、監査ログなど基本運用に必要なCRUD操作をまとめて提供します。")
    @route("/")
    interface SalonCrud
      extends CrudOperations<
          Salon,
          CreateSalonRequest,
          UpdateSalonRequest,
          SalonSearchRequest,
          SalonId
        >,
        BulkOperations<Salon, CreateSalonRequest, UpdateSalonRequest, SalonId>,
        SearchOperations<Salon, SalonSearchRequest>,
        AuditOperations<Salon, SalonId> {}

    @doc("サロンの売上や予約件数など主要指標を取得し、経営判断や施策検討に活用します。")
    @summary("Get salon statistics")
    @get
    @route("{id}/statistics")
    op getStatistics(
      @path id: SalonId,

      @query
      @doc("集計期間（例: '7d', '1m', '3m'）")
      period?: string = "1m",

      @header("Authorization") authorization?: string,
    ): {
      @statusCode statusCode: 200;
      @body response: ApiResponse<SalonStatistics>;
    } | {
      @statusCode statusCode: 401;
      @body error: ProblemDetails;
    } | {
      @statusCode statusCode: 404;
      @body error: ProblemDetails;
    };

    @doc("希望日時にサロン全体で対応可能な枠があるかを判定し、予約導線での可用性表示に利用します。")
    @summary("Check salon availability")
    @post
    @route("{id}/availability")
    op checkAvailability(
      @path id: SalonId,
      @body request: SalonAvailabilityRequest,
      @header("Authorization") authorization?: string,
    ): {
      @statusCode statusCode: 200;
      @body response: ApiResponse<SalonAvailabilityResponse>;
    } | {
      @statusCode statusCode: 400;
      @body error: ProblemDetails;
    } | {
      @statusCode statusCode: 404;
      @body error: ProblemDetails;
    };

    @doc("位置情報と希望条件から近隣サロンを検索し、顧客に最適な選択肢を提示します。")
    @summary("Get nearby salons")
    @get
    @route("nearby")
    op getNearby(
      @query
      @doc("緯度")
      lat: float64,

      @query
      @doc("経度")
      lon: float64,

      @query
      @doc("検索半径（キロメートル）")
      @minValue(0.1)
      @maxValue(100)
      radius?: float32 = 5,

      @query
      @doc("対象サービスカテゴリのフィルター")
      categories?: ("cut" | "color" | "perm" | "treatment" | "spa" | "other")[],

      ...CursorPaginationParams,
      @header("Authorization") authorization?: string,
    ): {
      @statusCode statusCode: 200;
      @body response: CursorPaginationResponse<SalonWithDistance>;
    } | {
      @statusCode statusCode: 400;
      @body error: ProblemDetails;
    };

    @doc("掲載中のサロン画像を削除し、ブランドトーンの統一や情報更新を行います。")
    @summary("Delete salon image")
    @delete
    @route("{id}/images/{imageId}")
    op deleteImage(
      @path id: SalonId,
      @path imageId: string,
      @header("Authorization") authorization?: string,
    ): {
      @statusCode statusCode: 204;
    } | {
      @statusCode statusCode: 401;
      @body error: ProblemDetails;
    } | {
      @statusCode statusCode: 404;
      @body error: ProblemDetails;
    };

    @doc("顧客の嗜好や履歴にもとづきおすすめサロンを提示し、再来店促進や新規獲得を支援します。")
    @summary("Get personalized salon recommendations")
    @get
    @route("recommendations")
    op getRecommendations(
      @query
      @doc("パーソナライズ対象となる顧客ID")
      customerId?: CustomerId,

      @query
      @doc("興味のあるサービスカテゴリ")
      categories?: ("cut" | "color" | "perm" | "treatment" | "spa" | "other")[],

      @query
      @doc("希望する価格帯")
      priceRange?: "budget" | "medium" | "premium",

      ...CursorPaginationParams,
      @header("Authorization") authorization?: string,
    ): {
      @statusCode statusCode: 200;
      @body response: CursorPaginationResponse<SalonRecommendation>;
    } | {
      @statusCode statusCode: 401;
      @body error: ProblemDetails;
    };

    @doc("サロンのニュースやキャンペーン更新を購読登録し、ロイヤル顧客との接点を強化します。")
    @summary("Subscribe to salon updates")
    @post
    @route("{id}/subscribe")
    op subscribe(
      @path id: SalonId,
      @body request: SalonSubscriptionRequest,
      @header("Authorization") authorization?: string,
    ):
      | {
          @statusCode statusCode: 201;
          @body response: ApiResponse<SalonSubscriptionResponse>;
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
          @statusCode statusCode: 409; // Already subscribed
          @body error: ProblemDetails;
        };

    @doc("サロン所属スタッフのシフトを更新し、予約枠や勤怠管理との整合を取ります。")
    @summary("Update staff schedule")
    @put
    @route("{id}/staff/{staffId}/schedule")
    op updateStaffSchedule(
      @path id: SalonId,
      @path staffId: StaffId,
      @body schedule: StaffScheduleUpdateRequest,
      @header("Authorization") authorization?: string,
    ):
      | {
          @statusCode statusCode: 200;
          @body response: ApiResponse<StaffScheduleManagement>;
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
          @statusCode statusCode: 409; // Schedule conflict
          @body error: ProblemDetails;
        };
  }
}
