import 'server-only'
import { redirect } from 'next/navigation'
import { getSession } from './get-session'
import { hasPermission } from './has-permission'
import type { AuthUser } from '@/types/auth'
import type { Permission } from '@/constants/permissions'

/**
 * Require authenticated user with specific permission.
 * Redirects to /login if not authenticated, /unauthorized if lacking permission.
 */
export async function requirePermission(permission: Permission): Promise<AuthUser> {
  const result = await getSession()
  if (!result.user) {
    redirect('/?login=1')
  }
  if (!hasPermission(result.user, permission)) {
    redirect('/unauthorized')
  }
  return result.user
}
