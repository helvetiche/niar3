import { ScheduleDeadline, ReminderDate } from "@/types/schedule";

/**
 * Philippine timezone offset: UTC+8
 * All times in the system are stored as Philippine time but processed in UTC
 */
const PH_OFFSET_MS = 8 * 60 * 60 * 1000;

/**
 * Calculate the next deadline date based on schedule deadline configuration
 * Works entirely in UTC. Philippine time settings are converted to UTC internally.
 *
 * @param deadline The schedule deadline configuration (times are in Philippine time HH:mm format)
 * @param referenceDate The reference date in UTC (defaults to now)
 * @param createdAt Optional creation date for interval schedules
 * @returns Date object in UTC representing the next deadline
 */
export const calculateNextDeadline = (
  deadline: ScheduleDeadline,
  referenceDate: Date = new Date(),
  createdAt?: string | Date
): Date => {
  const now = referenceDate;

  // Get current time in Philippine timezone for date/time comparisons
  const nowPH = new Date(now.getTime() + PH_OFFSET_MS);

  switch (deadline.type) {
    case "daily": {
      const [hours, minutes] = deadline.time
        ? deadline.time.split(":").map(Number)
        : [23, 59];

      // Create today's deadline in PH time
      const deadlinePH = new Date(
        Date.UTC(
          nowPH.getUTCFullYear(),
          nowPH.getUTCMonth(),
          nowPH.getUTCDate(),
          hours,
          minutes,
          0,
          0
        )
      );

      // Convert back to UTC
      let result = new Date(deadlinePH.getTime() - PH_OFFSET_MS);

      // If deadline has passed, move to tomorrow
      if (result <= now) {
        result = new Date(result.getTime() + 24 * 60 * 60 * 1000);
      }

      return result;
    }

    case "weekly": {
      const targetDay = deadline.dayOfWeek ?? 0;
      const [hours, minutes] = deadline.time
        ? deadline.time.split(":").map(Number)
        : [23, 59];

      const currentDay = nowPH.getUTCDay();
      let daysUntilTarget = (targetDay - currentDay + 7) % 7;

      if (daysUntilTarget === 0) {
        // Same day - check if time has passed
        const todayDeadlinePH = new Date(
          Date.UTC(
            nowPH.getUTCFullYear(),
            nowPH.getUTCMonth(),
            nowPH.getUTCDate(),
            hours,
            minutes,
            0,
            0
          )
        );
        const todayDeadlineUTC = new Date(todayDeadlinePH.getTime() - PH_OFFSET_MS);

        if (todayDeadlineUTC <= now) {
          daysUntilTarget = 7; // Next week
        }
      }

      const targetDatePH = new Date(
        nowPH.getTime() + daysUntilTarget * 24 * 60 * 60 * 1000
      );
      const deadlinePH = new Date(
        Date.UTC(
          targetDatePH.getUTCFullYear(),
          targetDatePH.getUTCMonth(),
          targetDatePH.getUTCDate(),
          hours,
          minutes,
          0,
          0
        )
      );

      return new Date(deadlinePH.getTime() - PH_OFFSET_MS);
    }

    case "monthly": {
      const targetDay = deadline.dayOfMonth ?? 1;
      const [hours, minutes] = deadline.time
        ? deadline.time.split(":").map(Number)
        : [23, 59];

      let deadlinePH = new Date(
        Date.UTC(
          nowPH.getUTCFullYear(),
          nowPH.getUTCMonth(),
          targetDay,
          hours,
          minutes,
          0,
          0
        )
      );

      let result = new Date(deadlinePH.getTime() - PH_OFFSET_MS);

      // If this month's deadline has passed, move to next month
      if (result <= now) {
        deadlinePH = new Date(
          Date.UTC(
            nowPH.getUTCFullYear(),
            nowPH.getUTCMonth() + 1,
            targetDay,
            hours,
            minutes,
            0,
            0
          )
        );
        result = new Date(deadlinePH.getTime() - PH_OFFSET_MS);
      }

      return result;
    }

    case "monthly-specific": {
      const targetMonth = (deadline.month ?? 1) - 1; // 0-indexed
      const targetDay = deadline.day ?? 1;
      const [hours, minutes] = deadline.time
        ? deadline.time.split(":").map(Number)
        : [23, 59];

      let deadlinePH = new Date(
        Date.UTC(nowPH.getUTCFullYear(), targetMonth, targetDay, hours, minutes, 0, 0)
      );

      let result = new Date(deadlinePH.getTime() - PH_OFFSET_MS);

      // If this year's deadline has passed, move to next year
      if (result <= now) {
        deadlinePH = new Date(
          Date.UTC(
            nowPH.getUTCFullYear() + 1,
            targetMonth,
            targetDay,
            hours,
            minutes,
            0,
            0
          )
        );
        result = new Date(deadlinePH.getTime() - PH_OFFSET_MS);
      }

      return result;
    }

    case "interval": {
      const intervalDays = deadline.days ?? 1;
      const [hours, minutes] = deadline.time
        ? deadline.time.split(":").map(Number)
        : [23, 59];

      const baseDate = createdAt
        ? typeof createdAt === "string"
          ? new Date(createdAt)
          : createdAt
        : now;

      const baseDatePH = new Date(baseDate.getTime() + PH_OFFSET_MS);
      const daysSinceBase = Math.floor(
        (nowPH.getTime() - baseDatePH.getTime()) / (1000 * 60 * 60 * 24)
      );
      const intervalsPassed = Math.floor(daysSinceBase / intervalDays);

      const nextIntervalDatePH = new Date(
        baseDatePH.getTime() + intervalsPassed * intervalDays * 24 * 60 * 60 * 1000
      );
      const deadlinePH = new Date(
        Date.UTC(
          nextIntervalDatePH.getUTCFullYear(),
          nextIntervalDatePH.getUTCMonth(),
          nextIntervalDatePH.getUTCDate(),
          hours,
          minutes,
          0,
          0
        )
      );

      let result = new Date(deadlinePH.getTime() - PH_OFFSET_MS);

      // If this occurrence has passed, move to next interval
      if (result <= now) {
        result = new Date(result.getTime() + intervalDays * 24 * 60 * 60 * 1000);
      }

      return result;
    }

    case "hourly": {
      const hoursInterval = deadline.hours ?? 1;

      const hoursSinceMidnightPH = nowPH.getUTCHours();
      const intervalsPassed = Math.floor(hoursSinceMidnightPH / hoursInterval);

      const deadlinePH = new Date(
        Date.UTC(
          nowPH.getUTCFullYear(),
          nowPH.getUTCMonth(),
          nowPH.getUTCDate(),
          intervalsPassed * hoursInterval,
          0,
          0,
          0
        )
      );

      let result = new Date(deadlinePH.getTime() - PH_OFFSET_MS);

      if (result <= now) {
        result = new Date(result.getTime() + hoursInterval * 60 * 60 * 1000);
      }

      return result;
    }

    case "per-minute": {
      const minutesInterval = deadline.minutes ?? 1;

      const minutesSinceHourPH = nowPH.getUTCMinutes();
      const intervalsPassed = Math.floor(minutesSinceHourPH / minutesInterval);

      const deadlinePH = new Date(
        Date.UTC(
          nowPH.getUTCFullYear(),
          nowPH.getUTCMonth(),
          nowPH.getUTCDate(),
          nowPH.getUTCHours(),
          intervalsPassed * minutesInterval,
          0,
          0
        )
      );

      let result = new Date(deadlinePH.getTime() - PH_OFFSET_MS);

      if (result <= now) {
        result = new Date(result.getTime() + minutesInterval * 60 * 1000);
      }

      return result;
    }

    case "custom": {
      return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
    }

    default: {
      return new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
    }
  }
};

