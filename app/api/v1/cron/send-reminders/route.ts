import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "@/lib/firebase-admin";
import { Schedule, ScheduleDeadline, ReminderDate } from "@/types/schedule";
import {
  calculateNextDeadline,
  calculateReminderDate,
  shouldSendReminder,
} from "@/lib/deadline-calculator";
import { sendReminderEmail } from "@/lib/email";
import {
  hasReminderBeenSent,
  markReminderAsSent,
  cleanupOldReminders,
} from "@/lib/reminder-tracker";
import { getCachedSchedules } from "@/lib/schedule-cache";

// Verify cron secret for authorization
// Supports both query parameter (?secret=xxx) and Authorization header
const verifyCronSecret = (request: NextRequest): boolean => {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("CRON_SECRET environment variable not set");
    return false;
  }

  // Method 1: Check query parameter (for external cron services like cronhub)
  const { searchParams } = new URL(request.url);
  const querySecret = searchParams.get("secret");

  if (querySecret && querySecret === cronSecret) {
    return true;
  }

  // Method 2: Check Authorization header (Bearer CRON_SECRET)
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;

  return token === cronSecret;
};

interface CronResult {
  checked: number;
  sent: number;
  skipped: number;
  errors: number;
  cleanedUp?: number; // Number of old markers deleted
  cacheHit: boolean; // Whether cache was used to optimize reads
  upcomingCount?: number; // Number of schedules in 3-min window
  details: Array<{
    scheduleId: string;
    title: string;
    status: "sent" | "skipped" | "error";
    reason?: string;
  }>;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const result: CronResult = {
    checked: 0,
    sent: 0,
    skipped: 0,
    errors: 0,
    cleanedUp: 0,
    cacheHit: false,
    details: [],
  };

