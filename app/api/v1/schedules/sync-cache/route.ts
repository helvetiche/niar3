import { NextRequest, NextResponse } from "next/server";
import { syncScheduleCache } from "@/lib/schedule-cache";
import { requireAuth } from "@/lib/auth";

/**
 * POST /api/v1/schedules/sync-cache
 * Rebuild the schedule cache for optimized cron job performance
 *
 * This endpoint syncs all active schedules to the cache, which dramatically
 * reduces Firestore reads during cron job execution.
 *
 * Can be called with CRON_SECRET for automated syncing without auth.
 */
export async function POST(request: NextRequest) {
  try {
    // Allow sync with CRON_SECRET (for automated syncing) or auth token
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");
    const cronSecret = process.env.CRON_SECRET;

    if (secret && cronSecret && secret === cronSecret) {
      // Authorized via secret
      console.log("[SYNC] Authorized via CRON_SECRET");
    } else {
      // Require authentication
      await requireAuth();
    }

    // Sync the cache
    const result = await syncScheduleCache();

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Unable to synchronize schedule cache",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        reminderCount: result.count,
        syncedAt: new Date().toISOString(),
        message: `Successfully synced ${result.count} schedules to cache`,
      },
    });
  } catch (error) {
    console.error("Error syncing schedule cache:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to sync cache",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
