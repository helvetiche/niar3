import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { WidgetSidebarProvider } from "@/contexts/WidgetSidebarContext";
import { WorkspaceSidebar } from "@/components/WorkspaceSidebar";
import { WidgetSidebar } from "@/components/WidgetSidebar";
import { WorkspaceMobileFab } from "@/components/WorkspaceMobileFab";

/**
 * Workspace layout - requires WORKSPACE_READ permission.
 * Redirects to /login or /unauthorized if not authorized.
 */
export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requirePermission(PERMISSIONS.WORKSPACE_READ);
  return (
    <WorkspaceProvider user={user}>
      <WidgetSidebarProvider>
        <div
          className="flex min-h-[100dvh] flex-col bg-emerald-900 [--mobile-workspace-chrome:calc(4.75rem+env(safe-area-inset-top,0px))] lg:flex-row lg:items-start"
        >
          <WorkspaceSidebar user={user} />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-emerald-900">
            {children}
          </div>
          <WidgetSidebar />
          <WorkspaceMobileFab />
        </div>
      </WidgetSidebarProvider>
    </WorkspaceProvider>
  );
}
