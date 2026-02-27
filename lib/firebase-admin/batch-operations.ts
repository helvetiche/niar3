import "server-only";
import { getFirestore } from "firebase-admin/firestore";
import { getFirebaseAdminApp } from "./app";
import { logger } from "@/lib/logger";

const MAX_BATCH_SIZE = 500;

/**
 * Executes Firestore writes in batches to prevent data corruption.
 * Automatically splits large operations into multiple batches.
 * @param operations - Array of write operations to execute
 * @returns Number of successful operations
 */
export async function executeBatchWrites(
  operations: Array<{
    type: "set" | "update" | "delete";
    path: string;
    data?: Record<string, unknown>;
    merge?: boolean;
  }>,
): Promise<number> {
  const db = getFirestore(getFirebaseAdminApp());
  let successCount = 0;

  for (let i = 0; i < operations.length; i += MAX_BATCH_SIZE) {
    const batch = db.batch();
    const chunk = operations.slice(i, i + MAX_BATCH_SIZE);

    chunk.forEach((op) => {
      const ref = db.doc(op.path);

      switch (op.type) {
        case "set":
          if (op.data) {
            batch.set(ref, op.data, { merge: op.merge ?? false });
          }
          break;
        case "update":
          if (op.data) {
            batch.update(ref, op.data);
          }
          break;
        case "delete":
          batch.delete(ref);
          break;
      }
    });

    await batch.commit();
    successCount += chunk.length;
  }

  return successCount;
}

/**
 * Bulk updates user custom claims in batches.
 * Useful for role/permission migrations.
 * @param updates - Array of user ID and claims to update
 * @returns Number of successful updates
 */
export async function bulkUpdateUserClaims(
  updates: Array<{ uid: string; claims: Record<string, unknown> }>,
): Promise<number> {
  const { getAdminAuth } = await import("./app");
  const auth = getAdminAuth();
  let successCount = 0;

  for (const update of updates) {
    try {
      await auth.setCustomUserClaims(update.uid, update.claims);
      successCount++;
    } catch (error) {
      logger.error(`Failed to update claims for ${update.uid}:`, error);
    }
  }

  return successCount;
}

/**
 * Bulk deletes documents from Firestore in batches.
 * @param paths - Array of document paths to delete
 * @returns Number of successful deletions
 */
export async function bulkDeleteDocuments(paths: string[]): Promise<number> {
  return executeBatchWrites(
    paths.map((path) => ({ type: "delete" as const, path })),
  );
}

/**
 * Bulk creates or updates documents in Firestore.
 * @param documents - Array of documents with path and data
 * @param merge - Whether to merge with existing data
 * @returns Number of successful operations
 */
export async function bulkUpsertDocuments(
  documents: Array<{ path: string; data: Record<string, unknown> }>,
  merge = true,
): Promise<number> {
  return executeBatchWrites(
    documents.map((doc) => ({
      type: "set" as const,
      path: doc.path,
      data: doc.data,
      merge,
    })),
  );
}
