import { NextResponse } from "next/server";
import { getCacheStatus } from "@/lib/schedule-cache";
import { requireAuth } from "@/lib/auth";

/**
 * GET /api/v1/schedules/cache-status
 * Get the current status of the schedule cache
 *
 * Returns information about when the cache was last synced and how many
 * schedules are currently cached.
 */
export async function GET() {
  try {
    // Verify user is authenticated
    await requireAuth();

    // Get cache status
    const status = await getCacheStatus();

    if (!status.exists) {
      return NextResponse.json({
        success: true,
        data: {
          exists: false,
          message: "Cache not initialized. Please sync the cache.",
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        exists: true,
        lastSynced: status.lastSynced?.toISOString(),
        scheduleCount: status.scheduleCount,
        reminderCount: status.reminderCount,
        message: "Cache is active and ready",
      },
    });
  } catch (error) {
    console.error("Error getting cache status:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to get cache status",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
