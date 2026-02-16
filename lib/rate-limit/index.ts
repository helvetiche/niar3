import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

/**
 * Distributed rate limiting with Upstash Redis.
 * Use in proxy.ts, API routes, and Server Actions.
 */

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null

/**
 * General API rate limit: 10 requests per 10 seconds per identifier.
 */
export const apiRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '10 s'),
      analytics: true,
      prefix: 'rl:api',
    })
  : null

/**
 * Stricter limit for auth endpoints: 5 attempts per minute.
 */
export const authRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 m'),
      analytics: true,
      prefix: 'rl:auth',
    })
  : null

/**
 * Lenient limit for public pages: 30 req/min per IP.
 */
export const publicRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, '1 m'),
      analytics: true,
      prefix: 'rl:public',
    })
  : null

export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0]?.trim() ?? realIp ?? 'anonymous'
  return ip
}

export function isRateLimitEnabled(): boolean {
  return redis !== null
}
