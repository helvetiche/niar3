import "server-only";
import { getFirestore as getFirestoreAdmin } from "firebase-admin/firestore";
import { getFirebaseAdminApp } from "./app";

/**
 * Get Firestore instance for server-side operations
 * @returns Firestore instance
 */
export function getFirestore() {
  return getFirestoreAdmin(getFirebaseAdminApp());
}

// Re-export other commonly used functions
export * from "./firestore";
export * from "./accounts";
export * from "./audit-trail";
export * from "./inventory";
export * from "./storage";
