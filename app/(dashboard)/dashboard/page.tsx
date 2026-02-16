import { requirePermission } from '@/lib/auth'
import { PERMISSIONS } from '@/constants/permissions'

/**
 * Dashboard page. Requires DASHBOARD_READ permission.
 */
export default async function DashboardPage() {
  const user = await requirePermission(PERMISSIONS.DASHBOARD_READ)

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-zinc-600">
        Welcome, {user.email ?? user.uid}. You have dashboard access.
      </p>
    </div>
  )
}
