import { getFirestore } from "@/lib/firebase-admin";
import { Schedule } from "@/types/schedule";

/**
 * Schedule cache for optimizing cron job reads
 * 
 * Problem: Cron job runs every minute and reads ALL schedules (40+ reads/min = 10k+ reads/day)
 * Solution: Cache upcoming reminder times, only query schedules when needed
 * 
 * Cache structure:
 * - Collection: scheduleCache
 * - Document ID: single doc "upcomingReminders"
 * - Data: Array of { scheduleId, reminderTime (ISO string), title }
 * 
 * The cron job checks this cache first. If no reminders within 3 minutes, skip schedule queries.
 */

export interface CachedReminder {
  id: string;
  title: string;
  description: string;
  deadline: {
    type: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
    month?: number;
    day?: number;
    days?: number;
    hours?: number;
    minutes?: number;
    cronExpression?: string;
    time?: string;
  };
  reminderDate: {
    type: string;
    daysBefore?: number;
    time?: string;
    dateTime?: string;
  };
  personAssigned: string;
  personEmail: string;
  status: string;
}

export interface ScheduleCacheDoc {
  reminders: CachedReminder[];
  lastSynced: Date;
  scheduleCount: number;
}

/**
 * Build/rebuild the schedule cache from all active schedules
 * Call this when:
 * - User clicks "Sync" button
 * - A schedule is created/updated/deleted
 * - System initialization
 */
