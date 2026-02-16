import { withApiRateLimit } from '@/lib/rate-limit/with-api-rate-limit'
import { withAuth } from '@/lib/auth'
import { secureJsonResponse } from '@/lib/security-headers'
import { PERMISSIONS } from '@/constants/permissions'

/**
 * Health check endpoint. Requires HEALTH_READ permission.
 * Rate limited via withApiRateLimit.
 */
export async function GET(request: Request) {
  const rateLimitResponse = await withApiRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  const auth = await withAuth(request, PERMISSIONS.HEALTH_READ)
  if (auth instanceof Response) return auth

  return secureJsonResponse({
    status: 'ok',
    timestamp: new Date().toISOString(),
    userId: auth.user.uid,
  })
}
