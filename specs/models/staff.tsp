import "@typespec/http";
import "./common.tsp";

using TypeSpec.Http;
using BeautySalon.Models;

namespace BeautySalon.Models {
  model StaffSchedule {
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    breakTime?: TimeSlot[];
    effectivePeriod?: DateRange;
  }

  model StaffQualification {
    name: string;
    certificationDate: plainDate;
    expiryDate?: plainDate;
    issuer?: string;
    credentialId?: string;
  }

  model StaffPermission {
    resource: string;
    actions: string[];
    scope?: string;
    expiresAt?: utcDateTime;
  }

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
    qualifications?: StaffQualification[];
    schedules?: StaffSchedule[];
    isActive: boolean;
    permissions?: StaffPermission[];
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
    qualifications?: StaffQualification[];
    schedules?: StaffSchedule[];
    permissions?: StaffPermission[];
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
    qualifications?: StaffQualification[];
    schedules?: StaffSchedule[];
    permissions?: StaffPermission[];
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
    qualifications?: StaffQualification[] | null;
    schedules?: StaffSchedule[] | null;
    permissions?: StaffPermission[] | null;
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
