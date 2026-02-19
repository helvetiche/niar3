export interface AuthUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  customClaims?: Record<string, unknown>;
}

export type AuthResult =
  | { authenticated: true; user: AuthUser }
  | { authenticated: false; error: "no-token" | "invalid-token" | "expired" };
