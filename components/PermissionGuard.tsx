"use client";

import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import type { WorkspaceTab } from "@/contexts/WorkspaceContext";

interface PermissionGuardProps {
  toolId: WorkspaceTab;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGuard({
  toolId,
  children,
  fallback,
}: PermissionGuardProps) {
  const { user } = useWorkspaceContext();

  // Hub is always accessible
  if (toolId === "hub") {
    return <>{children}</>;
  }

  const isSuperAdmin = user.customClaims?.role === "super-admin";
  
  // Super admins have access to everything
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  const userPermissions = user.customClaims?.permissions || [];

  // Check if user has permission for this tool
  const hasPermission = userPermissions.includes(toolId);

  if (!hasPermission) {
    return (
      <>
        {fallback || (
          <div className="flex h-full w-full items-center justify-center rounded-2xl border border-rose-700/60 bg-rose-900/20 p-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-white">
                Access Denied
              </h2>
              <p className="mt-2 text-sm text-white/70">
                You don't have permission to access this tool.
              </p>
              <p className="mt-1 text-xs text-white/50">
                Contact your administrator if you need access.
              </p>
            </div>
          </div>
        )}
      </>
    );
  }

  return <>{children}</>;
}
