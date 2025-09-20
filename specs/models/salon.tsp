import "@typespec/http";
import "./common.tsp";

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
    businessHours?: BusinessHours[];
    imageUrls?: string[];
    features?: string[];
    ...AuditInfo;
  }

  @doc("Salon creation request with required and optional fields")
  model CreateSalonRequest {
    // Required fields
    name: string;

    description: string;
    address: Address;
    contactInfo: ContactInfo;
    openingHours: OpeningHours[];
    businessHours?: BusinessHours[];

    // Optional fields
    imageUrls?: string[];

    features?: string[];
  }

  @doc("Salon update request with optional fields for partial updates")
  model UpdateSalonRequest {
    name?: string;
    description?: string;
    address?: Address;
    contactInfo?: ContactInfo;
    openingHours?: OpeningHours[];
    businessHours?: BusinessHours[];
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
    businessHours?: BusinessHours[] | null;
    imageUrls?: string[] | null;
    features?: string[] | null;
  }

  model SalonSummary {
    id: SalonId;
    name: string;
    address: Address;
    rating?: float32;
    reviewCount?: int32;
  }

  @doc("Salon search parameters - all fields are optional")
  model SearchSalonRequest {
    @query keyword?: string;
    @query city?: string;
    @query category?: "cut" | "color" | "perm" | "treatment" | "spa" | "other";
  }
}
