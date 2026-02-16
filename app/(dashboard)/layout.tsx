import { requirePermission } from '@/lib/auth'
import { PERMISSIONS } from '@/constants/permissions'

/**
 * Dashboard layout - requires DASHBOARD_READ permission.
 * Redirects to /login or /unauthorized if not authorized.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requirePermission(PERMISSIONS.DASHBOARD_READ)
  return <main>{children}</main>
}
