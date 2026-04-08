export type ScheduleDeadlineType = 
  | "daily"
  | "weekly"
  | "monthly"
  | "monthly-specific"
  | "interval"
  | "hourly"
  | "per-minute"
  | "custom";

export type ReminderDateType = "relative" | "absolute";

export interface ScheduleDeadline {
  type: ScheduleDeadlineType;
  // For weekly: 0-6 (0=Sunday)
  dayOfWeek?: number;
  // For monthly: 1-31
  dayOfMonth?: number;
  // For monthly-specific: 1-12 (month), 1-31 (day)
  month?: number;
  day?: number;
  // For interval: number of days
  days?: number;
  // For hourly: number of hours (e.g., 1 = every hour, 2 = every 2 hours)
  hours?: number;
  // For per-minute: number of minutes (e.g., 1 = every minute, 5 = every 5 minutes)
  minutes?: number;
  // For custom: cron expression
  cronExpression?: string;
  // For preset types: time in HH:mm format (24-hour)
  time?: string;
}

export interface ReminderDate {
  type: ReminderDateType;
  // For relative: days before deadline
  daysBefore?: number;
  // For relative: time in HH:mm format (24-hour)
  time?: string;
  // For absolute: ISO date string
  dateTime?: string;
}

export interface Schedule {
  id: string;
  userId: string;
  title: string;
  description: string;
  deadline: ScheduleDeadline;
  reminderDate: ReminderDate;
  personAssigned: string;
  personEmail: string;
  status: "active" | "inactive";
  hideFromCalendar?: boolean;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

/** One completion record for a schedule in a specific period (recurring tasks). */
export interface TaskCompletion {
  id: string;
  scheduleId: string;
  /** Denormalized for querying completions by schedule owner. */
  scheduleOwnerId: string;
  userId: string;
  completedAt: string;
  completedBy: string;
  completedByName?: string;
  periodStart: string;
  periodEnd: string;
  deadlineType: ScheduleDeadlineType;
  notes?: string;
  scheduleTitle: string;
  scheduleDescription: string;
  personAssigned: string;
  personEmail: string;
}
