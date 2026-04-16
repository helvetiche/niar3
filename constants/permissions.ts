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

  // Tools - these match the tool IDs in the workspace
  TOOL_TEMPLATE_MANAGER: "template-manager",
  TOOL_LIPA_SUMMARY: "lipa-summary",
  TOOL_MERGE_FILES: "merge-files",
  TOOL_ACCOMPLISHMENT_REPORT: "accomplishment-report",
  TOOL_IFR_SCANNER: "ifr-scanner",
  TOOL_CONSOLIDATE_LAND_PROFILES: "consolidate-land-profiles",
  TOOL_IFR_CHECKER: "ifr-checker",
  TOOL_ACCOUNTS: "accounts",
  TOOL_INVENTORY: "inventory",
  TOOL_TASK_MANAGER: "task-manager",
  TOOL_COMPOSE_EMAIL: "compose-email",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Base permissions required for any authenticated user to access the app.
 * Must be included when creating/updating accounts via Account Manager.
 */
export const BASE_ACCESS_PERMISSIONS: Permission[] = [
  PERMISSIONS.WORKSPACE_READ,
  PERMISSIONS.DASHBOARD_READ,
];
