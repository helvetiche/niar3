import { initializeApp, cert, getApps, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

// Initialize Firebase Admin
function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    return getApp();
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.error("Error: Firebase Admin credentials missing.");
    console.error(
      "Please set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY in .env.local"
    );
    process.exit(1);
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    }),
  });
}

async function updateSchedulesEmail() {
  const app = initializeFirebaseAdmin();
  const db = getFirestore(app);

  const targetEmail = "helvetiche@gmail.com";
  const targetUserId = "ZGkChNDcyTfuJlnEkIvNDzz9P2E2";

  console.log(`\n📋 Fetching all schedules to update email to: ${targetEmail}\n`);

  try {
    const schedulesSnapshot = await db.collection("schedules").get();

    if (schedulesSnapshot.empty) {
      console.log("No schedules found in the database.");
      return;
    }

    console.log(`Found ${schedulesSnapshot.size} schedule(s) to update...\n`);

    const batch = db.batch();
    let updateCount = 0;

    schedulesSnapshot.forEach((doc) => {
      const data = doc.data();

      // Update the schedule with new email and userId
      batch.update(doc.ref, {
        userId: targetUserId,
        personEmail: targetEmail,
        personAssigned: targetEmail.split("@")[0],
        updatedAt: new Date().toISOString(),
      });

      updateCount++;
      console.log(`Updating: ${data.title} (${doc.id})`);
    });

    await batch.commit();

    console.log(
      `\n✅ Successfully updated ${updateCount} schedule(s) with email: ${targetEmail}\n`
    );
  } catch (error) {
    console.error("Error updating schedules:", error);
    process.exit(1);
  }
}

updateSchedulesEmail();