  try {
    const db = getFirestore();
    // Work in UTC throughout - calculateNextDeadline will handle PH conversion internally
    const now = new Date();

    // OPTIMIZATION: Use cache to get all schedules (no Firestore reads!)
    const cachedSchedules = await getCachedSchedules();

    result.cacheHit = cachedSchedules.length > 0;
    console.log(`[CACHE] Loaded ${cachedSchedules.length} schedules from cache`);
    console.log(`[CACHE] Current UTC Time: ${now.toISOString()}`);

    // If no schedules in cache, run cleanup and return
    if (cachedSchedules.length === 0) {
      console.log("[INFO] No schedules in cache - needs sync");
      const cleanedCount = await cleanupOldReminders();
      result.cleanedUp = cleanedCount;

      return NextResponse.json({
        success: true,
        data: {
          ...result,
          duration: Date.now() - startTime,
          message: "No schedules in cache - please sync",
          optimization: {
            cacheUsed: false,
            schedulesChecked: 0,
            estimatedReadsSaved: 0,
            nextCheckIn: "1 minute",
          },
        },
      });
    }

    // Filter schedules with reminders in the next 5 minutes (calculate on the fly)
    const windowStart = new Date(now.getTime() - 2 * 60 * 1000); // 2 min before
    const windowEnd = new Date(now.getTime() + 3 * 60 * 1000); // 3 min ahead (total 5 min window)
    const schedulesToProcess: Schedule[] = [];

    console.log(
      `[WINDOW] Checking from ${windowStart.toISOString()} to ${windowEnd.toISOString()}`
    );
    console.log(`[WINDOW] Current time: ${now.toISOString()}`);

    const debugInfo: Array<{
      id: string;
      title: string;
      deadline?: ScheduleDeadline | string;
      reminderDate?: ReminderDate | string;
      calculated?: {
        nextDeadline: string;
        reminderTime: string;
        inWindow: boolean;
        minutesUntil: number;
      };
      error?: string;
    }> = [];

    for (const cached of cachedSchedules) {
      try {
        // Calculate next deadline and reminder time on the fly
        // Use a dummy createdAt since we don't have it in cache
        const dummyCreatedAt = new Date(2024, 0, 1).toISOString();
        const nextDeadline = calculateNextDeadline(
          cached.deadline as ScheduleDeadline,
          now,
          dummyCreatedAt
        );
        const reminderDate = calculateReminderDate(
          cached.reminderDate as ReminderDate,
          nextDeadline
        );

        const inWindow = reminderDate >= windowStart && reminderDate <= windowEnd;
        const minutesUntil = Math.round(
          (reminderDate.getTime() - now.getTime()) / 60000
        );

        const scheduleDebug = {
          id: cached.id,
          title: cached.title,
          deadline: cached.deadline as ScheduleDeadline,
          reminderDate: cached.reminderDate as ReminderDate,
          calculated: {
            nextDeadline: nextDeadline.toISOString(),
            reminderTime: reminderDate.toISOString(),
            inWindow,
            minutesUntil,
          },
        };

        debugInfo.push(scheduleDebug);

        console.log(`[SCHEDULE] ${cached.id} - ${cached.title}`);
        console.log(`  Deadline: ${nextDeadline.toISOString()}`);
        console.log(`  Reminder: ${reminderDate.toISOString()}`);
        console.log(`  Minutes until: ${minutesUntil}`);
        console.log(`  In window: ${inWindow}`);

        // Check if reminder is within window
        if (inWindow) {
          console.log(
            `[CACHE] Schedule in window: ${cached.id} - ${cached.title} at ${reminderDate.toISOString()}`
          );

          // Convert cached schedule to Schedule type
          schedulesToProcess.push({
            id: cached.id,
            userId: "", // Not needed for sending
            title: cached.title,
            description: cached.description,
            deadline: cached.deadline as ScheduleDeadline,
            reminderDate: cached.reminderDate as ReminderDate,
            personAssigned: cached.personAssigned,
            personEmail: cached.personEmail,
            status: cached.status as "active" | "inactive",
            createdAt: dummyCreatedAt,
            updatedAt: dummyCreatedAt,
          });
        }
      } catch (error) {
        console.error(`[CACHE] Error calculating reminder for ${cached.id}:`, error);
        debugInfo.push({
          id: cached.id,
          title: cached.title,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    result.checked = schedulesToProcess.length;
    result.upcomingCount = schedulesToProcess.length;

    console.log(
      `[OPTIMIZATION] Processing ${schedulesToProcess.length} schedules (saved ${cachedSchedules.length - schedulesToProcess.length} calculations)`
    );

    // If no schedules to process, run cleanup and return
    if (schedulesToProcess.length === 0) {
      console.log("[INFO] No schedules with reminders in window");
      const cleanedCount = await cleanupOldReminders();
      result.cleanedUp = cleanedCount;

      return NextResponse.json({
        success: true,
        data: {
          ...result,
          duration: Date.now() - startTime,
          message: "No reminders in window",
          currentTime: now.toISOString(),
          window: {
            start: windowStart.toISOString(),
            end: windowEnd.toISOString(),
          },
          debugInfo: debugInfo.slice(0, 5), // Show first 5 schedules for debugging
          optimization: {
            cacheUsed: true,
            schedulesChecked: 0,
            estimatedReadsSaved: cachedSchedules.length,
            nextCheckIn: "1 minute",
          },
        },
      });
    }

    // Process each schedule
    for (const schedule of schedulesToProcess) {
      try {
        // STEP 1: Calculate the next deadline (already calculated above, recalculate for accuracy)
        // Pass UTC - calculateNextDeadline converts to PH internally
        const nextDeadline = calculateNextDeadline(
          schedule.deadline,
          now,
          schedule.createdAt
        );

        // STEP 2: Calculate reminder time
        const reminderDate = calculateReminderDate(schedule.reminderDate, nextDeadline);

        // STEP 3: Check if we should send
        const shouldSend = shouldSendReminder(reminderDate, now);
        const timeDiffMinutes = Math.floor(
          (now.getTime() - reminderDate.getTime()) / 60000
        );

        console.log(`[SCHEDULE ${schedule.id}] "${schedule.title}"`);
        console.log(`  Next Deadline: ${nextDeadline.toISOString()}`);
        console.log(`  Reminder Time: ${reminderDate.toISOString()}`);
        console.log(`  Current Time: ${now.toISOString()}`);
        console.log(`  Time Diff: ${timeDiffMinutes} minutes`);
        console.log(`  Should Send: ${shouldSend}`);

        if (!shouldSend) {
          result.skipped++;
          result.details.push({
            scheduleId: schedule.id,
            title: schedule.title,
            status: "skipped",
            reason: `Not in window. Reminder: ${reminderDate.toISOString()}, Now: ${now.toISOString()}, Diff: ${timeDiffMinutes}m`,
          });
          continue;
        }

        // STEP 4: Check idempotency
        const granularity =
          schedule.deadline.type === "per-minute"
            ? "minute"
            : schedule.deadline.type === "hourly"
              ? "hour"
              : "day";

        const alreadySent = await hasReminderBeenSent(schedule.id, now, granularity);
        console.log(`  Already Sent (${granularity}): ${alreadySent}`);

        if (alreadySent) {
          result.skipped++;
          result.details.push({
            scheduleId: schedule.id,
            title: schedule.title,
            status: "skipped",
            reason: `Already sent (${granularity} granularity)`,
          });
          continue;
        }

        // STEP 5: Send email
        console.log(`  Sending email to: ${schedule.personEmail}`);
        const emailResult = await sendReminderEmail(schedule, nextDeadline);

        if (emailResult.success) {
          console.log(
            `  ✓ Email sent successfully (Message ID: ${emailResult.messageId})`
          );

          // STEP 6: Mark as sent
          await markReminderAsSent(
            schedule.id,
            now,
            {
              personEmail: schedule.personEmail,
              scheduleTitle: schedule.title,
              messageId: emailResult.messageId,
            },
            granularity
          );

          result.sent++;
          result.details.push({
            scheduleId: schedule.id,
            title: schedule.title,
            status: "sent",
            reason: `Sent to ${schedule.personEmail}. Deadline: ${nextDeadline.toISOString()}. Message ID: ${emailResult.messageId}`,
          });
        } else {
          console.log(`  ✗ Email failed: ${emailResult.error}`);
          result.errors++;
          result.details.push({
            scheduleId: schedule.id,
            title: schedule.title,
            status: "error",
            reason: emailResult.error,
          });
        }
      } catch (scheduleError) {
        result.errors++;
        result.details.push({
          scheduleId: schedule.id,
          title: schedule.title,
          status: "error",
          reason:
            scheduleError instanceof Error ? scheduleError.message : "Unknown error",
        });
      }
    }

    // Cleanup old reminder records (run occasionally)
    // Only run cleanup if there were no errors and at least one schedule was processed
    if (result.errors === 0 && result.checked > 0) {
      console.log("[CLEANUP] Running cleanup of old reminder markers...");
      const cleanedCount = await cleanupOldReminders();
      result.cleanedUp = cleanedCount;
      console.log(`[CLEANUP] Cleaned up ${cleanedCount} old reminder markers`);
    }

    // Log the cron run to cronLogs collection
    const endTime = Date.now();
    const lastLogSnapshot = await db
      .collection("cronLogs")
      .orderBy("timestamp", "desc")
      .limit(1)
      .get();

    let interval: number | null = null;
    if (!lastLogSnapshot.empty) {
      const lastLog = lastLogSnapshot.docs[0].data();
      const lastTimestamp =
        lastLog.timestamp?.toDate?.() || new Date(lastLog.timestamp);
      interval = endTime - lastTimestamp.getTime();
    }

    await db.collection("cronLogs").add({
      timestamp: new Date(),
      interval,
      checked: result.checked,
      sent: result.sent,
      skipped: result.skipped,
      errors: result.errors,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        duration: endTime - startTime,
        timestamp: now.toISOString(),
        optimization: {
          cacheUsed: result.cacheHit,
          upcomingInWindow: result.upcomingCount,
          totalCached: cachedSchedules.length,
          estimatedReadsSaved: cachedSchedules.length, // All schedules read from cache, not Firestore
        },
        summary: {
          totalSchedules: result.checked,
          emailsSent: result.sent,
          skippedNotInWindow: result.skipped,
          errors: result.errors,
          oldRemindersCleanedUp: result.cleanedUp,
        },
      },
    });
  } catch (error) {
    console.error("Cron job error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
