import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi3";
import "../models/review.tsp";
import "../models/_shared/common.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.OpenAPI;
using BeautySalon.Models;

namespace BeautySalon.Operations {
  @doc("施術体験に対する顧客レビューを収集・運用し、信頼性の高いフィードバック基盤を構築するAPI操作群です。")
  @route("/api/v1/reviews")
  @tag("Reviews")
  namespace ReviewOperations {
    @doc("顧客やスタッフ、評価点でレビューを絞り込み、店舗運営の改善材料を抽出します。")
    @summary("List reviews")
    @get
    op list(
      @query salonId?: SalonId,
      @query customerId?: CustomerId,
      @query bookingId?: BookingId, // Added to support filtering by booking
      @query staffId?: StaffId,
      @query minRating?: int32,
      @query isVerified?: boolean,
      ...PaginationParams,
    ): {
      @statusCode statusCode: 200;
      @body response: PaginationResponse<Review>;
    };

    @doc("施術完了後に顧客がレビューを投稿し、サービス品質の可視化と信頼獲得につなげます。")
    @summary("Create review")
    @post
    op create(@body review: CreateReviewRequest): {
      @statusCode statusCode: 201;
      @header location: string;
      @body review: Review;
    } | {
      @statusCode statusCode: 400;
      @body error: Error;
    } | {
      @statusCode statusCode: 409;
      @body error: Error;
    };

    @doc("単一レビューの詳細を表示し、コメント内容や評価指標を確認します。")
    @summary("Get review")
    @get
    op get(@path id: ReviewId): {
      @statusCode statusCode: 200;
      @body review: Review;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    };

    @doc("顧客が投稿後のレビューを修正し、誤記修正や追記を反映します。")
    @summary("Update review")
    @patch(#{ implicitOptionality: true })
    op update(@path id: ReviewId, @body updates: UpdateReviewRequest): {
      @statusCode statusCode: 200;
      @body review: Review;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    } | {
      @statusCode statusCode: 403;
      @body error: Error;
    };

    @doc("レビューの削除要請に応じて投稿を非表示または除去し、コンプライアンスを維持します。")
    @summary("Delete review")
    @delete
    op delete(@path id: ReviewId): {
      @statusCode statusCode: 204;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    } | {
      @statusCode statusCode: 403;
      @body error: Error;
    };

    @doc("他の利用者に役立つレビューをマーキングし、信頼性の高い声を強調します。")
    @summary("Mark review as helpful")
    @route("/{id}/helpful")
    @post
    op markHelpful(@path id: ReviewId): {
      @statusCode statusCode: 200;
      @body response: {
        helpfulCount: int32;
      };
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    };

    @doc("不適切な内容や虚偽が疑われるレビューを通報し、運営による対応フローへ送ります。")
    @summary("Report review")
    @route("/{id}/report")
    @post
    op report(
      @path id: ReviewId,
      @body request: {
        reason: string;
        details?: string;
      },
    ): {
      @statusCode statusCode: 200;
      @body response: {
        reportId: string;
      };
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    };
  }

  @doc("サロン単位でのレビュー評価と傾向を集計し、店舗ブランディングと改善施策に活かすAPI操作群です。")
  @route("/api/v1/salons/{salonId}/reviews")
  @tag("Reviews")
  namespace SalonReviewOperations {
    @doc("サロン全体の平均評価や件数などの概要指標を取得し、ダッシュボード表示に利用します。")
    @summary("Get salon reviews summary")
    @route("/summary")
    @get
    op getSummary(@path salonId: SalonId): {
      @statusCode statusCode: 200;
      @body summary: ReviewSummary;
    };

    @doc("サロンに紐づくレビュー一覧を取得し、並び替え条件に応じて顧客の声を提示します。")
    @summary("Get salon reviews")
    @get
    op getSalonReviews(
      @path salonId: SalonId,
      @query sortBy?: "recent" | "rating" | "helpful",
      ...PaginationParams,
    ): {
      @statusCode statusCode: 200;
      @body response: PaginationResponse<Review>;
    };
  }

  @doc("スタッフ単位でのレビューを把握し、個々の接客品質評価や育成につなげるAPI操作群です。")
  @route("/api/v1/staff/{staffId}/reviews")
  @tag("Reviews")
  namespace StaffReviewOperations {
    @doc("スタッフ別の平均評価やレビュー数を集計し、人事評価や表彰に用います。")
    @summary("Get staff reviews summary")
    @route("/summary")
    @get
    op getStaffSummary(@path staffId: StaffId): {
      @statusCode statusCode: 200;
      @body summary: ReviewSummary;
    };

    @doc("特定スタッフに紐づくレビュー一覧を取得し、個別フィードバックとして活用します。")
    @summary("Get staff reviews")
    @get
    op getStaffReviews(@path staffId: StaffId, ...PaginationParams): {
      @statusCode statusCode: 200;
      @body response: PaginationResponse<Review>;
    };
  }
}
