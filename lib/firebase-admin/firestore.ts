import "server-only";
import { getFirestore } from "firebase-admin/firestore";
import { getFirebaseAdminApp } from "./app";

function getDb() {
  return getFirestore(getFirebaseAdminApp());
}

/**
 * Retrieves user profile data from Firestore.
 * @param uid - Firebase user ID
 * @returns Profile object with first, middle, last name and birthday
 */
export async function getProfile(uid: string): Promise<{
  first: string;
  middle: string;
  last: string;
  birthday: string;
}> {
  const ref = getDb().doc(`users/${uid}/profile/default`);
  const snap = await ref.get();
  if (snap.exists) {
    const d = snap.data();
    return {
      first: d?.first ?? "",
      middle: d?.middle ?? "",
      last: d?.last ?? "",
      birthday: d?.birthday ?? "",
    };
  }
  return { first: "", middle: "", last: "", birthday: "" };
}

/**
 * Saves user profile to Firestore using merge strategy.
 * @param uid - Firebase user ID
 * @param profile - Profile data to save
 */
export async function setProfile(
  uid: string,
  profile: { first: string; middle: string; last: string; birthday: string },
): Promise<void> {
  const ref = getDb().doc(`users/${uid}/profile/default`);
  await ref.set(profile, { merge: true });
}

/**
 * Retrieves all calendar notes for a user.
 * @param uid - Firebase user ID
 * @returns Record of date keys mapped to arrays of note items
 */
export async function getCalendarNotes(
  uid: string,
): Promise<Record<string, { text: string; color: string }[]>> {
  const colRef = getDb()
    .collection("users")
    .doc(uid)
    .collection("calendar_notes");
  const snap = await colRef.get();
  const out: Record<string, { text: string; color: string }[]> = {};
  snap.docs.forEach((d) => {
    const data = d.data();
    const items = (data.items ?? []) as { text: string; color: string }[];
    out[d.id] = items;
  });
  return out;
}

/**
 * Saves calendar notes for a specific date.
 * @param uid - Firebase user ID
 * @param dateKey - Date identifier (e.g., "2024-01-15")
 * @param items - Array of note items with text and color
 */
export async function setCalendarNotesForDate(
  uid: string,
  dateKey: string,
  items: { text: string; color: string }[],
): Promise<void> {
  const ref = getDb().doc(`users/${uid}/calendar_notes/${dateKey}`);
  await ref.set({ items }, { merge: true });
}

export type TemplateScope = "ifr-scanner" | "consolidate-ifr" | "swrft";

export type StoredTemplate = {
  id: string;
  name: string;
  scope: TemplateScope;
  storagePath: string;
  contentType: string;
  sizeBytes: number;
  createdAt: number;
  updatedAt: number;
  uploaderUid: string;
  updatedByUid: string;
};

const isTemplateScope = (value: unknown): value is TemplateScope =>
  value === "ifr-scanner" || value === "consolidate-ifr" || value === "swrft";

function templateCollection() {
  return getDb().collection("templates");
}

function asStoredTemplate(
  id: string,
  data: Record<string, unknown> | undefined,
): StoredTemplate | null {
  if (!data) return null;
  const scope = data.scope;
  if (!isTemplateScope(scope)) return null;
  return {
    id,
    name: typeof data.name === "string" ? data.name : "",
    scope,
    storagePath: typeof data.storagePath === "string" ? data.storagePath : "",
    contentType:
      typeof data.contentType === "string"
        ? data.contentType
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    sizeBytes: typeof data.sizeBytes === "number" ? data.sizeBytes : 0,
    createdAt: typeof data.createdAt === "number" ? data.createdAt : Date.now(),
    updatedAt:
      typeof data.updatedAt === "number"
        ? data.updatedAt
        : typeof data.createdAt === "number"
          ? data.createdAt
          : Date.now(),
    uploaderUid: typeof data.uploaderUid === "string" ? data.uploaderUid : "",
    updatedByUid:
      typeof data.updatedByUid === "string"
        ? data.updatedByUid
        : typeof data.uploaderUid === "string"
          ? data.uploaderUid
          : "",
  };
}

