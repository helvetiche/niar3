import { requirePermission } from '@/lib/auth'
import { PERMISSIONS } from '@/constants/permissions'
import { WorkspaceSidebar } from '@/components/WorkspaceSidebar'

/**
 * Workspace layout - requires WORKSPACE_READ permission.
 * Redirects to /login or /unauthorized if not authorized.
 */
export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requirePermission(PERMISSIONS.WORKSPACE_READ)
  return (
    <div className="flex min-h-screen">
      <WorkspaceSidebar user={user} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
