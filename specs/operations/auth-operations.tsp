import "@typespec/http";
import "@typespec/rest";
import "../models/auth.tsp";
import "../models/_shared/common.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using BeautySalon.Models;

namespace BeautySalon.Operations {
  @route("/api/v1/auth")
  @tag("Authentication")
  namespace AuthOperations {
    @doc("Register a new user account")
    @post
    @route("/register")
    @useAuth(NoAuth)
    op register(@body request: AuthRegisterRequest): {
      @statusCode statusCode: 201;
      @body response: User;
    } | {
      @statusCode statusCode: 409;
      @body error: Error;
    } | {
      @statusCode statusCode: 400;
      @body error: Error;
    };

    @doc("Login with email and password")
    @post
    @route("/login")
    @useAuth(NoAuth)
    op login(@body request: AuthLoginRequest):
      | {
          @statusCode statusCode: 200;
          @body response: AuthLoginResponse;
        }
      | {
          @statusCode statusCode: 401;
          @body error: Error;
        }
      | {
          @statusCode statusCode: 423;
          @body error: Error;
        }
      | {
          @statusCode statusCode: 403;
          @body error: Error;
        }
      | {
          @statusCode statusCode: 400;
          @body error: Error;
        };

    @doc("Refresh access token")
    @post
    @route("/refresh")
    @useAuth(NoAuth)
    op refreshToken(@body request: AuthTokenRefreshRequest): {
      @statusCode statusCode: 200;
      @body response: AuthLoginResponse;
    } | {
      @statusCode statusCode: 401;
      @body error: Error;
    };

    @doc("Logout and invalidate session")
    @post
    @route("/logout")
    op logout(@header("Authorization") authorization: string): {
      @statusCode statusCode: 200;
      @body response: AuthSuccessResponse;
    } | {
      @statusCode statusCode: 401;
      @body error: Error;
    };

    @doc("Get current user information")
    @get
    @route("/me")
    op getCurrentUser(@header("Authorization") authorization: string): {
      @statusCode statusCode: 200;
      @body response: User;
    } | {
      @statusCode statusCode: 401;
      @body error: Error;
    };

    @doc("Request password reset")
    @post
    @route("/forgot-password")
    @useAuth(NoAuth)
    op forgotPassword(@body request: AuthPasswordResetRequest): {
      @statusCode statusCode: 200;
      @body response: AuthSuccessResponse;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    } | {
      @statusCode statusCode: 429;
      @body error: Error;
    };

    @doc("Verify password reset token")
    @get
    @route("/reset-password/verify")
    @useAuth(NoAuth)
    op verifyResetToken(@query token: string): {
      @statusCode statusCode: 200;
      @body response: AuthSuccessResponse;
    } | {
      @statusCode statusCode: 400;
      @body error: Error;
    };

    @doc("Reset password with token")
    @post
    @route("/reset-password")
    @useAuth(NoAuth)
    op resetPassword(@body request: AuthPasswordResetConfirmRequest):
      | {
          @statusCode statusCode: 200;
          @body response: AuthSuccessResponse;
        }
      | {
          @statusCode statusCode: 400;
          @body error: Error;
        }
      | {
          @statusCode statusCode: 400;
          @body error: Error;
        }
      | {
          @statusCode statusCode: 400;
          @body error: Error;
        };

    @doc("Send email verification")
    @post
    @route("/verify-email/send")
    op sendEmailVerification(@header("Authorization") authorization: string):
      | {
          @statusCode statusCode: 200;
          @body response: AuthSuccessResponse;
        }
      | {
          @statusCode statusCode: 401;
          @body error: Error;
        }
      | {
          @statusCode statusCode: 400;
          @body error: Error;
        }
      | {
          @statusCode statusCode: 429;
          @body error: Error;
        };

    @doc("Confirm email verification")
    @post
    @route("/verify-email/confirm")
    @useAuth(NoAuth)
    op confirmEmailVerification(@body request: AuthEmailVerificationRequest): {
      @statusCode statusCode: 200;
      @body response: AuthSuccessResponse;
    } | {
      @statusCode statusCode: 400;
      @body error: Error;
    };

    @doc("Change password")
    @post
    @route("/change-password")
    op changePassword(
      @header("Authorization") authorization: string,
      @body request: AuthPasswordChangeRequest,
    ):
      | {
          @statusCode statusCode: 200;
          @body response: AuthSuccessResponse;
        }
      | {
          @statusCode statusCode: 401;
          @body error: Error;
        }
      | {
          @statusCode statusCode: 400;
          @body error: Error;
        }
      | {
          @statusCode statusCode: 400;
          @body error: Error;
        }
      | {
          @statusCode statusCode: 400;
          @body error: Error;
        };

    @doc("Enable two-factor authentication")
    @post
    @route("/2fa/enable")
    op enableTwoFactor(
      @header("Authorization") authorization: string,
      @body request: AuthTwoFactorEnableRequest,
    ):
      | {
          @statusCode statusCode: 200;
          @body response: AuthTwoFactorSetupResponse;
        }
      | {
          @statusCode statusCode: 401;
          @body error: Error;
        }
      | {
          @statusCode statusCode: 400;
          @body error: Error;
        }
      | {
          @statusCode statusCode: 400;
          @body error: Error;
        };

