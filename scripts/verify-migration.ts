#!/usr/bin/env ts-node

/**
 * Verification script to check data integrity after migration
 * 
 * Run with: npx ts-node scripts/verify-migration.ts
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

interface VerificationResult {
  collection: string;
  count: number;
  sampleIds: string[];
  hasData: boolean;
}

const COLLECTIONS = [
  "schedules",
  "completions",
  "employees",
  "scheduleCache",
  "calendarCache",
  "employeeCache",
];

async function verifyCollection(collectionName: string): Promise<VerificationResult> {
  try {
    const db = getFirestore();
    const snapshot = await db.collection(collectionName).limit(5).get();
    
    const result: VerificationResult = {
      collection: collectionName,
      count: snapshot.size,
      sampleIds: snapshot.docs.map(doc => doc.id),
      hasData: !snapshot.empty,
    };

    return result;
  } catch (error) {
    logger.error(`Error verifying ${collectionName}:`, error);
    return {
      collection: collectionName,
      count: 0,
      sampleIds: [],
      hasData: false,
    };
  }
}

async function main() {
  logger.info("🔍 Verifying Migration Data");
  logger.info("============================\n");

  const results: VerificationResult[] = [];

  for (const collection of COLLECTIONS) {
    const result = await verifyCollection(collection);
    results.push(result);

    logger.info(`${collection}:`);
    logger.info(`  Has Data: ${result.hasData ? "✅ Yes" : "❌ No"}`);
    logger.info(`  Sample Count: ${result.count}`);
    if (result.sampleIds.length > 0) {
      logger.info(`  Sample IDs: ${result.sampleIds.join(", ")}`);
    }
    logger.info("");
  }

  logger.info("============================");
  const allHaveData = results.every(r => r.hasData);
  
  if (allHaveData) {
    logger.info("✅ All collections have data!");
  } else {
    const emptyCollections = results.filter(r => !r.hasData).map(r => r.collection);
    logger.warn(`⚠️  Empty collections: ${emptyCollections.join(", ")}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error("Verification failed:", error);
    process.exit(1);
  });
