import "server-only";
import { getStorage } from "firebase-admin/storage";
import { getFirebaseAdminApp } from "./app";

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

export async function uploadBufferToStorage(
  storagePath: string,
  buffer: Buffer,
  contentType: string,
): Promise<void> {
  await getBucket().file(storagePath).save(buffer, {
    resumable: false,
    contentType,
  });
}

export async function downloadBufferFromStorage(
  storagePath: string,
): Promise<Buffer> {
  const [contents] = await getBucket().file(storagePath).download();
  return contents;
}

export async function deleteFromStorage(storagePath: string): Promise<void> {
  await getBucket().file(storagePath).delete({ ignoreNotFound: true });
}
