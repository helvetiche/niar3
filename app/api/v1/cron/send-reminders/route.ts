import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "@/lib/firebase-admin";
import type { Schedule } from "@/types/schedule";
import { calculateNextDeadline, calculateReminderDate } from "@/lib/schedule-helpers";
import { sendScheduleReminder } from "@/lib/email";

// Verify cron secret for authorization
const verifyCronSecret = (request: NextRequest): boolean => {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("CRON_SECRET environment variable not set");
    return false;
  }

  // Check query parameter
  const { searchParams } = new URL(request.url);
  const querySecret = searchParams.get("secret");
  
  if (querySecret && querySecret === cronSecret) {
    return true;
  }

  // Check Authorization header
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") 
    ? authHeader.slice(7) 
    : authHeader;

  return token === cronSecret;
};

interface CronResult {
  checked: number;
  sent: number;
  skipped: number;
  errors: number;
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
    details: [],
  };

  try {
    const db = getFirestore();
    const now = new Date();

    // Get all active schedules
    const schedulesSnapshot = await db
      .collection("schedules")
      .where("status", "==", "active")
      .get();

    const schedules: Schedule[] = schedulesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Schedule[];

    console.log(`[CRON] Found ${schedules.length} active schedules`);

    // Check each schedule
    for (const schedule of schedules) {
      result.checked++;

      try {
        // Calculate next deadline
        const nextDeadline = calculateNextDeadline(
          schedule.deadline,
          now,
          schedule.createdAt
        );

        // Calculate reminder time
        const reminderDate = calculateReminderDate(
          schedule.reminderDate,
          nextDeadline
        );

        // Check if reminder should be sent (within 5 minute window)
        const timeDiff = reminderDate.getTime() - now.getTime();
        const minutesDiff = Math.floor(timeDiff / 60000);

        console.log(`[SCHEDULE ${schedule.id}] "${schedule.title}"`);
        console.log(`  Next Deadline: ${nextDeadline.toISOString()}`);
        console.log(`  Reminder Time: ${reminderDate.toISOString()}`);
        console.log(`  Current Time: ${now.toISOString()}`);
        console.log(`  Minutes Diff: ${minutesDiff}`);

        // Send if within -2 to +3 minute window
        if (minutesDiff >= -2 && minutesDiff <= 3) {
          // Check if already sent today
          const sentTodayKey = `${schedule.id}_${now.toISOString().split("T")[0]}`;
          const sentDoc = await db
            .collection("remindersSent")
            .doc(sentTodayKey)
            .get();

          if (sentDoc.exists) {
            console.log(`  Already sent today`);
            result.skipped++;
            result.details.push({
              scheduleId: schedule.id,
              title: schedule.title,
              status: "skipped",
              reason: "Already sent today",
            });
            continue;
          }

          // Send email
          console.log(`  Sending email to: ${schedule.personEmail}`);
          
          const deadlineFormatted = nextDeadline.toLocaleString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          await sendScheduleReminder(
            schedule.personEmail,
            `⏰ Reminder: ${schedule.title}`,
            schedule.title,
            schedule.description,
            deadlineFormatted,
            schedule.personAssigned
          );

          // Mark as sent
          await db.collection("remindersSent").doc(sentTodayKey).set({
            scheduleId: schedule.id,
            personEmail: schedule.personEmail,
            sentAt: now.toISOString(),
            deadline: nextDeadline.toISOString(),
          });

          console.log(`  ✓ Email sent successfully`);
          result.sent++;
          result.details.push({
            scheduleId: schedule.id,
            title: schedule.title,
            status: "sent",
            reason: `Sent to ${schedule.personEmail}`,
          });
        } else {
          result.skipped++;
          result.details.push({
            scheduleId: schedule.id,
            title: schedule.title,
            status: "skipped",
            reason: `Not in window (${minutesDiff} minutes)`,
          });
        }
      } catch (scheduleError) {
        console.error(`Error processing schedule ${schedule.id}:`, scheduleError);
        result.errors++;
        result.details.push({
          scheduleId: schedule.id,
          title: schedule.title,
          status: "error",
          reason: scheduleError instanceof Error ? scheduleError.message : "Unknown error",
        });
      }
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        duration,
        timestamp: now.toISOString(),
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
