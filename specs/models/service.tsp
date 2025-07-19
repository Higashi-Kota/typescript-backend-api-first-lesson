import "@typespec/http";
import "./common.tsp";

using TypeSpec.Http;
using BeautySalon.Models;

namespace BeautySalon.Models {
  model Service {
    id: ServiceId;
    salonId: SalonId;
    name: string;
    description: string;
    duration: int32;
    price: int32;
    category: ServiceCategory;
    categoryId?: CategoryId;
    imageUrl?: string;
    requiredStaffLevel?: int32;
    isActive: boolean;
    ...AuditInfo;
  }

  model CreateServiceRequest {
    salonId: SalonId;
    name: string;
    description: string;
    duration: int32;
    price: int32;
    category: ServiceCategory;
    categoryId?: CategoryId;
    imageUrl?: string;
    requiredStaffLevel?: int32;
  }

  @doc("Service update request with optional fields for partial updates")
  model UpdateServiceRequest {
    name?: string;
    description?: string;
    duration?: int32;
    price?: int32;
    category?: ServiceCategory;
    categoryId?: CategoryId;
    imageUrl?: string;
    requiredStaffLevel?: int32;
    isActive?: boolean;
  }

  @doc("Service update request with reset capability")
  model UpdateServiceRequestWithReset {
    name?: string;
    description?: string;
    duration?: int32;
    price?: int32;
    category?: ServiceCategory;
    categoryId?: CategoryId | null;
    imageUrl?: string | null;
    requiredStaffLevel?: int32 | null;
    isActive?: boolean;
  }

  model ServiceCategoryModel {
    id: CategoryId;
    name: string;
    description: string;
    parentId?: CategoryId;
    displayOrder: int32;
    isActive: boolean;
    ...AuditInfo;
  }
}
