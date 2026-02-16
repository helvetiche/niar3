import { NextResponse } from 'next/server'
import { applySecurityHeaders } from '@/lib/security-headers'
import { authRateLimit, getClientIdentifier, isRateLimitEnabled } from './index'

/**
 * Use on auth endpoints (login, signup, forgot-password) for stricter limits.
 * 5 attempts per minute per IP.
 *
 * @example
 * export async function POST(request: Request) {
 *   const rateLimitResponse = await withAuthRateLimit(request)
 *   if (rateLimitResponse) return rateLimitResponse
 *   // ... handle auth
 * }
 */
export async function withAuthRateLimit(
  request: Request
): Promise<NextResponse | null> {
  if (!isRateLimitEnabled() || !authRateLimit) {
    return null
  }
  const identifier = getClientIdentifier(request)
  const { success, reset } = await authRateLimit.limit(identifier)
  if (!success) {
    const response = NextResponse.json(
      { error: 'Too many authentication attempts. Try again later.' },
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
