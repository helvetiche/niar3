#!/usr/bin/env ts-node

/**
 * Compare data between nia-reminder and main system
 * Shows what data exists in each collection
 * 
 * Run with: npx ts-node scripts/compare-data.ts
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

interface CollectionStats {
  name: string;
  count: number;
  sampleDocs: Array<{ id: string; title?: string; name?: string }>;
}

const COLLECTIONS = [
  "schedules",
  "completions",
  "employees",
  "scheduleCache",
  "calendarCache",
  "employeeCache",
];

async function getCollectionStats(collectionName: string): Promise<CollectionStats> {
  try {
    const db = getFirestore();
    
    // Get total count
    const allDocs = await db.collection(collectionName).get();
    const count = allDocs.size;
    
    // Get sample documents
    const sampleSnapshot = await db.collection(collectionName).limit(3).get();
    const sampleDocs = sampleSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        name: data.name || data.personAssigned,
      };
    });

    return {
      name: collectionName,
      count,
      sampleDocs,
    };
  } catch (error) {
    logger.error(`Error getting stats for ${collectionName}:`, error);
    return {
      name: collectionName,
      count: 0,
      sampleDocs: [],
    };
  }
}

async function main() {
  logger.info("📊 Firestore Data Comparison");
  logger.info("============================\n");

  const stats: CollectionStats[] = [];

  for (const collection of COLLECTIONS) {
    const collectionStats = await getCollectionStats(collection);
    stats.push(collectionStats);
  }

  // Display results
  logger.info("Collection Summary:");
  logger.info("-------------------\n");

  let totalDocs = 0;

  for (const stat of stats) {
    totalDocs += stat.count;
    
    logger.info(`📁 ${stat.name}`);
    logger.info(`   Documents: ${stat.count}`);
    
    if (stat.sampleDocs.length > 0) {
      logger.info(`   Sample IDs:`);
      stat.sampleDocs.forEach(doc => {
        const label = doc.title || doc.name || doc.id;
        logger.info(`     - ${label} (${doc.id})`);
      });
    } else {
      logger.info(`   ⚠️  Empty collection`);
    }
    logger.info("");
  }

  logger.info("============================");
  logger.info(`Total Documents: ${totalDocs}`);
  logger.info("");

  // Recommendations
  if (totalDocs === 0) {
    logger.warn("⚠️  No data found in any collection.");
    logger.info("💡 Run the migration script to copy data from nia-reminder:");
    logger.info("   npm run migrate:dry-run");
  } else {
    logger.info("✅ Data exists in your Firestore database.");
    
    const emptyCollections = stats.filter(s => s.count === 0);
    if (emptyCollections.length > 0) {
      logger.info(`\n💡 Empty collections: ${emptyCollections.map(c => c.name).join(", ")}`);
      logger.info("   These may need to be migrated or synced.");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error("Comparison failed:", error);
    process.exit(1);
  });
