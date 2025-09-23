import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi3";
import "../models/service.tsp";
import "../models/_shared/common.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.OpenAPI;
using BeautySalon.Models;

namespace BeautySalon.Operations {
  @doc("各サロンが提供する施術メニューを管理し、価格や所要時間などの情報を一元化するAPI操作群です。")
  @route("/api/v1/salons/{salonId}/services")
  @tag("Services")
  namespace ServiceOperations {
    @doc("サロン内の提供メニューをカテゴリ別に一覧し、予約画面や在庫管理との連携に活用します。")
    @summary("List salon services")
    @get
    op list(
      @path salonId: SalonId,
      @query category?:
        | "cut"
        | "color"
        | "perm"
        | "treatment"
        | "spa"
        | "other",
      ...PaginationParams,
    ): {
      @statusCode statusCode: 200;
      @body response: PaginationResponse<Service>;
    };

    @doc("新しい施術メニューを登録し、価格・施術時間・提供条件を設定します。")
    @summary("Create service")
    @post
    op create(@path salonId: SalonId, @body service: CreateServiceRequest): {
      @statusCode statusCode: 201;
      @header location: string;
      @body service: Service;
    } | {
      @statusCode statusCode: 400;
      @body error: Error;
    };

    @doc("特定メニューの詳細情報を取得し、予約システムやスタッフ教育に必要な内容を確認します。")
    @summary("Get service")
    @get
    op get(@path salonId: SalonId, @path id: ServiceId): {
      @statusCode statusCode: 200;
      @body service: Service;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    };

    @doc("既存メニューの内容を更新し、料金改定や提供条件の変更に対応します。")
    @summary("Update service")
    @put
    op update(
      @path salonId: SalonId,
      @path id: ServiceId,
      @body updates: UpdateServiceRequest,
    ): {
      @statusCode statusCode: 200;
      @body service: Service;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    } | {
      @statusCode statusCode: 400;
      @body error: Error;
    };

    @doc("提供終了となったメニューを削除し、予約導線から除外します。")
    @summary("Delete service")
    @delete
    op delete(@path salonId: SalonId, @path id: ServiceId): {
      @statusCode statusCode: 204;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    };

    @doc("複数メニューの共通項目を一括更新し、季節キャンペーンや価格調整を効率化します。")
    @summary("Bulk update services")
    @route("/bulk")
    @patch(#{ implicitOptionality: true })
    op bulkUpdate(
      @path salonId: SalonId,
      @body updates: {
        serviceIds: ServiceId[];
        updates: UpdateServiceRequest;
      },
    ): {
      @statusCode statusCode: 200;
      @body response: {
        updated: ServiceId[];
        failed: {
          serviceId: ServiceId;
          error: string;
        }[];
      };
    };
  }

  @doc("施術メニューのカテゴリ体系を整備し、顧客が選びやすい構造を提供するAPI操作群です。")
  @route("/api/v1/service-categories")
  @tag("Services")
  namespace CategoryOperations {
    @doc("登録済みのカテゴリ一覧を取得し、メニュー分類や表示順を管理します。")
    @summary("List service categories")
    @get
    op listCategories(...PaginationParams): {
      @statusCode statusCode: 200;
      @body response: PaginationResponse<CategoryModel>;
    };

    @doc("新しい施術カテゴリを作成し、階層構造や表示順を定義します。")
    @summary("Create service category")
    @post
    op createCategory(
      @body category: {
        name: string;
        description: string;
        parentId?: CategoryId;
        displayOrder: int32;
      },
    ): {
      @statusCode statusCode: 201;
      @body category: CategoryModel;
    } | {
      @statusCode statusCode: 400;
      @body error: Error;
    };

    @doc("既存カテゴリを更新し、名称や表示順、親子関係を調整します。")
    @summary("Update service category")
    @put
    op updateCategory(
      @path id: CategoryId,
      @body updates: {
        name?: string;
        description?: string;
        parentId?: CategoryId;
        displayOrder?: int32;
        isActive?: boolean;
      },
    ): {
      @statusCode statusCode: 200;
      @body category: CategoryModel;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    };

    @doc("利用されなくなったカテゴリを削除し、メニュー構成を整理します。")
    @summary("Delete service category")
    @delete
    op deleteCategory(@path id: CategoryId): {
      @statusCode statusCode: 204;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    } | {
      @statusCode statusCode: 409;
      @body error: Error;
    };
  }
}
