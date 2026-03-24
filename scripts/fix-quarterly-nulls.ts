#!/usr/bin/env tsx
/**
 * Fix script to set quarterly data to null instead of 0 for untouched fields
 */

import * as dotenv from "dotenv";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

dotenv.config({ path: ".env.local" });

const firebaseConfig = {
  project_id: process.env.FIREBASE_ADMIN_PROJECT_ID,
  client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  private_key: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
};

const app = initializeApp({
  credential: cert(firebaseConfig as unknown as Parameters<typeof cert>[0]),
});

async function fixQuarterlyNulls() {
  console.log("🔧 Fixing quarterly data nulls...\n");

  const db = getFirestore(app);
  const inventoryCollection = db.collection("inventory");

  const snapshot = await inventoryCollection.get();
  let updated = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const updates: Record<string, unknown> = {};

    // Fix each quarter
    for (let q = 1; q <= 4; q++) {
      const quarterKey = `q${q}`;
      const quarterData = data[quarterKey];

      if (quarterData) {
        updates[quarterKey] = {
          requestedQuantity: quarterData.requestedQuantity === 0 ? null : quarterData.requestedQuantity,
          receivedQuantity: quarterData.receivedQuantity === 0 ? null : quarterData.receivedQuantity,
          baseQuantity: quarterData.baseQuantity || 0,
        };
      }
    }

    if (Object.keys(updates).length > 0) {
      await doc.ref.update(updates);
      updated++;
      console.log(`✅ Updated: ${data.sku}`);
    }
  }

  console.log(`\n✨ Fixed ${updated} items!`);
  process.exit(0);
}

fixQuarterlyNulls().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
