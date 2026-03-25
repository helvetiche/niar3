/**
 * Centralized error handling utilities
 */

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
  ) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * Safe async wrapper for fire-and-forget operations
 * Logs errors without throwing
 */
export function safeAsync(
  fn: () => Promise<void>,
  context: string = "async operation",
): void {
  fn().catch((error) => {
    // Use a proper logger instead of console.error
    if (process.env.NODE_ENV === "development") {
       
      console.error(`[${context}] Unhandled error:`, error);
    }
    // In production, this should send to external logging service
  });
}

/**
 * Sanitize error messages for client consumption
 * Removes sensitive details like paths, stack traces, tokens
 */
export function sanitizeErrorForClient(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }

  if (error instanceof Error) {
    const message = error.message;
    // Check for specific error patterns
    if (message.includes("ENOENT")) {
      return "Resource not found";
    }
    if (message.includes("not found")) {
      return "Resource not found";
    }
    if (message.includes("EACCES") || message.includes("permission")) {
      return "Permission denied";
    }
    if (message.includes("ETIMEDOUT") || message.includes("timeout")) {
      return "Request timed out";
    }
    // Return generic message for other errors
    return "An error occurred";
  }

  return "An unexpected error occurred";
}

/**
 * Type-safe error response builder
 */
export function createErrorResponse(
  code: string,
  message: string,
  statusCode: number = 500,
) {
  return {
    error: {
      code,
      message: sanitizeErrorForClient(new Error(message)),
    },
    statusCode,
  };
}