export async function listTemplates(
  scope?: TemplateScope,
): Promise<StoredTemplate[]> {
  const collection = templateCollection();
  const snap = scope
    ? await collection.where("scope", "==", scope).get()
    : await collection.get();
  const items = snap.docs
    .map((doc) => asStoredTemplate(doc.id, doc.data()))
    .filter((item): item is StoredTemplate => Boolean(item));

  return items.sort((a, b) => b.createdAt - a.createdAt);
}

export async function createTemplateRecord(
  template: {
    id: string;
    name: string;
    scope: TemplateScope;
    storagePath: string;
    contentType: string;
    sizeBytes: number;
  },
  uploaderUid: string,
): Promise<StoredTemplate> {
  const now = Date.now();
  const record: StoredTemplate = {
    ...template,
    createdAt: now,
    updatedAt: now,
    uploaderUid,
    updatedByUid: uploaderUid,
  };
  await templateCollection().doc(record.id).set(record);
  return record;
}

export async function getTemplateRecord(
  templateId: string,
): Promise<StoredTemplate | null> {
  const snap = await templateCollection().doc(templateId).get();
  if (!snap.exists) return null;
  return asStoredTemplate(snap.id, snap.data());
}

export async function updateTemplateRecord(
  templateId: string,
  updates: {
    name?: string;
    storagePath?: string;
    contentType?: string;
    sizeBytes?: number;
  },
  updatedByUid: string,
): Promise<StoredTemplate | null> {
  const ref = templateCollection().doc(templateId);
  const existing = await ref.get();
  if (!existing.exists) return null;

  const payload: Record<string, unknown> = {
    updatedAt: Date.now(),
    updatedByUid,
  };
  if (typeof updates.name === "string" && updates.name.trim()) {
    payload.name = updates.name.trim();
  }
  if (typeof updates.storagePath === "string" && updates.storagePath.trim()) {
    payload.storagePath = updates.storagePath.trim();
  }
  if (typeof updates.contentType === "string" && updates.contentType.trim()) {
    payload.contentType = updates.contentType.trim();
  }
  if (
    typeof updates.sizeBytes === "number" &&
    Number.isFinite(updates.sizeBytes)
  ) {
    payload.sizeBytes = updates.sizeBytes;
  }

  await ref.set(payload, { merge: true });
  const next = await ref.get();
  return asStoredTemplate(next.id, next.data());
}

export async function deleteTemplateRecord(templateId: string): Promise<void> {
  await templateCollection().doc(templateId).delete();
}

export type AccomplishmentTaskDesignation = "SWRFT" | "WRFOB";

export type AccomplishmentTask = {
  id: string;
  label: string;
  designation: AccomplishmentTaskDesignation;
  createdAt: number;
};

function accomplishmentTasksCollection() {
  return getDb().collection("accomplishment_tasks");
}

export async function listAccomplishmentTasks(): Promise<AccomplishmentTask[]> {
  const snap = await accomplishmentTasksCollection()
    .orderBy("createdAt", "asc")
    .get();
  const validDesignations = ["SWRFT", "WRFOB"] as const;
  return snap.docs.map((doc) => {
    const d = doc.data();
    const des =
      typeof d.designation === "string" &&
      validDesignations.includes(
        d.designation as (typeof validDesignations)[number],
      )
        ? (d.designation as AccomplishmentTaskDesignation)
        : "SWRFT";
    return {
      id: doc.id,
      label: typeof d.label === "string" ? d.label.trim() : "",
      designation: des,
      createdAt: typeof d.createdAt === "number" ? d.createdAt : 0,
    };
  });
}

export async function createAccomplishmentTask(
  label: string,
  designation: AccomplishmentTaskDesignation = "SWRFT",
): Promise<AccomplishmentTask> {
  const trimmed = label.trim();
  if (!trimmed) {
    throw new Error("Task label is required");
  }
  const des =
    designation === "SWRFT" || designation === "WRFOB" ? designation : "SWRFT";
  const ref = accomplishmentTasksCollection().doc();
  const now = Date.now();
  const task: AccomplishmentTask = {
    id: ref.id,
    label: trimmed,
    designation: des,
    createdAt: now,
  };
  await ref.set(task);
  return task;
}

export async function deleteAccomplishmentTask(taskId: string): Promise<void> {
  await accomplishmentTasksCollection().doc(taskId).delete();
}
