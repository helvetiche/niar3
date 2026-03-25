import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import {
  RATE_LIMIT_API_REQUESTS,
  RATE_LIMIT_API_WINDOW_SECONDS,
  RATE_LIMIT_AUTH_REQUESTS,
  RATE_LIMIT_AUTH_WINDOW_SECONDS,
  RATE_LIMIT_PUBLIC_REQUESTS,
  RATE_LIMIT_PUBLIC_WINDOW_SECONDS,
  RATE_LIMIT_HEAVY_REQUESTS,
  RATE_LIMIT_HEAVY_WINDOW_SECONDS,
} from "@/constants/config";

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
    : null;

/**
 * General API rate limit
 */
export const apiRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        RATE_LIMIT_API_REQUESTS,
        `${RATE_LIMIT_API_WINDOW_SECONDS} s`,
      ),
      analytics: true,
      prefix: "rl:api",
    })
  : null;

/**
 * Stricter limit for auth endpoints
 */
export const authRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        RATE_LIMIT_AUTH_REQUESTS,
        `${RATE_LIMIT_AUTH_WINDOW_SECONDS} s`,
      ),
      analytics: true,
      prefix: "rl:auth",
    })
  : null;

/**
 * Lenient limit for public pages
 */
export const publicRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        RATE_LIMIT_PUBLIC_REQUESTS,
        `${RATE_LIMIT_PUBLIC_WINDOW_SECONDS} s`,
      ),
      analytics: true,
      prefix: "rl:public",
    })
  : null;

/**
 * Stricter limit for heavy operations (merge, generate-profiles, lipa-summary).
 */
export const heavyOperationRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        RATE_LIMIT_HEAVY_REQUESTS,
        `${RATE_LIMIT_HEAVY_WINDOW_SECONDS} s`,
      ),
      analytics: true,
      prefix: "rl:heavy",
    })
  : null;

/**
 * Returns a stable identifier for rate limiting.
 * Trusts x-forwarded-for / x-real-ip set by the reverse proxy (e.g. Vercel).
 * In production behind a proxy, the platform overwrites client-set headers.
 * Sanitizes output to prevent Redis key injection (max 64 chars, alphanumeric + dots/hyphens).
 */
export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const raw = forwarded?.split(",")[0]?.trim() ?? realIp?.trim() ?? "anonymous";
  const sanitized = raw.replace(/[^a-zA-Z0-9.:\-]/g, "").slice(0, 64);
  return sanitized || "anonymous";
}

export function isRateLimitEnabled(): boolean {
  return redis !== null && process.env.NODE_ENV === "production";
}
