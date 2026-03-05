export type UserRole = "super-admin" | "admin" | "user";

export interface CustomClaims {
  role?: UserRole;
  permissions?: string[];
  [key: string]: unknown;
}

export interface AuthUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  customClaims?: CustomClaims;
}

export type AuthResult =
  | { authenticated: true; user: AuthUser }
  | { authenticated: false; error: "no-token" | "invalid-token" | "expired" };
