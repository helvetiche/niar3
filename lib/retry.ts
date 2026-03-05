import { logger } from "@/lib/logger";

export interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  maxDelayMs?: number;
  retryableErrors?: string[];
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
  maxDelayMs: 10000,
  retryableErrors: [
    "ECONNRESET",
    "ETIMEDOUT",
    "ENOTFOUND",
    "ECONNREFUSED",
    "quota",
    "rate limit",
    "429",
    "503",
    "temporarily unavailable",
  ],
};

function isRetryableError(error: unknown, retryableErrors: string[]): boolean {
  if (!error) return false;

  const errorString = error instanceof Error ? error.message : String(error);
  const lowerError = errorString.toLowerCase();

  return retryableErrors.some((pattern) =>
    lowerError.includes(pattern.toLowerCase()),
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * @param fn Function to retry
 * @param options Retry configuration
 * @returns Result of the function
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;
  let currentDelay = opts.delayMs;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === opts.maxAttempts) {
        logger.error(`All ${opts.maxAttempts} retry attempts failed`, error);
        throw error;
      }

      if (!isRetryableError(error, opts.retryableErrors)) {
        logger.warn("Non-retryable error encountered", error);
        throw error;
      }

      logger.warn(
        `Attempt ${attempt}/${opts.maxAttempts} failed, retrying in ${currentDelay}ms`,
        error,
      );

      await delay(currentDelay);
      currentDelay = Math.min(
        currentDelay * opts.backoffMultiplier,
        opts.maxDelayMs,
      );
    }
  }

  throw lastError;
}
