import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi3";
import "../models/staff.tsp";
import "../models/_shared/common.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.OpenAPI;
using BeautySalon.Models;

namespace BeautySalon.Operations {
  @doc("サロン所属スタッフのプロフィールや勤務情報を管理し、予約割当と勤怠把握を支えるAPI操作群です。")
  @route("/api/v1/salons/{salonId}/staff")
  @tag("Staff")
  namespace StaffOperations {
    @doc("サロンに所属するスタッフ一覧を取得し、配置状況や担当可能メニューを確認します。")
    @summary("List staff members")
    @get
    op list(@path salonId: SalonId, ...PaginationParams): {
      @statusCode statusCode: 200;
      @body response: PaginationResponse<Staff>;
    };

    @doc("新しいスタッフを登録し、プロフィール情報や担当メニューの設定を開始します。")
    @summary("Create staff member")
    @post
    op create(@path salonId: SalonId, @body staff: CreateStaffRequest): {
      @statusCode statusCode: 201;
      @header location: string;
      @body staff: Staff;
    } | {
      @statusCode statusCode: 400;
      @body error: Error;
    };

    @doc("特定スタッフの詳細情報を取得し、顧客向け表示や社内確認に利用します。")
    @summary("Get staff member")
    @get
    op get(@path salonId: SalonId, @path id: StaffId): {
      @statusCode statusCode: 200;
      @body staff: Staff;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    };

    @doc("スタッフのプロフィールや担当メニュー、表示可否を更新します。")
    @summary("Update staff member")
    @put
    op update(
      @path salonId: SalonId,
      @path id: StaffId,
      @body updates: UpdateStaffRequest,
    ): {
      @statusCode statusCode: 200;
      @body staff: Staff;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    } | {
      @statusCode statusCode: 400;
      @body error: Error;
    };

    @doc("退職や契約終了に伴いスタッフを削除し、予約導線から除外します。")
    @summary("Delete staff member")
    @delete
    op delete(@path salonId: SalonId, @path id: StaffId): {
      @statusCode statusCode: 204;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    };

    @doc("指定日のスタッフ空き状況を取得し、予約枠の提案や調整に活用します。")
    @summary("Get staff availability")
    @route("/{id}/availability")
    @get
    op getAvailability(
      @path salonId: SalonId,
      @path id: StaffId,
      @query date: plainDate,
    ): {
      @statusCode statusCode: 200;
      @body availability: StaffAvailability[];
    };

    @doc("スタッフの稼働予定を更新し、シフト変更や臨時休みを反映します。")
    @summary("Update staff availability")
    @route("/{id}/availability")
    @put
    op updateAvailability(
      @path salonId: SalonId,
      @path id: StaffId,
      @body availability: StaffAvailability[],
    ): {
      @statusCode statusCode: 200;
      @body availability: StaffAvailability[];
    } | {
      @statusCode statusCode: 400;
      @body error: Error;
    };
  }

  @doc("複数サロン横断でスタッフを検索し、指名予約やヘルプ要員の調整に用いるAPI操作群です。")
  @route("/api/v1/staff")
  @tag("Staff")
  namespace GlobalStaffOperations {
    @doc("専門分野や地域条件でスタッフを横断検索し、顧客の指名ニーズに応えます。")
    @summary("Search staff across all salons")
    @route("/search")
    @get
    op searchStaff(
      @query specialty?: string,
      @query city?: string,
      ...PaginationParams,
    ): {
      @statusCode statusCode: 200;
      @body response: PaginationResponse<Staff>;
    };
  }
}
