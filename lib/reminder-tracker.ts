import { getFirestore } from "@/lib/firebase-admin";

/**
 * Reminder tracking for idempotency - ensures one email per schedule per day
 * Uses Firestore collection 'sentReminders' with document IDs formatted as:
 * {scheduleId}_{YYYY-MM-DD}
 */

export interface SentReminderRecord {
  scheduleId: string;
  date: string; // YYYY-MM-DD format
  sentAt: Date;
  personEmail: string;
  scheduleTitle: string;
  messageId?: string;
}

/**
 * Generate idempotency key for a schedule and date
 * Supports different granularities for different schedule types
 * @param scheduleId The schedule ID
 * @param date The date/time
 * @param granularity 'day' | 'hour' | 'minute' - defaults to 'day'
 */
export const generateIdempotencyKey = (
  scheduleId: string,
  date: Date,
  granularity: "day" | "hour" | "minute" = "day"
): string => {
  const isoString = date.toISOString();

  switch (granularity) {
    case "minute":
      // Format: scheduleId_YYYY-MM-DD_HH:MM
      const minuteStr = isoString.substring(0, 16).replace("T", "_");
      return `${scheduleId}_${minuteStr}`;

    case "hour":
      // Format: scheduleId_YYYY-MM-DD_HH
      const hourStr = isoString.substring(0, 13).replace("T", "_");
      return `${scheduleId}_${hourStr}`;

    case "day":
    default:
      // Format: scheduleId_YYYY-MM-DD
      const dateStr = isoString.split("T")[0];
      return `${scheduleId}_${dateStr}`;
  }
};

/**
 * Check if a reminder has already been sent for a schedule
 * @param scheduleId The schedule ID
 * @param date The date/time to check
 * @param granularity 'day' | 'hour' | 'minute' - defaults to 'day'
 */
export const hasReminderBeenSent = async (
  scheduleId: string,
  date: Date = new Date(),
  granularity: "day" | "hour" | "minute" = "day"
): Promise<boolean> => {
  try {
    const db = getFirestore();
    const key = generateIdempotencyKey(scheduleId, date, granularity);

    const doc = await db.collection("sentReminders").doc(key).get();
    return doc.exists;
  } catch (error) {
    console.error(`Error checking reminder status for ${scheduleId}:`, error);
    // In case of error, return false to allow sending (better to send duplicate than miss)
    return false;
  }
};

/**
 * Mark a reminder as sent for idempotency tracking
 * @param scheduleId The schedule ID
 * @param date The date/time
 * @param metadata Email metadata
 * @param granularity 'day' | 'hour' | 'minute' - defaults to 'day'
 */
export const markReminderAsSent = async (
  scheduleId: string,
  date: Date,
  metadata: {
    personEmail: string;
    scheduleTitle: string;
    messageId?: string;
  },
  granularity: "day" | "hour" | "minute" = "day"
): Promise<void> => {
  try {
    const db = getFirestore();
    const key = generateIdempotencyKey(scheduleId, date, granularity);
    const dateStr = date.toISOString().split("T")[0];

    const record: SentReminderRecord = {
      scheduleId,
      date: dateStr,
      sentAt: new Date(),
      personEmail: metadata.personEmail,
      scheduleTitle: metadata.scheduleTitle,
      messageId: metadata.messageId,
    };

    await db.collection("sentReminders").doc(key).set(record);
  } catch (error) {
    console.error(`Error marking reminder as sent for ${scheduleId}:`, error);
    // Don't throw - we don't want to fail the overall process
  }
};

/**
 * Clean up old reminder records (older than 1 hour)
 * Call this periodically to prevent the collection from growing too large
 * Keeps only recent markers for active idempotency checking
 */
export const cleanupOldReminders = async (): Promise<number> => {
  try {
    const db = getFirestore();

    // Get time 1 hour ago
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const snapshot = await db
      .collection("sentReminders")
      .where("sentAt", "<", oneHourAgo)
      .limit(100) // Process in batches
      .get();

    if (snapshot.empty) {
      return 0;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    return snapshot.size;
  } catch (error) {
    console.error("Error cleaning up old reminders:", error);
    return 0;
  }
};

/**
 * Clear today's sent reminder marker for a schedule
 * Call this when a schedule is edited to allow re-sending the reminder
 */
export const clearTodaysSentReminder = async (
  scheduleId: string,
  date: Date = new Date()
): Promise<boolean> => {
  try {
    const db = getFirestore();
    const key = generateIdempotencyKey(scheduleId, date);

    const docRef = db.collection("sentReminders").doc(key);
    const doc = await docRef.get();

    if (doc.exists) {
      await docRef.delete();
      console.log(
        `Cleared sent reminder marker for schedule ${scheduleId} on ${date.toISOString().split("T")[0]}`
      );
      return true;
    }

    return false; // Wasn't sent today anyway
  } catch (error) {
    console.error(`Error clearing sent reminder for ${scheduleId}:`, error);
    return false;
  }
};
