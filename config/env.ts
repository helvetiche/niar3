import { z } from 'zod'

/**
 * Server-side env validation. Fails fast at startup if required vars are missing.
 * Client-safe vars use NEXT_PUBLIC_ prefix and are validated separately.
 */
const serverSchema = z.object({
  // Upstash Redis (required for production rate limiting; optional in dev)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Firebase Admin (optional in dev, required in prod)
  FIREBASE_ADMIN_PROJECT_ID: z.string().optional(),
  FIREBASE_ADMIN_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_ADMIN_PRIVATE_KEY: z.string().optional(),
})

/**
 * Client-safe env vars (exposed to browser).
 */
const clientSchema = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().optional(),
})

function validateServerEnv() {
  const parsed = serverSchema.safeParse(process.env)
  if (!parsed.success) {
    console.error('❌ Invalid server environment variables:')
    console.error(parsed.error.flatten().fieldErrors)
    throw new Error('Invalid server environment variables')
  }
  return parsed.data
}

function validateClientEnv() {
  const parsed = clientSchema.safeParse({
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  })
  if (!parsed.success) {
    console.error('❌ Invalid client environment variables:')
    console.error(parsed.error.flatten().fieldErrors)
    throw new Error('Invalid client environment variables')
  }
  return parsed.data
}

export type ServerEnv = z.infer<typeof serverSchema>
export type ClientEnv = z.infer<typeof clientSchema>

let cachedServer: ServerEnv | null = null
let cachedClient: ClientEnv | null = null

export function getServerEnv(): ServerEnv {
  if (!cachedServer) {
    cachedServer = validateServerEnv()
  }
  return cachedServer
}

export function getClientEnv(): ClientEnv {
  if (!cachedClient) {
    cachedClient = validateClientEnv()
  }
  return cachedClient
}
