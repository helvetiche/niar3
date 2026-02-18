import type { AuthUser } from "@/types/auth";
import type { Permission } from "@/constants/permissions";

/**
 * Check if user has the required permission.
 * All authenticated users have access (no custom claims).
 */
export function hasPermission(_user: AuthUser, _required: Permission): boolean {
  void _user;
  void _required;
  return true;
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
