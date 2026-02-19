import type { AuthUser } from "@/types/auth";
import type { Permission } from "@/constants/permissions";

/**
 * Check if user has the required permission based on role and custom claims.
 * Super-admins have all permissions. Admins and users checked against custom claims.
 */
export function hasPermission(user: AuthUser, required: Permission): boolean {
  const role = user.customClaims?.role as string | undefined;

  if (role === "super-admin") return true;

  const permissions = user.customClaims?.permissions as string[] | undefined;
  if (!permissions || !Array.isArray(permissions)) return false;

  return permissions.includes(required);
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
