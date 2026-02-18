import { withApiRateLimit } from '@/lib/rate-limit/with-api-rate-limit'
import { withAuth } from '@/lib/auth'
import { secureJsonResponse } from '@/lib/security-headers'
import { PERMISSIONS } from '@/constants/permissions'
import { logAuditTrailEntry } from '@/lib/firebase-admin/audit-trail'

/**
 * Health check endpoint. Requires HEALTH_READ permission.
 * Rate limited via withApiRateLimit.
 */
export async function GET(request: Request) {
  const rateLimitResponse = await withApiRateLimit(request)
  if (rateLimitResponse) {
    await logAuditTrailEntry({
      action: 'health.get',
      status: 'rejected',
      route: '/api/v1/health',
      method: 'GET',
      request,
      httpStatus: rateLimitResponse.status,
      details: { reason: 'rate-limited' },
    })
    return rateLimitResponse
  }

  const auth = await withAuth(request, PERMISSIONS.HEALTH_READ)
  if (auth instanceof Response) {
    await logAuditTrailEntry({
      action: 'health.get',
      status: 'rejected',
      route: '/api/v1/health',
      method: 'GET',
      request,
      httpStatus: auth.status,
      details: { reason: 'auth-failed' },
    })
    return auth
  }

  await logAuditTrailEntry({
    uid: auth.user.uid,
    action: 'health.get',
    status: 'success',
    route: '/api/v1/health',
    method: 'GET',
    request,
    httpStatus: 200,
  })

  return secureJsonResponse({
    status: 'ok',
    timestamp: new Date().toISOString(),
    userId: auth.user.uid,
  })
}
