import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi3";
import "../models/service.tsp";
import "../models/common.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.OpenAPI;
using BeautySalon.Models;

namespace BeautySalon.Operations {
  @route("/salons/{salonId}/services")
  @tag("Services")
  namespace ServiceOperations {
    @summary("List salon services")
    @get
    op list(
      @path salonId: SalonId,
      @query category?: ServiceCategory,
      ...PaginationParams,
    ): {
      @statusCode statusCode: 200;
      @body response: PaginationResponse<Service>;
    };

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

    @summary("Get service")
    @get
    op get(@path salonId: SalonId, @path id: ServiceId): {
      @statusCode statusCode: 200;
      @body service: Service;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    };

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

    @summary("Delete service")
    @delete
    op delete(@path salonId: SalonId, @path id: ServiceId): {
      @statusCode statusCode: 204;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    };

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

  @route("/service-categories")
  @tag("Services")
  namespace ServiceCategoryOperations {
    @summary("List service categories")
    @get
    op listCategories(...PaginationParams): {
      @statusCode statusCode: 200;
      @body response: PaginationResponse<ServiceCategoryModel>;
    };

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
      @body category: ServiceCategoryModel;
    } | {
      @statusCode statusCode: 400;
      @body error: Error;
    };

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
      @body category: ServiceCategoryModel;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    };

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
