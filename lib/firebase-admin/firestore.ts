import "server-only";
import { getFirestore } from "firebase-admin/firestore";
import { getFirebaseAdminApp } from "./app";

function getDb() {
  return getFirestore(getFirebaseAdminApp());
}

/** Get profile for a user. Path: users/{uid}/profile/default */
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

/** Save profile to Firestore */
export async function setProfile(
  uid: string,
  profile: { first: string; middle: string; last: string; birthday: string },
): Promise<void> {
  const ref = getDb().doc(`users/${uid}/profile/default`);
  await ref.set(profile, { merge: true });
}

/** Get calendar notes for a user. Path: users/{uid}/calendar_notes */
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

/** Save a single date's notes */
export async function setCalendarNotesForDate(
  uid: string,
  dateKey: string,
  items: { text: string; color: string }[],
): Promise<void> {
  const ref = getDb().doc(`users/${uid}/calendar_notes/${dateKey}`);
  await ref.set({ items }, { merge: true });
}

export type TemplateScope = "ifr-scanner" | "consolidate-ifr";

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
  value === "ifr-scanner" || value === "consolidate-ifr";

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
