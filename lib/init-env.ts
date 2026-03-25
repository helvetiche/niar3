/**
 * Initialize and validate environment variables at application startup
 * This file should be imported at the top of your entry point
 */

import { validateEnv } from "./env-validation";

// Validate environment variables on module load
// This ensures the app fails fast if configuration is invalid
if (typeof window === "undefined") {
  // Only validate on server-side
  try {
    validateEnv();
  } catch (error) {
    // Error is already logged in validateEnv
    // Exit the process to prevent running with invalid config
    process.exit(1);
  }
}

export { validateEnv, getEnv, hasEnv } from "./env-validation";
