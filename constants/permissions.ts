/**
 * Permission constants. Format: "resource:action"
 * Used for semantic labeling. All authenticated users have access.
 */
export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_READ: "dashboard:read",
  DASHBOARD_WRITE: "dashboard:write",

  // Workspace
  WORKSPACE_READ: "workspace:read",
  WORKSPACE_WRITE: "workspace:write",

  // Users (admin)
  USERS_READ: "users:read",
  USERS_WRITE: "users:write",
  USERS_DELETE: "users:delete",

  // Settings
  SETTINGS_READ: "settings:read",
  SETTINGS_WRITE: "settings:write",

  // Health / monitoring (internal)
  HEALTH_READ: "health:read",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
