"use client";

import { useWorkspaceUser } from "@/contexts/WorkspaceContext";
import { ShieldCheckIcon } from "@phosphor-icons/react";

export function UserRoleDebug() {
  const user = useWorkspaceUser();
  const role = user.customClaims?.role ?? "user";

  return (
    <div className="rounded-lg border border-white/10 bg-emerald-900/30 p-4">
      <div className="flex items-center gap-3">
        <ShieldCheckIcon size={24} weight="duotone" className="text-white" />
        <div>
          <p className="text-sm font-medium text-white">Current Role</p>
          <p className="text-xs text-white/70">
            {role === "super-admin" ? (
              <span className="text-rose-300">Super Admin</span>
            ) : role === "admin" ? (
              <span className="text-amber-300">Admin</span>
            ) : (
              <span className="text-emerald-300">User</span>
            )}
          </p>
        </div>
      </div>
      {role !== "super-admin" && (
        <p className="mt-2 text-xs text-white/60">
          Log out and log back in to refresh your session if your role was
          recently updated.
        </p>
      )}
    </div>
  );
}
