/**
 * Environment-aware logger.
 * In production: only error (and warn for audit trail) to reduce noise.
 * In development: all levels.
 */
const isProduction = process.env.NODE_ENV === "production";

export const logger = {
  debug: (...args: unknown[]) => {
    if (!isProduction) console.debug("[debug]", ...args);
  },

  info: (...args: unknown[]) => {
    if (!isProduction) console.info("[info]", ...args);
  },

  warn: (...args: unknown[]) => {
    console.warn("[warn]", ...args);
  },

  error: (...args: unknown[]) => {
    console.error("[error]", ...args);
  },
};
