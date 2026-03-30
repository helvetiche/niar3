import type { ScheduleDeadline, ReminderDate } from "@/types/schedule";

export function calculateNextDeadline(
  deadline: ScheduleDeadline,
  currentTime: Date
): Date {
  // Work in Manila timezone (UTC+8)
  const manilaTimeString = currentTime.toLocaleString("en-US", { timeZone: "Asia/Manila" });
  const now = new Date(manilaTimeString);
  
  // Parse time if available
  let targetHour = 14; // Default 2 PM
  let targetMinute = 0;
  if (deadline.time) {
    const [hours, minutes] = deadline.time.split(":").map(Number);
    targetHour = hours || 14;
    targetMinute = minutes || 0;
  }
  
  let nextDeadline: Date;
  
  switch (deadline.type) {
    case "daily": {
      nextDeadline = new Date(now);
      nextDeadline.setHours(targetHour, targetMinute, 0, 0);
      if (nextDeadline <= now) {
        nextDeadline.setDate(nextDeadline.getDate() + 1);
      }
      break;
    }
    case "weekly": {
      const targetDay = deadline.dayOfWeek || 0;
      const currentDay = now.getDay();
      let daysUntil = (targetDay - currentDay + 7) % 7;
      if (daysUntil === 0) {
        nextDeadline = new Date(now);
        nextDeadline.setHours(targetHour, targetMinute, 0, 0);
        if (nextDeadline <= now) {
          daysUntil = 7;
        }
      }
      if (daysUntil > 0) {
        nextDeadline = new Date(now);
        nextDeadline.setDate(nextDeadline.getDate() + daysUntil);
        nextDeadline.setHours(targetHour, targetMinute, 0, 0);
      } else {
        nextDeadline = new Date(now);
        nextDeadline.setHours(targetHour, targetMinute, 0, 0);
      }
      break;
    }
    case "monthly": {
      const targetDay = deadline.dayOfMonth || 1;
      nextDeadline = new Date(now.getFullYear(), now.getMonth(), targetDay, targetHour, targetMinute, 0, 0);
      if (nextDeadline <= now) {
        nextDeadline.setMonth(nextDeadline.getMonth() + 1);
      }
      break;
    }
    case "monthly-specific": {
      const targetMonth = (deadline.month || 1) - 1;
      const targetDay = deadline.day || 1;
      nextDeadline = new Date(now.getFullYear(), targetMonth, targetDay, targetHour, targetMinute, 0, 0);
      if (nextDeadline <= now) {
        nextDeadline.setFullYear(nextDeadline.getFullYear() + 1);
      }
      break;
    }
    case "interval": {
      const days = deadline.days || 1;
      nextDeadline = new Date(now);
      nextDeadline.setDate(nextDeadline.getDate() + days);
      nextDeadline.setHours(targetHour, targetMinute, 0, 0);
      break;
    }
    default: {
      nextDeadline = new Date(now);
      nextDeadline.setDate(nextDeadline.getDate() + 30);
      nextDeadline.setHours(targetHour, targetMinute, 0, 0);
      break;
    }
  }
  
  return nextDeadline;
}

export function calculateReminderDate(
  reminderDate: ReminderDate,
  deadlineDate: Date
): Date {
  if (reminderDate.type === "absolute" && reminderDate.dateTime) {
    return new Date(reminderDate.dateTime);
  }
  
  // Relative reminder
  const daysBefore = reminderDate.daysBefore ?? 1;
  const reminderTime = reminderDate.time || "08:00";
  const [hours, minutes] = reminderTime.split(":").map(Number);
  
  const reminder = new Date(deadlineDate);
  reminder.setDate(reminder.getDate() - daysBefore);
  reminder.setHours(hours || 8, minutes || 0, 0, 0);
  
  return reminder;
}

export function formatTimeTo12Hour(time: string): string {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function formatDeadline(deadline: ScheduleDeadline): string {
  const timeStr = deadline.time ? ` at ${formatTimeTo12Hour(deadline.time)}` : "";
  switch (deadline.type) {
    case "daily":
      return `Every day${timeStr}`;
    case "weekly":
      const dayName = DAYS_OF_WEEK[deadline.dayOfWeek || 0];
      return `Every ${dayName}${timeStr}`;
    case "monthly":
      return `Every ${deadline.dayOfMonth || 1}${getOrdinalSuffix(deadline.dayOfMonth || 1)} of the month${timeStr}`;
    case "monthly-specific":
      const monthName = MONTHS[(deadline.month || 1) - 1];
      return `Every ${deadline.day || 1}${getOrdinalSuffix(deadline.day || 1)} of ${monthName}${timeStr}`;
    case "interval":
      return `Every ${deadline.days || 1} day${(deadline.days || 1) > 1 ? "s" : ""}${timeStr}`;
    case "custom":
      return deadline.cronExpression || "Custom schedule";
    default:
      return "Unknown";
  }
}

export function formatReminder(reminderDate: ReminderDate): string {
  const daysBefore = reminderDate.daysBefore ?? 1;
  const timeStr = reminderDate.time ? ` at ${formatTimeTo12Hour(reminderDate.time)}` : "";
  
  if (daysBefore === 0) {
    return `Same day${timeStr}`;
  }
  
  return `${daysBefore} day${daysBefore !== 1 ? "s" : ""} before deadline${timeStr}`;
}

function getOrdinalSuffix(n: number): string {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
}
