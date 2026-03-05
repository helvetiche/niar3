import "server-only";
import { getStorage } from "firebase-admin/storage";
import { getFirebaseAdminApp } from "./app";
import { withRetry } from "@/lib/retry";
import { logger } from "@/lib/logger";

/**
 * Resolves the Firebase Storage bucket name from environment variables.
 * Priority: FIREBASE_ADMIN_STORAGE_BUCKET > NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET > projectId.appspot.com
 * @returns Storage bucket name
 * @throws Error if bucket cannot be determined
 */
const getBucketName = (): string => {
  const explicit = process.env.FIREBASE_ADMIN_STORAGE_BUCKET;
  if (explicit) return explicit;

  const publicBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (publicBucket) return publicBucket;

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  if (!projectId) {
    throw new Error(
      "Storage bucket missing. Set FIREBASE_ADMIN_STORAGE_BUCKET or NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET.",
    );
  }
  return `${projectId}.appspot.com`;
};

function getBucket() {
  return getStorage(getFirebaseAdminApp()).bucket(getBucketName());
}

/**
 * Uploads a buffer to Firebase Storage at the specified path with retry logic.
 * @param storagePath - Destination path in storage bucket
 * @param buffer - File content as Buffer
 * @param contentType - MIME type of the file
 */
export async function uploadBufferToStorage(
  storagePath: string,
  buffer: Buffer,
  contentType: string,
): Promise<void> {
  await withRetry(
    async () => {
      await getBucket().file(storagePath).save(buffer, {
        resumable: false,
        contentType,
      });
    },
    { maxAttempts: 3, delayMs: 1000 },
  );
}

/**
 * Downloads a file from Firebase Storage as a Buffer with retry logic.
 * @param storagePath - Source path in storage bucket
 * @returns File content as Buffer
 */
export async function downloadBufferFromStorage(
  storagePath: string,
): Promise<Buffer> {
  return await withRetry(
    async () => {
      const [contents] = await getBucket().file(storagePath).download();
      return contents;
    },
    { maxAttempts: 3, delayMs: 1000 },
  );
}

/**
 * Deletes a file from Firebase Storage with retry logic.
 * Ignores errors if file doesn't exist.
 * @param storagePath - Path to file in storage bucket
 */
export async function deleteFromStorage(storagePath: string): Promise<void> {
  try {
    await withRetry(
      async () => {
        await getBucket().file(storagePath).delete({ ignoreNotFound: true });
      },
      { maxAttempts: 2, delayMs: 500 },
    );
  } catch (error) {
    // Log but don't throw - deletion is best-effort
    logger.warn(`Failed to delete file from storage: ${storagePath}`, error);
  }
}
