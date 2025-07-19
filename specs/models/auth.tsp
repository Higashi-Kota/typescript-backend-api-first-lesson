import "@typespec/http";
import "@typespec/rest";
import "./common.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;

namespace BeautySalon.Models {
  @doc("User roles in the system")
  enum UserRole {
    @doc("Customer role - can book services")
    customer: "customer",
    
    @doc("Staff role - can manage their schedule and bookings")
    staff: "staff",
    
    @doc("Admin role - full system access")
    admin: "admin",
  }

  @doc("User account status")
  enum UserAccountStatus {
    @doc("Active account")
    active: "active",
    
    @doc("Email not verified")
    unverified: "unverified",
    
    @doc("Account locked due to failed login attempts")
    locked: "locked",
    
    @doc("Account suspended by admin")
    suspended: "suspended",
    
    @doc("Account deleted")
    deleted: "deleted",
  }

  @doc("Two-factor authentication status")
  enum TwoFactorStatus {
    @doc("2FA not enabled")
    disabled: "disabled",
    
    @doc("2FA setup in progress")
    pending: "pending",
    
    @doc("2FA enabled and active")
    enabled: "enabled",
  }

  @doc("User authentication information")
  model User {
    @key
    @doc("Unique identifier for the user")
    id: string;

    @doc("User's email address (unique)")
    email: string;

    @doc("User's display name")
    name: string;

    @doc("User's role in the system")
    role: UserRole;

    @doc("Account status")
    status: UserAccountStatus;

    @doc("Email verification status")
    emailVerified: boolean;

    @doc("Email verification token (internal use)")
    emailVerificationToken?: string;

    @doc("Email verification token expiry")
    emailVerificationTokenExpiry?: utcDateTime;

    @doc("Two-factor authentication status")
    twoFactorStatus: TwoFactorStatus;

    @doc("Two-factor authentication secret (encrypted)")
    twoFactorSecret?: string;

    @doc("Backup codes for 2FA recovery")
    backupCodes?: string[];

    @doc("Number of failed login attempts")
    failedLoginAttempts: int32 = 0;

    @doc("Time when the account was locked")
    lockedAt?: utcDateTime;

    @doc("Password reset token (internal use)")
    passwordResetToken?: string;

    @doc("Password reset token expiry")
    passwordResetTokenExpiry?: utcDateTime;

    @doc("Last password change timestamp")
    lastPasswordChangeAt?: utcDateTime;

    @doc("Previous password hashes for history check")
    passwordHistory?: string[];

    @doc("Trusted IP addresses for this user")
    trustedIpAddresses?: string[];

    @doc("Reference to customer profile if user is a customer")
    customerId?: string;

    @doc("Reference to staff profile if user is staff")
    staffId?: string;

    @doc("Timestamp when the user was created")
    createdAt: utcDateTime;

    @doc("Timestamp when the user was last updated")
    updatedAt: utcDateTime;

    @doc("Last login timestamp")
    lastLoginAt?: utcDateTime;

    @doc("Last login IP address")
    lastLoginIp?: string;
  }

  @doc("Session information")
  model Session {
    @key
    @doc("Unique session identifier")
    id: string;

    @doc("User ID associated with this session")
    userId: string;

    @doc("Refresh token for this session")
    refreshToken: string;

    @doc("IP address from which the session was created")
    ipAddress: string;

    @doc("User agent string")
    userAgent: string;

    @doc("Session expiry time")
    expiresAt: utcDateTime;

    @doc("Remember me flag")
    rememberMe: boolean = false;

    @doc("Session creation timestamp")
    createdAt: utcDateTime;

    @doc("Last activity timestamp")
    lastActivityAt: utcDateTime;
  }

  @doc("Login request")
  model LoginRequest {
    @doc("User's email address")
    email: string;

    @doc("User's password")
    password: string;

    @doc("Remember me flag for extended session")
    rememberMe?: boolean = false;

    @doc("Two-factor authentication code (if 2FA is enabled)")
    twoFactorCode?: string;
  }

  @doc("Login response")
  model LoginResponse {
    @doc("Access token for API requests")
    accessToken: string;

    @doc("Refresh token for obtaining new access tokens")
    refreshToken: string;

    @doc("Token type (always 'Bearer')")
    tokenType: string = "Bearer";

    @doc("Access token expiry in seconds")
    expiresIn: int32;

    @doc("Logged in user information")
    user: User;
  }

  @doc("Registration request")
  model RegisterRequest {
    @doc("User's email address")
    email: string;

    @doc("User's password (must meet security requirements)")
    password: string;

    @doc("User's display name")
    name: string;

    @doc("User's role (defaults to customer)")
    role?: UserRole = UserRole.customer;
  }

  @doc("Password reset request")
  model PasswordResetRequest {
    @doc("Email address of the account")
    email: string;
  }

  @doc("Password reset confirmation")
  model PasswordResetConfirmRequest {
    @doc("Password reset token from email")
    token: string;

    @doc("New password")
    newPassword: string;
  }

  @doc("Password change request")
  model PasswordChangeRequest {
    @doc("Current password for verification")
    currentPassword: string;

    @doc("New password")
    newPassword: string;
  }

  @doc("Email verification request")
  model EmailVerificationRequest {
    @doc("Email verification token")
    token: string;
  }

  @doc("Two-factor authentication enable request")
  model TwoFactorEnableRequest {
    @doc("Current password for verification")
    password: string;
  }

  @doc("Two-factor authentication setup response")
  model TwoFactorSetupResponse {
    @doc("QR code URL for authenticator app")
    qrCodeUrl: string;

    @doc("Manual entry secret")
    secret: string;

    @doc("Backup codes for recovery")
    backupCodes: string[];
  }

  @doc("Two-factor authentication verify request")
  model TwoFactorVerifyRequest {
    @doc("TOTP code from authenticator app")
    code: string;
  }

  @doc("Two-factor authentication disable request")
  model TwoFactorDisableRequest {
    @doc("Current password for verification")
    password: string;

    @doc("Current TOTP code for verification")
    code: string;
  }

  @doc("Token refresh request")
  model TokenRefreshRequest {
    @doc("Refresh token")
    refreshToken: string;
  }

  @doc("Session list response")
  model SessionListResponse {
    @doc("Active sessions")
    sessions: Session[];

    @doc("Total number of sessions")
    total: int32;
  }

  @doc("Generic auth success response")
  model AuthSuccessResponse {
    @doc("Success message")
    message: string;
  }
}