import "@typespec/http";
import "@typespec/rest";
import "../models/common.tsp";
import "../models/permission.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using BeautySalon.Models;

namespace BeautySalon.Operations {
  @route("/roles")
  @tag("Roles & Permissions")
  interface RoleOperations {
    @doc("List all roles")
    @get
    listRoles(
      @query isSystem?: boolean,
      @query isActive?: boolean,
      ...PaginationParams,
    ): Result<PaginationResponse<Role>>;

    @doc("Get role by ID")
    @get
    @route("/{id}")
    getRole(@path id: RoleId): Result<Role>;

    @doc("Create new role")
    @post
    createRole(@body role: RoleCreateInput): Result<Role>;

    @doc("Update role")
    @patch(#{ implicitOptionality: true })
    @route("/{id}")
    updateRole(@path id: RoleId, @body updates: RoleUpdateInput): Result<Role>;

    @doc("Delete role")
    @delete
    @route("/{id}")
    deleteRole(@path id: RoleId): Result<{}>;

    @doc("Get system roles")
    @get
    @route("/system")
    getSystemRoles(): Result<Role[]>;

    @doc("Clone role")
    @post
    @route("/{id}/clone")
    cloneRole(
      @path id: RoleId,
      @body request: {
        name: string;
        displayName: string;
      },
    ): Result<Role>;
  }

  @route("/permissions")
  @tag("Permissions")
  interface PermissionOperations {
    @doc("List all permissions")
    @get
    listPermissions(
      @query resource?: string,
      @query action?: string,
    ): Result<Permission[]>;

    @doc("Get permissions by resource")
    @get
    @route("/by-resource/{resource}")
    getPermissionsByResource(@path resource: string): Result<Permission[]>;

    @doc("Get permission groups")
    @get
    @route("/groups")
    getPermissionGroups(): Result<Array<{
      resource: string;
      permissions: Permission[];
    }>>;
  }

  @route("/user-roles")
  @tag("User Roles")
  interface UserRoleTypeOperations {
    @doc("Get user roles")
    @get
    @route("/user/{userId}")
    getUserRoleTypes(
      @path userId: string,
      @query salonId?: SalonId,
    ): Result<UserRoleType[]>;

    @doc("Assign role to user")
    @post
    assignUserRoleType(
      @body assignment: UserRoleAssignInput,
    ): Result<UserRoleType>;

    @doc("Revoke user role")
    @delete
    @route("/user/{userId}/role/{roleId}")
    revokeUserRoleType(
      @path userId: string,
      @path roleId: RoleId,
      @query salonId?: SalonId,
    ): Result<{}>;

    @doc("Update user role")
    @patch(#{ implicitOptionality: true })
    @route("/user/{userId}/role/{roleId}")
    updateUserRoleType(
      @path userId: string,
      @path roleId: RoleId,
      @body updates: {
        expiresAt?: utcDateTime;
        isActive?: boolean;
      },
    ): Result<UserRoleType>;

    @doc("Get users by role")
    @get
    @route("/role/{roleId}/users")
    getUsersByRole(
      @path roleId: RoleId,
      @query salonId?: SalonId,
      ...PaginationParams,
    ): Result<PaginationResponse<{
      userId: string;
      userName?: string;
      assignedAt: utcDateTime;
      expiresAt?: utcDateTime;
    }>>;

    @doc("Bulk assign roles")
    @post
    @route("/bulk-assign")
    bulkAssignRoles(
      @body request: {
        userIds: string[];
        roleIds: RoleId[];
        salonId?: SalonId;
      },
    ): Result<{
      assigned: int32;
      failed: int32;
      errors?: string[];
    }>;
  }

  @route("/access-control")
  @tag("Access Control")
  interface AccessControlOperations {
    @doc("Check user access")
    @post
    @route("/check")
    checkAccess(@body check: AccessCheck): Result<AccessResult>;

    @doc("Check multiple permissions")
    @post
    @route("/check-permissions")
    checkPermissions(
      @body check: PermissionCheckInput,
    ): Result<PermissionCheckResult>;

    @doc("Get user effective permissions")
    @get
    @route("/user/{userId}/permissions")
    getUserPermissions(@path userId: string, @query salonId?: SalonId): Result<{
      userId: string;
      permissions: string[];
      roles: Array<{
        roleId: RoleId;
        roleName: string;
        permissions: string[];
      }>;
    }>;

    @doc("Get resource access list")
    @get
    @route("/resource/{resource}/access")
    getResourceAccess(
      @path resource: string,
      @query action?: string,
      @query salonId?: SalonId,
    ): Result<Array<{
      userId: string;
      userName?: string;
      hasAccess: boolean;
      grantedBy: string[];
    }>>;

    @doc("Validate role permissions")
    @post
    @route("/validate")
    validatePermissions(
      @body request: {
        roleId: RoleId;
        requiredPermissions: string[];
      },
    ): Result<{
      isValid: boolean;
      missingPermissions: string[];
      extraPermissions: string[];
    }>;
  }
}
