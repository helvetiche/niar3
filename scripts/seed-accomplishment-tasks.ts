import { initializeApp, cert, getApps, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const TASKS = [
  {
    id: "nLOWeNc8ES42L1VxJEux",
    label:
      "Supervised IA Meeting, Monitoring SMC and NMC, Supervised WRFO, Monitoring Field Inspection",
    designation: "SWRFT",
    createdAt: 1771819621466,
  },
  {
    id: "9f2jWhELLbtnt2S51Dom",
    label:
      "Monitoring Closing and Opening, North Main Canal Intake and Sluice Gate and Other O&M Related Activities",
    designation: "WRFOB",
    createdAt: 1771819764851,
  },
  {
    id: "QOkJsVrjE98uqqgqa1Tp",
    label:
      "Operations and Maintenance of Bustos Dam, Intake Gate of South Main Canal, and do Other Operations and Maintenance Activities",
    designation: "WRFOB",
    createdAt: 1771820105843,
  },
  {
    id: "LdkWAHtQ2pxti6rzP6Q0",
    label:
      "Supervised WRFO-B, Water distribution, Area Monitoring, Field Inspection, and Other O&M Related Activities",
    designation: "SWRFT",
    createdAt: 1771820169975,
  },
  {
    id: "hHShDNgXKiW9DEkR46un",
    label:
      "Area Monitoring and Water Distribution, Removing Debris Monitoring of Water Elevation of Uper Maasim Dam and Other O&M Activities",
    designation: "SWRFT",
    createdAt: 1771820253201,
  },
];

function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    return getApp();
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin credentials missing. Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY in .env.local",
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

async function seedAccomplishmentTasks() {
  initializeFirebaseAdmin();
  const db = getFirestore();
  const col = db.collection("accomplishment_tasks");

  for (const task of TASKS) {
    await col.doc(task.id).set({
      label: task.label,
      designation: task.designation,
      createdAt: task.createdAt,
    });
    console.log(`  Added: ${task.label.slice(0, 50)}...`);
  }

  console.log(`\n✅ Seeded ${TASKS.length} accomplishment tasks into accomplishment_tasks collection`);
}

seedAccomplishmentTasks()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
  });
