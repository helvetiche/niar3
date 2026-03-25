/**
 * Async utilities for safe error handling in React components
 */

/**
 * Wrapper for async operations in useEffect
 * Prevents "Can't perform a React state update on an unmounted component" warnings
 */
export function createAsyncEffect<T>(
  asyncFn: () => Promise<T>,
  onSuccess: (result: T) => void,
  onError?: (error: unknown) => void,
): () => void {
  let cancelled = false;

  asyncFn()
    .then((result) => {
      if (!cancelled) {
        onSuccess(result);
      }
    })
    .catch((error) => {
      if (!cancelled) {
        if (onError) {
          onError(error);
        } else if (process.env.NODE_ENV === "development") {
          // eslint-disable-next-line no-console
          console.error("Async effect error:", error);
        }
      }
    });

  return () => {
    cancelled = true;
  };
}

/**
 * Type-safe async handler for event handlers
 * Catches errors and logs them without throwing
 */
export async function handleAsync(
  fn: () => Promise<void>,
  onError?: (error: unknown) => void,
): Promise<void> {
  try {
    await fn();
  } catch (error) {
    if (onError) {
      onError(error);
    } else if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error("Async handler error:", error);
    }
  }
}

/**
 * Wrapper for async operations that should be fire-and-forget
 * but still log errors in development
 */
export function fireAndForget(fn: () => Promise<void>, context?: string): void {
  fn().catch((error) => {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error(`[${context || "fire-and-forget"}] Error:`, error);
    }
  });
}
