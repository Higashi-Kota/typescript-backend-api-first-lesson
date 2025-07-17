import "@typespec/http";
import "./common.tsp";

using TypeSpec.Http;
using BeautySalon.Models;

namespace BeautySalon.Models {
  model Staff {
    id: StaffId;
    salonId: SalonId;
    name: string;
    contactInfo: ContactInfo;
    specialties: string[];
    imageUrl?: string;
    bio?: string;
    yearsOfExperience?: int32;
    certifications?: string[];
    isActive: boolean;
    ...AuditInfo;
  }

  model CreateStaffRequest {
    salonId: SalonId;
    name: string;
    contactInfo: ContactInfo;
    specialties: string[];
    imageUrl?: string;
    bio?: string;
    yearsOfExperience?: int32;
    certifications?: string[];
  }

  @doc("Staff update request with optional fields for partial updates")
  model UpdateStaffRequest {
    name?: string;
    contactInfo?: ContactInfo;
    specialties?: string[];
    imageUrl?: string;
    bio?: string;
    yearsOfExperience?: int32;
    certifications?: string[];
    isActive?: boolean;
  }

  @doc("Staff update request with reset capability")
  model UpdateStaffRequestWithReset {
    name?: string;
    contactInfo?: ContactInfo;
    specialties?: string[];
    imageUrl?: string | null;
    bio?: string | null;
    yearsOfExperience?: int32 | null;
    certifications?: string[] | null;
    isActive?: boolean;
  }

  model StaffAvailability {
    staffId: StaffId;
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    breakStart?: string;
    breakEnd?: string;
  }
}