import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

/**
 * GET /api/v1/cron/test
 * Test endpoint to manually trigger the cron job
 *
 * This is useful for testing the cron job without waiting for the scheduled run.
 * It forwards the request to the actual cron endpoint with the secret.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated (admin only in production)
    await requireAuth();

    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json(
        {
          success: false,
          error: "CRON_SECRET not configured",
        },
        { status: 500 }
      );
    }

    // Get the base URL
    const baseUrl = request.nextUrl.origin;

    // Call the actual cron endpoint
    const cronUrl = `${baseUrl}/api/v1/cron/send-reminders?secret=${cronSecret}`;

    console.log("[TEST] Triggering cron job manually...");
    const response = await fetch(cronUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    return NextResponse.json({
      success: true,
      message: "Cron job triggered manually",
      cronResponse: data,
    });
  } catch (error) {
    console.error("Error testing cron job:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to test cron job",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