/**
 * Calculate when a reminder should be sent based on reminder date configuration
 * Works in UTC. Times are treated as Philippine time and converted to UTC.
 *
 * @param reminderDate Reminder configuration
 * @param deadlineDate The deadline date in UTC
 * @returns Date object in UTC representing when the reminder should be sent
 */
export const calculateReminderDate = (
  reminderDate: ReminderDate,
  deadlineDate: Date
): Date => {
  if (reminderDate.type === "relative") {
    const daysBefore = reminderDate.daysBefore ?? 1;
    const [hours, minutes] = reminderDate.time
      ? reminderDate.time.split(":").map(Number)
      : [9, 0];

    // Get deadline in PH time
    const deadlinePH = new Date(deadlineDate.getTime() + PH_OFFSET_MS);

    // Subtract days
    const reminderDatePH = new Date(
      deadlinePH.getTime() - daysBefore * 24 * 60 * 60 * 1000
    );

    // Set the time
    const reminderWithTimePH = new Date(
      Date.UTC(
        reminderDatePH.getUTCFullYear(),
        reminderDatePH.getUTCMonth(),
        reminderDatePH.getUTCDate(),
        hours,
        minutes,
        0,
        0
      )
    );

    // Convert back to UTC
    return new Date(reminderWithTimePH.getTime() - PH_OFFSET_MS);
  } else if (reminderDate.type === "absolute" && reminderDate.dateTime) {
    return new Date(reminderDate.dateTime);
  }

  return deadlineDate;
};

/**
 * Check if a reminder should be sent now with a 5-minute window
 *
 * @param reminderDate The calculated reminder date in UTC
 * @param currentDate Current date/time in UTC
 * @returns true if the reminder should be sent (current time is between -2 min and +3 min of reminder time)
 *
 * Example: If reminder is at 11:14:
 * - Will send between 11:12:00 and 11:17:00 (5 minute window)
 */
export const shouldSendReminder = (
  reminderDate: Date,
  currentDate: Date = new Date()
): boolean => {
  const reminderTime = reminderDate.getTime();
  const currentTime = currentDate.getTime();

  const diffMs = currentTime - reminderTime;

  // 5-minute window: -2 minutes to +3 minutes (total 5 minutes)
  const WINDOW_START_MS = -2 * 60 * 1000; // -2 minutes
  const WINDOW_END_MS = 3 * 60 * 1000; // +3 minutes

  return diffMs >= WINDOW_START_MS && diffMs <= WINDOW_END_MS;
};