export const syncScheduleCache = async (): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> => {
  try {
    const db = getFirestore();

    // Fetch all active schedules
    const schedulesSnapshot = await db
      .collection("schedules")
      .where("status", "==", "active")
      .get();

    const reminders: CachedReminder[] = [];

    // Store each schedule in cache (1:1 copy, excluding userId, createdAt, updatedAt)
    for (const doc of schedulesSnapshot.docs) {
      const data = doc.data();

      // Store exact 1:1 copy of schedule structure
      reminders.push({
        id: doc.id,
        title: data.title,
        description: data.description,
        deadline: data.deadline,
        reminderDate: data.reminderDate,
        personAssigned: data.personAssigned,
        personEmail: data.personEmail,
        status: data.status,
      });
    }

    // Store in cache (no sorting needed - cron will calculate on the fly)
    const cacheDoc: ScheduleCacheDoc = {
      reminders,
      lastSynced: new Date(),
      scheduleCount: schedulesSnapshot.size,
    };

    await db.collection("scheduleCache").doc("upcomingReminders").set(cacheDoc);

    console.log(`Schedule cache synced: ${reminders.length} reminders from ${schedulesSnapshot.size} schedules`);

    return {
      success: true,
      count: reminders.length,
    };
  } catch (error) {
    console.error("Error syncing schedule cache:", error);
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Get all cached schedules
 * Cron will calculate reminder times on the fly from these
 * 
 * @returns Array of cached schedule objects
 */
export const getCachedSchedules = async (): Promise<CachedReminder[]> => {
  try {
    const db = getFirestore();
    
    // Get cache
    const cacheDoc = await db.collection("scheduleCache").doc("upcomingReminders").get();
    
    if (!cacheDoc.exists) {
      console.warn("Schedule cache not found - needs sync.");
      return [];
    }

    const cache = cacheDoc.data() as ScheduleCacheDoc;
    return cache.reminders || [];
  } catch (error) {
    console.error("Error getting cached schedules:", error);
    return [];
  }
};

/**
 * Get cache status for UI display
 */
export const getCacheStatus = async (): Promise<{
  exists: boolean;
  lastSynced?: Date;
  scheduleCount?: number;
  reminderCount?: number;
}> => {
  try {
    const db = getFirestore();
    const cacheDoc = await db.collection("scheduleCache").doc("upcomingReminders").get();
    
    if (!cacheDoc.exists) {
      return { exists: false };
    }

    const cache = cacheDoc.data() as ScheduleCacheDoc;
    
    return {
      exists: true,
      lastSynced: cache.lastSynced instanceof Date ? cache.lastSynced : new Date(cache.lastSynced),
      scheduleCount: cache.scheduleCount,
      reminderCount: cache.reminders.length,
    };
  } catch (error) {
    console.error("Error getting cache status:", error);
    return { exists: false };
  }
};

/**
 * Calendar Cache - Optimizes calendar view reads
 * 
 * Problem: Calendar view reads ALL schedules every time it renders
 * Solution: Cache all schedules in a single document, sync on demand
 */

export interface CalendarCacheDoc {
  schedules: Schedule[];
  lastSynced: Date;
  scheduleCount: number;
}

/**
 * Employee Cache - Optimizes employee task list reads
 * 
 * Problem: Right sidebar reads all schedules to group by employee
 * Solution: Cache employee-task mappings
 */

export interface EmployeeCacheDoc {
  employees: Array<{
    email: string;
    name: string;
    taskCount: number;
    tasks: Array<{ id: string; title: string; status: string }>;
  }>;
  lastSynced: Date;
  totalEmployees: number;
}

/**
 * Sync calendar cache - stores all active schedules
 */
export const syncCalendarCache = async (): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> => {
  try {
    const db = getFirestore();

    // Fetch all active schedules
    const schedulesSnapshot = await db
      .collection("schedules")
      .where("status", "==", "active")
      .get();

    const schedules: Schedule[] = [];

    // Store complete schedule data
    for (const doc of schedulesSnapshot.docs) {
      const data = doc.data();
      schedules.push({
        id: doc.id,
        userId: data.userId,
        title: data.title,
        description: data.description,
        deadline: data.deadline,
        reminderDate: data.reminderDate,
        personAssigned: data.personAssigned,
        personEmail: data.personEmail,
        status: data.status,
        hideFromCalendar: data.hideFromCalendar || false,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
    }

    // Store in cache
    const cacheDoc: CalendarCacheDoc = {
      schedules,
      lastSynced: new Date(),
      scheduleCount: schedulesSnapshot.size,
    };

    await db.collection("calendarCache").doc("allSchedules").set(cacheDoc);

    console.log(`Calendar cache synced: ${schedules.length} schedules`);

    return {
      success: true,
      count: schedules.length,
    };
  } catch (error) {
    console.error("Error syncing calendar cache:", error);
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Get cached schedules for calendar view
 */
export const getCachedCalendarSchedules = async (): Promise<Schedule[]> => {
  try {
    const db = getFirestore();
    
    // Get cache
    const cacheDoc = await db.collection("calendarCache").doc("allSchedules").get();
    
    if (!cacheDoc.exists) {
      console.warn("Calendar cache not found - needs sync.");
      return [];
    }

    const cache = cacheDoc.data() as CalendarCacheDoc;
    return cache.schedules || [];
  } catch (error) {
    console.error("Error getting cached calendar schedules:", error);
    return [];
  }
};

/**
 * Get calendar cache status for UI display
 */
export const getCalendarCacheStatus = async (): Promise<{
  exists: boolean;
  lastSynced?: Date;
  scheduleCount?: number;
}> => {
  try {
    const db = getFirestore();
    const cacheDoc = await db.collection("calendarCache").doc("allSchedules").get();
    
    if (!cacheDoc.exists) {
      return { exists: false };
    }

    const cache = cacheDoc.data() as CalendarCacheDoc;
    
    return {
      exists: true,
      lastSynced: cache.lastSynced instanceof Date ? cache.lastSynced : new Date(cache.lastSynced),
      scheduleCount: cache.scheduleCount,
    };
  } catch (error) {
    console.error("Error getting calendar cache status:", error);
    return { exists: false };
  }
};

/**
 * Sync employee cache - stores employee-task mappings
 */
export const syncEmployeeCache = async (): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> => {
  try {
    const db = getFirestore();

    // Fetch all active schedules
    const schedulesSnapshot = await db
      .collection("schedules")
      .where("status", "==", "active")
      .get();

    // Group by employee
    const employeeMap = new Map<string, {
      email: string;
      name: string;
      taskCount: number;
      tasks: Array<{ id: string; title: string; status: string }>;
    }>();

    for (const doc of schedulesSnapshot.docs) {
      const data = doc.data();
      const email = data.personEmail;

      if (!employeeMap.has(email)) {
        employeeMap.set(email, {
          email,
          name: data.personAssigned,
          taskCount: 0,
          tasks: [],
        });
      }

      const employee = employeeMap.get(email)!;
      employee.taskCount++;
      employee.tasks.push({
        id: doc.id,
        title: data.title,
        status: data.status,
      });
    }

    // Convert to array and sort by task count
    const employees = Array.from(employeeMap.values()).sort((a, b) => b.taskCount - a.taskCount);

    // Store in cache
    const cacheDoc: EmployeeCacheDoc = {
      employees,
      lastSynced: new Date(),
      totalEmployees: employees.length,
    };

    await db.collection("employeeCache").doc("allEmployees").set(cacheDoc);

    console.log(`Employee cache synced: ${employees.length} employees`);

    return {
      success: true,
      count: employees.length,
    };
  } catch (error) {
    console.error("Error syncing employee cache:", error);
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Get cached employees for task list
 */
export const getCachedEmployees = async () => {
  try {
    const db = getFirestore();
    
    // Get cache
    const cacheDoc = await db.collection("employeeCache").doc("allEmployees").get();
    
    if (!cacheDoc.exists) {
      console.warn("Employee cache not found - needs sync.");
      return [];
    }

    const cache = cacheDoc.data() as EmployeeCacheDoc;
    return cache.employees || [];
  } catch (error) {
    console.error("Error getting cached employees:", error);
    return [];
  }
};

/**
 * Get employee cache status for UI display
 */
export const getEmployeeCacheStatus = async (): Promise<{
  exists: boolean;
  lastSynced?: Date;
  totalEmployees?: number;
}> => {
  try {
    const db = getFirestore();
    const cacheDoc = await db.collection("employeeCache").doc("allEmployees").get();
    
    if (!cacheDoc.exists) {
      return { exists: false };
    }

    const cache = cacheDoc.data() as EmployeeCacheDoc;
    
    return {
      exists: true,
      lastSynced: cache.lastSynced instanceof Date ? cache.lastSynced : new Date(cache.lastSynced),
      totalEmployees: cache.totalEmployees,
    };
  } catch (error) {
    console.error("Error getting employee cache status:", error);
    return { exists: false };
  }
};
