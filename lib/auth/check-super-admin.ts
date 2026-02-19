import "server-only";
import type { AuthUser } from "@/types/auth";

export function isSuperAdmin(user: AuthUser): boolean {
  return user.customClaims?.role === "super-admin";
}
