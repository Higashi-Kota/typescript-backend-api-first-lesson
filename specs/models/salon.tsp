import "@typespec/http";
import "./common.tsp";
import "./api-patterns.tsp";

using TypeSpec.Http;
using BeautySalon.Models;

namespace BeautySalon.Models {
  model Salon {
    id: SalonId;
    name: string;
    description: string;
    address: Address;
    contactInfo: ContactInfo;
    openingHours: OpeningHours[];
    imageUrls: string[] | null;
    features: string[] | null;
    ...AuditInfo;
  }

  @doc("Salon creation request with required keys and nullable values")
  model CreateSalonRequest {
    // Required fields
    name: string;

    description: string;
    address: Address;
    contactInfo: ContactInfo;
    openingHours: OpeningHours[];

    // Required keys with nullable values
    imageUrls: string[] | null;

    features: string[] | null;
  }

  @doc("Salon update request with optional fields for partial updates")
  model UpdateSalonRequest {
    name?: string;
    description?: string;
    address?: Address;
    contactInfo?: ContactInfo;
    openingHours?: OpeningHours[];
    imageUrls?: string[];
    features?: string[];
  }

  @doc("Salon update request with reset capability")
  model UpdateSalonRequestWithReset {
    name?: string;
    description?: string;
    address?: Address;
    contactInfo?: ContactInfo;
    openingHours?: OpeningHours[];
    imageUrls?: string[] | null;
    features?: string[] | null;
  }

  model SalonSummary {
    id: SalonId;
    name: string;
    address: Address;
    rating: float32 | null;
    reviewCount: int32 | null;
  }

  @doc("Salon search parameters - all fields are optional")
  model SearchSalonRequest {
    @query keyword?: string;
    @query city?: string;
    @query category?: ServiceCategory;
  }
}
