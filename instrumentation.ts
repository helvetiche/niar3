/**
 * Runs once when the Next.js server starts.
 * Validates env early so the process fails fast on invalid config.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getServerEnv } = await import("@/config/env");
    getServerEnv();
  }
}
