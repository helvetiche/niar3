import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const SENTRY_ENVIRONMENT =
  process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV;

/**
 * Initializes Sentry for error monitoring and performance tracking.
 * Only initializes if SENTRY_DSN is configured in environment variables.
 */
export function initSentry() {
  if (!SENTRY_DSN) {
    console.warn("Sentry DSN not configured. Error monitoring disabled.");
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    tracesSampleRate: SENTRY_ENVIRONMENT === "production" ? 0.1 : 1.0,
    debug: SENTRY_ENVIRONMENT === "development",
    beforeSend(event, hint) {
      const error = hint.originalException;

      if (error && typeof error === "object" && "message" in error) {
        const message = String(error.message).toLowerCase();
        if (message.includes("network") || message.includes("fetch")) {
          return null;
        }
      }

      return event;
    },
  });
}

/**
 * Captures an exception and sends it to Sentry.
 * @param error - Error object to capture
 * @param context - Additional context for the error
 */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>,
) {
  if (!SENTRY_DSN) return;

  if (context) {
    Sentry.setContext("additional", context);
  }

  Sentry.captureException(error);
}

/**
 * Captures a message and sends it to Sentry.
 * @param message - Message to capture
 * @param level - Severity level
 */
export function captureMessage(
  message: string,
  level: "info" | "warning" | "error" = "info",
) {
  if (!SENTRY_DSN) return;
  Sentry.captureMessage(message, level);
}

/**
 * Sets user context for Sentry error tracking.
 * @param user - User information
 */
export function setUser(user: { id: string; email?: string; role?: string }) {
  if (!SENTRY_DSN) return;
  Sentry.setUser(user);
}

/**
 * Clears user context from Sentry.
 */
export function clearUser() {
  if (!SENTRY_DSN) return;
  Sentry.setUser(null);
}
