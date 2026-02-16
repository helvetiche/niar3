import 'server-only'
import { NextResponse } from 'next/server'
import { getSession } from './get-session'
import { hasPermission } from './has-permission'
import { applySecurityHeaders } from '@/lib/security-headers'
import type { AuthUser } from '@/types/auth'
import type { Permission } from '@/constants/permissions'

/**
 * For API Route Handlers. Require auth and optionally permission.
 * Returns 401/403 with security headers if not authorized.
 *
 * @example
 * export async function GET(request: Request) {
 *   const auth = await withAuth(request, PERMISSIONS.DASHBOARD_READ)
 *   if (auth instanceof NextResponse) return auth
 *   const { user } = auth
 *   // ... handle request
 * }
 */
export async function withAuth(
  _request: Request,
  permission?: Permission
): Promise<
  | { user: AuthUser }
  | NextResponse
> {
  const result = await getSession()

  if (!result.user) {
    const response = NextResponse.json(
      { error: 'Unauthorized', code: result.error },
      { status: 401 }
    )
    return applySecurityHeaders(response)
  }

  if (permission && !hasPermission(result.user, permission)) {
    const response = NextResponse.json(
      { error: 'Forbidden', message: 'Insufficient permissions' },
      { status: 403 }
    )
    return applySecurityHeaders(response)
  }

  return { user: result.user }
}
