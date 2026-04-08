import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/constants/permissions";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { WidgetSidebarProvider } from "@/contexts/WidgetSidebarContext";
import { WorkspaceSidebar } from "@/components/WorkspaceSidebar";
import { WidgetSidebar } from "@/components/WidgetSidebar";

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
        <div className="flex bg-emerald-900 min-h-screen">
          <WorkspaceSidebar user={user} />
          <div className="bg-emerald-900 flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
          <WidgetSidebar />
        </div>
      </WidgetSidebarProvider>
    </WorkspaceProvider>
  );
}
