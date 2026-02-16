/**
 * API Route auth pattern.
 *
 * Every API route must use withAuth from @/lib/auth.
 *
 * @example Require specific permission
 * import { withAuth } from '@/lib/auth'
 * import { PERMISSIONS } from '@/constants/permissions'
 *
 * export async function GET(request: Request) {
 *   const auth = await withAuth(request, PERMISSIONS.USERS_READ)
 *   if (auth instanceof Response) return auth
 *   const { user } = auth
 *   // ... handle request
 * }
 *
 * @example Require auth only (any logged-in user)
 * const auth = await withAuth(request)
 */
