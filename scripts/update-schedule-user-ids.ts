#!/usr/bin/env ts-node

/**
 * Update all schedules to assign them to a specific user
 * This fixes the issue where migrated schedules have different userIds
 * 
 * Run with: npx ts-node scripts/update-schedule-user-ids.ts
 */

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore as getFirestoreAdmin } from "firebase-admin/firestore";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

// Initialize Firebase Admin
function getFirestore() {
  if (getApps().length === 0) {
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
    
    if (!privateKey || !process.env.FIREBASE_ADMIN_PROJECT_ID || !process.env.FIREBASE_ADMIN_CLIENT_EMAIL) {
      throw new Error("Firebase Admin credentials missing in .env.local");
    }

    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey,
      }),
    });
  }
  
  return getFirestoreAdmin();
}

const logger = {
  info: (...args: unknown[]) => console.log(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

async function updateScheduleUserIds(targetUserId: string) {
  logger.info("🔄 Updating Schedule User IDs");
  logger.info("==============================\n");
  logger.info(`Target User ID: ${targetUserId}`);
  logger.info(`Target Email: misscathierine@gmail.com\n`);

  try {
    const db = getFirestore();
    
    // Get all schedules
    logger.info("📦 Fetching all schedules...");
    const schedulesSnapshot = await db.collection("schedules").get();
    
    if (schedulesSnapshot.empty) {
      logger.warn("⚠️  No schedules found");
      return;
    }

    logger.info(`Found ${schedulesSnapshot.size} schedules\n`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    // Update each schedule
    for (const doc of schedulesSnapshot.docs) {
      const data = doc.data();
      
      try {
        if (data.userId === targetUserId) {
          logger.info(`⏭️  Skipping ${doc.id} (already assigned to target user)`);
          skipped++;
          continue;
        }

        // Update the userId
        await db.collection("schedules").doc(doc.id).update({
          userId: targetUserId,
          updatedAt: new Date().toISOString(),
        });

        logger.info(`✅ Updated ${doc.id} - "${data.title}"`);
        updated++;
      } catch (error) {
        logger.error(`❌ Error updating ${doc.id}:`, error);
        errors++;
      }
    }

    logger.info("\n==============================");
    logger.info("📊 Update Summary");
    logger.info("==============================\n");
    logger.info(`Total Schedules: ${schedulesSnapshot.size}`);
    logger.info(`Updated: ${updated}`);
    logger.info(`Skipped: ${skipped}`);
    logger.info(`Errors: ${errors}\n`);

    if (errors === 0) {
      logger.info("✨ All schedules updated successfully!");
      logger.info("\n💡 Next steps:");
      logger.info("  1. Refresh your browser");
      logger.info("  2. Check the Schedules tab");
      logger.info("  3. All schedules should now be visible");
    } else {
      logger.warn("⚠️  Some schedules failed to update. Please review the logs.");
    }
  } catch (error) {
    logger.error("Failed to update schedules:", error);
    process.exit(1);
  }
}

// Target user ID
const TARGET_USER_ID = "AiA0Z4ZCr4TsaMkMkgfXShOFFHX2";

updateScheduleUserIds(TARGET_USER_ID)
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error("Update failed:", error);
    process.exit(1);
  });
