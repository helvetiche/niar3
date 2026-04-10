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

async function fetchAllSchedules() {
  const app = initializeFirebaseAdmin();
  const db = getFirestore(app);

  console.log("\n📋 Fetching all schedules from Firestore...\n");

  try {
    const schedulesSnapshot = await db
      .collection("schedules")
      .orderBy("createdAt", "desc")
      .get();

    if (schedulesSnapshot.empty) {
      console.log("No schedules found in the database.");
      return;
    }

    console.log(`Found ${schedulesSnapshot.size} schedule(s):\n`);
    console.log("=".repeat(80));

    let index = 0;
    schedulesSnapshot.forEach((doc) => {
      const data = doc.data();
      const currentIndex = index + 1;
      index++;
      console.log(`\n📌 Schedule #${currentIndex}`);
      console.log("-".repeat(40));
      console.log(`ID: ${doc.id}`);
      console.log(`User ID: ${data.userId || "N/A"}`);
      console.log(`Title: ${data.title || "N/A"}`);
      console.log(`Description: ${data.description || "(No description)"}`);
      console.log(`Person Assigned: ${data.personAssigned || "N/A"}`);
      console.log(`Person Email: ${data.personEmail || "N/A"}`);
      console.log(`Status: ${data.status || "N/A"}`);
      console.log(`Deadline: ${JSON.stringify(data.deadline || {})}`);
      console.log(`Reminder: ${JSON.stringify(data.reminderDate || {})}`);

      const formatTimestamp = (timestamp: unknown): string => {
        if (!timestamp) return "N/A";
        if (typeof timestamp === "string") return timestamp;
        if (
          typeof timestamp === "object" &&
          timestamp !== null &&
          "_seconds" in timestamp
        ) {
          const ts = timestamp as { _seconds: number; _nanoseconds: number };
          return new Date(ts._seconds * 1000).toISOString();
        }
        return String(timestamp);
      };

      console.log(`Created At: ${formatTimestamp(data.createdAt)}`);
      console.log(`Updated At: ${formatTimestamp(data.updatedAt)}`);
    });

    console.log("\n" + "=".repeat(80));
    console.log(`\n✅ Total: ${schedulesSnapshot.size} schedule(s)\n`);
  } catch (error) {
    console.error("Error fetching schedules:", error);
    process.exit(1);
  }
}

fetchAllSchedules();
