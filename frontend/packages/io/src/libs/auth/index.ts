export interface JWT {
  payload: JwtPayload
  toString(): string
}

export interface JwtPayload extends JsonObject {
  exp?: number
  iss?: string
  aud?: string | string[]
  nbf?: number
  iat?: number
  scope?: string
  jti?: string
  sub?: string
}

type JsonObject = Record<string, unknown>

export interface AuthTokens {
  idToken?: JWT
  accessToken: JWT
}

export interface AWSCredentials {
  accessKeyId: string
  secretAccessKey: string
  sessionToken?: string
  expiration?: Date
}

export interface AuthSession {
  tokens?: AuthTokens
  credentials?: AWSCredentials
  identityId?: string
  userSub?: string
}

export interface FetchAuthSessionOptions {
  forceRefresh?: boolean
}

export async function fetchAuthSession(
  _options?: FetchAuthSessionOptions,
): Promise<AuthSession> {
  // Skeleton implementation - returns mock session data
  const mockJWT: JWT = {
    payload: {
      sub: 'mock-user-id',
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      iat: Math.floor(Date.now() / 1000),
    },
    toString: () => 'mock-jwt-token',
  }

  return {
    tokens: {
      accessToken: mockJWT,
      idToken: mockJWT,
    },
    userSub: 'mock-user-id',
  }
}
