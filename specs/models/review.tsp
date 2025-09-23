import "@typespec/http";
import "./common.tsp";

using TypeSpec.Http;
using BeautySalon.Models;

namespace BeautySalon.Models {
  @doc("""
    レビューモデル - 施術後の顧客体験を定量・定性的に記録し、サロン品質の改善と信頼性向上に活用する
    """)
  model Review {
    @doc("レビューを一意に識別するID")
    id: ReviewId;

    @doc("レビュー対象のサロンID")
    salonId: SalonId;

    @doc("レビューを投稿した顧客ID")
    customerId: CustomerId;

    @doc("紐づく来店予約を示すID (DBカラム booking_id と整合)")
    bookingId: BookingId;

    @doc("評価対象のスタッフID。スタッフ未指定レビューの場合は省略")
    staffId?: StaffId;

    @doc("全体満足度の評価値 (例: 1〜5)")
    overallRating: int32;

    @doc("自由記述のレビューコメント")
    comment?: string;

    @doc("レビュータイトルや要約")
    title?: string;

    @doc("施術サービスそのものに対する評価値")
    serviceRating?: int32;

    @doc("スタッフの接客・技術に対する評価値")
    staffRating?: int32;

    @doc("店内の清潔さ・衛生面に対する評価値")
    cleanlinessRating?: int32;

    @doc("価格に対する価値・コストパフォーマンス評価値")
    valueRating?: int32;

    @doc("レビューに添付された画像URLの一覧")
    imageUrls?: string[];

    @doc("実来店が確認済みかを表す検証フラグ")
    isVerified: boolean;

    @doc("レビューが「参考になった」と評価された累積回数")
    helpfulCount: int32 = 0;

    @doc("不適切報告が入った累積回数")
    reportCount: int32 = 0;

    @doc("サロン運営からの公式返信本文")
    ownerResponse?: string;

    @doc("運営が返信した日時 (UTC)")
    ownerRespondedAt?: utcDateTime;

    ...AuditInfo;
  }

  @doc("""
    レビュー作成リクエスト - 顧客が新規レビュー投稿時に入力する評価情報と任意コメント・画像を受け取る
    """)
  model CreateReviewRequest {
    @doc("レビュー対象のサロンID")
    salonId: SalonId;

    @doc("レビュー投稿者の顧客ID")
    customerId: CustomerId;

    @doc("紐づく来店予約ID (booking_id)")
    bookingId: BookingId;

    @doc("評価対象スタッフのID")
    staffId?: StaffId;

    @doc("全体満足度の評価値")
    overallRating: int32;

    @doc("自由記述のコメント")
    comment?: string;

    @doc("レビュータイトル")
    title?: string;

    @doc("サービス品質に対する評価値")
    serviceRating?: int32;

    @doc("スタッフ対応に対する評価値")
    staffRating?: int32;

    @doc("清潔さ・衛生状態に対する評価値")
    cleanlinessRating?: int32;

    @doc("価格に見合う価値の評価値")
    valueRating?: int32;

    @doc("添付画像のURL一覧")
    imageUrls?: string[];
  }

  @doc("""
    レビュー更新リクエスト - 任意項目を部分更新し、既存レビューの評価やコメントを調整する
    """)
  model UpdateReviewRequest {
    @doc("更新後の全体満足度評価")
    overallRating?: int32;

    @doc("更新後のコメント本文")
    comment?: string;

    @doc("更新後のレビュータイトル")
    title?: string;

    @doc("更新後のサービス品質評価")
    serviceRating?: int32;

    @doc("更新後のスタッフ評価")
    staffRating?: int32;

    @doc("更新後の清潔さ評価")
    cleanlinessRating?: int32;

    @doc("更新後の価格価値評価")
    valueRating?: int32;

    @doc("画像URL一覧の更新内容")
    imageUrls?: string[];
  }

  @doc("""
    リセット対応レビュー更新リクエスト - null指定でコメントや画像を初期化しながらレビューを再設定できる
    """)
  model UpdateReviewRequestWithReset {
    @doc("更新後の全体満足度評価")
    overallRating?: int32;

    @doc("null指定も可能なコメント本文")
    comment?: string | null;

    @doc("null指定も可能なレビュータイトル")
    title?: string | null;

    @doc("null指定も可能なサービス品質評価")
    serviceRating?: int32 | null;

    @doc("null指定も可能なスタッフ評価")
    staffRating?: int32 | null;

    @doc("null指定も可能な清潔さ評価")
    cleanlinessRating?: int32 | null;

    @doc("null指定も可能な価格価値評価")
    valueRating?: int32 | null;

    @doc("null指定も可能な画像URL一覧")
    imageUrls?: string[] | null;
  }

  @doc("""
    レビュー集計モデル - 平均評価や件数分布を保持し、ダッシュボードやランキング表示に活用する
    """)
  model ReviewSummary {
    @doc("全体平均評価 (小数)")
    averageRating: float32;

    @doc("レビュー総件数")
    totalReviews: int32;

    @doc("評価値ごとのレビュー件数分布")
    ratingDistribution: Record<int32>;
  }
}
