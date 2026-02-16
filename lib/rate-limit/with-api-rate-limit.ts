import { NextResponse } from 'next/server'
import { applySecurityHeaders } from '@/lib/security-headers'
import { apiRateLimit, getClientIdentifier, isRateLimitEnabled } from './index'

/**
 * Use in API Route Handlers to enforce rate limiting.
 * Returns 429 response if rate limit exceeded; otherwise call next().
 *
 * @example
 * export async function GET(request: Request) {
 *   const rateLimitResponse = await withApiRateLimit(request)
 *   if (rateLimitResponse) return rateLimitResponse
 *   // ... handle request
 * }
 */
export async function withApiRateLimit(
  request: Request
): Promise<NextResponse | null> {
  if (!isRateLimitEnabled() || !apiRateLimit) {
    return null
  }
  const identifier = getClientIdentifier(request)
  const { success, reset } = await apiRateLimit.limit(identifier)
  if (!success) {
    const response = NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
        },
      }
    )
    return applySecurityHeaders(response)
  }
  return null
}
