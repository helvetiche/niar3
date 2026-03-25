/**
 * Next.js Instrumentation Hook
 * Runs once when the server starts (before any requests are handled)
 * Perfect for environment validation and initialization
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Server-side initialization
    const { validateEnv } = await import("./lib/env-validation");

    try {
      validateEnv();
       
      console.log("✅ Environment variables validated successfully");
    } catch {
       
      console.error("❌ Failed to start: Invalid environment configuration");
      process.exit(1);
    }
  }
}
