import type { AuthUser } from "@/types/auth";
import type { Permission } from "@/constants/permissions";
import { BASE_ACCESS_PERMISSIONS } from "@/constants/permissions";

/**
 * Check if user has the required permission based on role and custom claims.
 * Super-admins have all permissions. Admins and users checked against custom claims.
 * Users with any tool permission get base access (workspace:read, dashboard:read).
 */
export function hasPermission(user: AuthUser, required: Permission): boolean {
  const role = user.customClaims?.role as string | undefined;

  if (role === "super-admin") return true;

  const permissions = user.customClaims?.permissions as string[] | undefined;
  if (!permissions || !Array.isArray(permissions)) return false;

  if (permissions.includes(required)) return true;

  if (BASE_ACCESS_PERMISSIONS.includes(required) && permissions.length > 0) {
    return true;
  }

  return false;
}

/**
 * Check if user has any of the required permissions.
 */
export function hasAnyPermission(
  user: AuthUser,
  required: Permission[],
): boolean {
  return required.length === 0 || required.some((p) => hasPermission(user, p));
}

/**
 * Check if user has all required permissions.
 */
export function hasAllPermissions(
  user: AuthUser,
  required: Permission[],
): boolean {
  return required.every((p) => hasPermission(user, p));
}
