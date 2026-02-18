import "server-only";
import { getDatabase, type Database } from "firebase-admin/database";
import { getFirebaseAdminApp } from "./app";

let database: Database | null = null;

const getDefaultRealtimeDatabaseUrl = (): string => {
  const explicitUrl = process.env.FIREBASE_DATABASE_URL?.trim();
  if (explicitUrl) return explicitUrl;

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID?.trim();
  if (!projectId) {
    throw new Error(
      "Realtime Database URL is missing. Set FIREBASE_DATABASE_URL or FIREBASE_ADMIN_PROJECT_ID.",
    );
  }

  return `https://${projectId}-default-rtdb.firebaseio.com`;
};

export function getAdminRealtimeDatabase(): Database {
  if (database) return database;
  database = getDatabase(getFirebaseAdminApp(), getDefaultRealtimeDatabaseUrl());
  return database;
}
