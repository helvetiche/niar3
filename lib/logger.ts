/**
 * Environment-aware logger with proper production handling.
 * In production: only error and warn (no console output, ready for external logging).
 * In development: all levels with console output.
 */
const isProduction = process.env.NODE_ENV === "production";
const isDevelopment = process.env.NODE_ENV === "development";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  timestamp: string;
  message: string;
  data?: unknown[];
}

/**
 * Format log entry for structured logging
 */
function formatLogEntry(level: LogLevel, args: unknown[]): LogEntry {
  return {
    level,
    timestamp: new Date().toISOString(),
    message: args.map((arg) => String(arg)).join(" "),
    data: args,
  };
}

/**
 * Send logs to external service in production (e.g., Sentry, Datadog)
 */
function sendToExternalLogger(entry: LogEntry): void {
  if (isProduction && (entry.level === "error" || entry.level === "warn")) {
    // Send to Sentry if available
    if (typeof window !== "undefined" && window.Sentry) {
      if (entry.level === "error") {
        window.Sentry.captureException(new Error(entry.message), {
          level: "error",
          extra: { data: entry.data },
        });
      } else {
        window.Sentry.captureMessage(entry.message, {
          level: "warning",
          extra: { data: entry.data },
        });
      }
    } else {
      // Fallback to structured console logging
       
      console[entry.level](JSON.stringify(entry));
    }
  }
}

// Extend Window interface for Sentry
declare global {
  interface Window {
    Sentry?: {
      captureException: (error: Error, context?: unknown) => void;
      captureMessage: (message: string, context?: unknown) => void;
    };
  }
}

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
       
      console.debug("[debug]", ...args);
    }
  },

  info: (...args: unknown[]) => {
    const entry = formatLogEntry("info", args);
    if (isDevelopment) {
       
      console.info("[info]", ...args);
    } else {
      sendToExternalLogger(entry);
    }
  },

  warn: (...args: unknown[]) => {
    const entry = formatLogEntry("warn", args);
    if (isDevelopment) {
       
      console.warn("[warn]", ...args);
    }
    sendToExternalLogger(entry);
  },

  error: (...args: unknown[]) => {
    const entry = formatLogEntry("error", args);
    if (isDevelopment) {
       
      console.error("[error]", ...args);
    }
    sendToExternalLogger(entry);
  },
};
