#!/usr/bin/env ts-node

/**
 * Migration script to copy data from nia-reminder collections to main system
 * 
 * This script migrates:
 * - schedules collection
 * - completions collection
 * - employees collection
 * - scheduleCache collection
 * - calendarCache collection
 * - employeeCache collection
 * 
 * Run with: npx ts-node scripts/migrate-nia-reminder-data.ts
 * 
 * Options:
 * --dry-run: Preview what would be migrated without making changes
 * --collection=<name>: Migrate only a specific collection
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

interface MigrationStats {
  collection: string;
  total: number;
  migrated: number;
  skipped: number;
  errors: number;
}

const COLLECTIONS_TO_MIGRATE = [
  "schedules",
  "completions",
  "employees",
  "scheduleCache",
  "calendarCache",
  "employeeCache",
];

async function migrateCollection(
  collectionName: string,
  dryRun: boolean = false
): Promise<MigrationStats> {
  const stats: MigrationStats = {
    collection: collectionName,
    total: 0,
    migrated: 0,
    skipped: 0,
    errors: 0,
  };

  try {
    const db = getFirestore();
    
    logger.info(`\n📦 Migrating collection: ${collectionName}`);
    
    // Get all documents from the collection
    const snapshot = await db.collection(collectionName).get();
    stats.total = snapshot.size;
    
    if (snapshot.empty) {
      logger.info(`  ℹ️  Collection is empty, nothing to migrate`);
      return stats;
    }

    logger.info(`  Found ${stats.total} documents`);

    // Process each document
    for (const doc of snapshot.docs) {
      try {
        const data = doc.data();
        
        if (dryRun) {
          logger.info(`  [DRY RUN] Would migrate document: ${doc.id}`);
          stats.migrated++;
        } else {
          // Check if document already exists
          const existingDoc = await db.collection(collectionName).doc(doc.id).get();
          
          if (existingDoc.exists) {
            logger.info(`  ⏭️  Skipping ${doc.id} (already exists)`);
            stats.skipped++;
            continue;
          }

          // Migrate the document
          await db.collection(collectionName).doc(doc.id).set(data);
          logger.info(`  ✅ Migrated ${doc.id}`);
          stats.migrated++;
        }
      } catch (error) {
        logger.error(`  ❌ Error migrating document ${doc.id}:`, error);
        stats.errors++;
      }
    }

    return stats;
  } catch (error) {
    logger.error(`Failed to migrate collection ${collectionName}:`, error);
    stats.errors++;
    return stats;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const collectionArg = args.find((arg) => arg.startsWith("--collection="));
  const specificCollection = collectionArg?.split("=")[1];

  logger.info("🚀 Starting NIA Reminder Data Migration");
  logger.info("========================================\n");

  if (dryRun) {
    logger.info("🔍 DRY RUN MODE - No changes will be made\n");
  }

  const collectionsToProcess = specificCollection
    ? [specificCollection]
    : COLLECTIONS_TO_MIGRATE;

  const allStats: MigrationStats[] = [];

  for (const collection of collectionsToProcess) {
    const stats = await migrateCollection(collection, dryRun);
    allStats.push(stats);
  }

  // Print summary
  logger.info("\n========================================");
  logger.info("📊 Migration Summary");
  logger.info("========================================\n");

  let totalDocs = 0;
  let totalMigrated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const stats of allStats) {
    logger.info(`${stats.collection}:`);
    logger.info(`  Total: ${stats.total}`);
    logger.info(`  Migrated: ${stats.migrated}`);
    logger.info(`  Skipped: ${stats.skipped}`);
    logger.info(`  Errors: ${stats.errors}\n`);

    totalDocs += stats.total;
    totalMigrated += stats.migrated;
    totalSkipped += stats.skipped;
    totalErrors += stats.errors;
  }

  logger.info("Overall:");
  logger.info(`  Total Documents: ${totalDocs}`);
  logger.info(`  Migrated: ${totalMigrated}`);
  logger.info(`  Skipped: ${totalSkipped}`);
  logger.info(`  Errors: ${totalErrors}`);

  if (dryRun) {
    logger.info("\n💡 This was a dry run. Run without --dry-run to perform the migration.");
  } else if (totalErrors === 0) {
    logger.info("\n✨ Migration completed successfully!");
  } else {
    logger.warn("\n⚠️  Migration completed with errors. Please review the logs.");
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    logger.error("Migration failed:", error);
    process.exit(1);
  });
