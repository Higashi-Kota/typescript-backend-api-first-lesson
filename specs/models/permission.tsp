import "@typespec/http";
import "./common.tsp";

using TypeSpec.Http;

namespace BeautySalon.Models {
  @doc("Role definition for access control")
  model Role {
    id: RoleId;

    @doc("Role name")
    name: string;

    @doc("Role display name")
    displayName: string;

    @doc("Role description")
    description?: string;

    @doc("Permissions assigned to this role")
    permissions: Permission[];

    @doc("Is this a system role")
    isSystem: boolean;

    @doc("Is role active")
    isActive: boolean;

    ...AuditInfo;
  }

  @doc("Permission definition")
  model Permission {
    id: PermissionId;

    @doc("Permission key (e.g., 'booking.create')")
    key: string;

    @doc("Permission name")
    name: string;

    @doc("Permission description")
    description?: string;

    @doc("Resource type")
    resource: string;

    @doc("Action type")
    action: string;

    @doc("Scope (own, salon, all)")
    scope?: "own" | "salon" | "all";
  }

  @doc("User role assignment")
  model UserRoleAssignment {
    userId: string; // Can be StaffId or CustomerId
    roleId: RoleId;
    salonId?: SalonId; // For salon-specific roles

    @doc("Assignment date")
    assignedAt: utcDateTime;

    @doc("Assigned by")
    assignedBy: string;

    @doc("Expiration date")
    expiresAt?: utcDateTime;

    @doc("Is active")
    isActive: boolean;
  }

  @doc("Access control check")
  model AccessCheck {
    userId: string;
    resource: string;
    action: string;
    salonId?: SalonId;
    resourceId?: string;
  }

  @doc("Access control result")
  model AccessResult {
    allowed: boolean;
    reason?: string;
    requiredPermissions?: string[];
    userPermissions?: string[];
  }

  // Predefined system roles
  enum SystemRoleType {
    super_admin, // Full system access
    salon_owner, // Full salon access
    salon_manager, // Salon management
    senior_staff, // Senior stylist/therapist
    staff, // Regular staff
    receptionist, // Front desk operations
    customer, // Customer self-service
    guest, // Limited guest access
  }

  // Input/Output models
  model RoleCreateInput {
    name: string;
    displayName: string;
    description?: string;
    permissions: PermissionId[];
  }

  model RoleUpdateInput {
    displayName?: string;
    description?: string;
    permissions?: PermissionId[];
    isActive?: boolean;
  }

  model UserRoleAssignInput {
    userId: string;
    roleId: RoleId;
    salonId?: SalonId;
    expiresAt?: utcDateTime;
  }

  model PermissionCheckInput {
    userId: string;
    permissions: string[];
    salonId?: SalonId;
  }

  model PermissionCheckResult {
    userId: string;
    permissions: PermissionStatus[];
  }

  model PermissionStatus {
    permission: string;
    granted: boolean;
    source?: string; // Which role granted this permission
  }
}