    @doc("Get QR code for 2FA setup")
    @get
    @route("/2fa/qr-code")
    op getTwoFactorQRCode(@header("Authorization") authorization: string): {
      @statusCode statusCode: 200;
      @body response: AuthTwoFactorSetupResponse;
    } | {
      @statusCode statusCode: 401;
      @body error: Error;
    } | {
      @statusCode statusCode: 400;
      @body error: Error;
    };

    @doc("Verify two-factor authentication code")
    @post
    @route("/2fa/verify")
    op verifyTwoFactor(
      @header("Authorization") authorization: string,
      @body request: AuthTwoFactorVerifyRequest,
    ):
      | {
          @statusCode statusCode: 200;
          @body response: AuthSuccessResponse;
        }
      | {
          @statusCode statusCode: 401;
          @body error: Error;
        }
      | {
          @statusCode statusCode: 400;
          @body error: Error;
        }
      | {
          @statusCode statusCode: 400;
          @body error: Error;
        };

    @doc("Disable two-factor authentication")
    @post
    @route("/2fa/disable")
    op disableTwoFactor(
      @header("Authorization") authorization: string,
      @body request: AuthTwoFactorDisableRequest,
    ):
      | {
          @statusCode statusCode: 200;
          @body response: AuthSuccessResponse;
        }
      | {
          @statusCode statusCode: 401;
          @body error: Error;
        }
      | {
          @statusCode statusCode: 400;
          @body error: Error;
        }
      | {
          @statusCode statusCode: 400;
          @body error: Error;
        }
      | {
          @statusCode statusCode: 400;
          @body error: Error;
        };

    @doc("Generate new backup codes for 2FA")
    @post
    @route("/2fa/backup-codes")
    op generateBackupCodes(
      @header("Authorization") authorization: string,
      @body request: AuthTwoFactorVerifyRequest,
    ):
      | {
          @statusCode statusCode: 200;
          @body response: {
            backupCodes: string[];
          };
        }
      | {
          @statusCode statusCode: 401;
          @body error: Error;
        }
      | {
          @statusCode statusCode: 400;
          @body error: Error;
        }
      | {
          @statusCode statusCode: 400;
          @body error: Error;
        };

    @doc("Get active sessions")
    @get
    @route("/sessions")
    op getSessions(@header("Authorization") authorization: string): {
      @statusCode statusCode: 200;
      @body response: AuthSessionListResponse;
    } | {
      @statusCode statusCode: 401;
      @body error: Error;
    };

    @doc("Revoke a specific session")
    @delete
    @route("/sessions/{sessionId}")
    op revokeSession(
      @header("Authorization") authorization: string,
      @path sessionId: string,
    ): {
      @statusCode statusCode: 200;
      @body response: AuthSuccessResponse;
    } | {
      @statusCode statusCode: 401;
      @body error: Error;
    } | {
      @statusCode statusCode: 404;
      @body error: Error;
    };

    @doc("Logout from all sessions")
    @post
    @route("/logout-all")
    op logoutAll(@header("Authorization") authorization: string): {
      @statusCode statusCode: 200;
      @body response: AuthSuccessResponse;
    } | {
      @statusCode statusCode: 401;
      @body error: Error;
    };
  }

  @route("/api/v1/admin/auth")
  @tag("Admin - Authentication")
  namespace AdminAuthOperations {
    @doc("Unlock a locked user account")
    @post
    @route("/unlock/{userId}")
    op unlockAccount(
      @header("Authorization") authorization: string,
      @path userId: string,
    ):
      | {
          @statusCode statusCode: 200;
          @body response: AuthSuccessResponse;
        }
      | {
          @statusCode statusCode: 401;
          @body error: Error;
        }
      | {
          @statusCode statusCode: 403;
          @body error: Error;
        }
      | {
          @statusCode statusCode: 404;
          @body error: Error;
        }
      | {
          @statusCode statusCode: 400;
          @body error: Error;
        };

    @doc("Add trusted IP address for a user")
    @post
    @route("/trusted-ip/{userId}")
    op addTrustedIp(
      @header("Authorization") authorization: string,
      @path userId: string,
      @body request: {
        ipAddress: string;
      },
    ):
      | {
          @statusCode statusCode: 200;
          @body response: AuthSuccessResponse;
        }
      | {
          @statusCode statusCode: 401;
          @body error: Error;
        }
      | {
          @statusCode statusCode: 403;
          @body error: Error;
        }
      | {
          @statusCode statusCode: 404;
          @body error: Error;
        }
      | {
          @statusCode statusCode: 400;
          @body error: Error;
        };

    @doc("Remove trusted IP address for a user")
    @delete
    @route("/trusted-ip/{userId}")
    op removeTrustedIp(
      @header("Authorization") authorization: string,
      @path userId: string,
      @query ipAddress: string,
    ):
      | {
          @statusCode statusCode: 200;
          @body response: AuthSuccessResponse;
        }
      | {
          @statusCode statusCode: 401;
          @body error: Error;
        }
      | {
          @statusCode statusCode: 403;
          @body error: Error;
        }
      | {
          @statusCode statusCode: 404;
          @body error: Error;
        };
  }
}
