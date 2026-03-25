import { z } from "zod";

/**
 * Environment variable validation schema
 * Validates required environment variables at application startup
 */

const envSchema = z.object({
  // Node environment
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Firebase Admin SDK (required for backend)
  FIREBASE_PROJECT_ID: z.string().min(1, "Firebase Project ID is required"),
  FIREBASE_CLIENT_EMAIL: z.string().email("Invalid Firebase client email"),
  FIREBASE_PRIVATE_KEY: z.string().min(1, "Firebase private key is required"),

  // Firebase Client SDK (optional, for client-side)
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().optional(),

  // Upstash Redis (for rate limiting)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Sentry (optional, for error monitoring)
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),

  // Google Generative AI (optional)
  GEMINI_API_KEY: z.string().optional(),

  // Application URLs
  NEXT_PUBLIC_APP_URL: z.string().url().default("https://niatools.vercel.app"),

  // Feature flags
  ENABLE_RATE_LIMITING: z
    .string()
    .optional()
    .default("true")
    .transform((val) => val === "true"),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validated environment variables
 * Throws an error if validation fails
 */
let validatedEnv: Env | null = null;

export function validateEnv(): Env {
  if (validatedEnv) {
    return validatedEnv;
  }

  try {
    validatedEnv = envSchema.parse(process.env);
    return validatedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues
        .map((err: z.ZodIssue) => `${err.path.join(".")}: ${err.message}`)
        .join("\n");

      // eslint-disable-next-line no-console
      console.error("❌ Environment validation failed:\n", errorMessage);
      throw new Error(
        `Invalid environment variables. Please check your .env file.\n${errorMessage}`,
      );
    }
    throw error;
  }
}

/**
 * Get validated environment variables
 * Safe to use after validateEnv() has been called
 */
export function getEnv(): Env {
  if (!validatedEnv) {
    throw new Error(
      "Environment variables not validated. Call validateEnv() first.",
    );
  }
  return validatedEnv;
}

/**
 * Check if a specific environment variable is set
 */
export function hasEnv(key: keyof Env): boolean {
  const env = getEnv();
  return env[key] !== undefined && env[key] !== "";
}
