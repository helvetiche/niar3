import { initializeApp, cert, getApps, getApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    return getApp();
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin credentials missing. Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY.",
    );
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    }),
  });
}

async function checkUserRole(email: string) {
  try {
    initializeFirebaseAdmin();
    const auth = getAuth();

    const user = await auth.getUserByEmail(email);

    console.log(`\n📧 Email: ${user.email}`);
    console.log(`🆔 UID: ${user.uid}`);
    console.log(`🔐 Custom Claims:`, user.customClaims);
    console.log(`👤 Role: ${user.customClaims?.role ?? "user"}`);
  } catch (error) {
    console.error("❌ Error checking user:", error);
    process.exit(1);
  }
}

const email = process.argv[2] || "helvetiche@gmail.com";

checkUserRole(email)
  .then(() => {
    console.log("\n✅ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
