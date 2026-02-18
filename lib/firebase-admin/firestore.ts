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
};

const isTemplateScope = (value: unknown): value is TemplateScope =>
  value === "ifr-scanner" || value === "consolidate-ifr";

function templateCollection(uid: string) {
  return getDb().collection("users").doc(uid).collection("templates");
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
  };
}

export async function listTemplates(
  uid: string,
  scope?: TemplateScope,
): Promise<StoredTemplate[]> {
  const snap = await templateCollection(uid).get();
  const items = snap.docs
    .map((doc) => asStoredTemplate(doc.id, doc.data()))
    .filter((item): item is StoredTemplate => Boolean(item));

  const filtered = scope ? items.filter((item) => item.scope === scope) : items;
  return filtered.sort((a, b) => b.createdAt - a.createdAt);
}

export async function createTemplateRecord(
  uid: string,
  template: Omit<StoredTemplate, "id" | "createdAt"> & { id: string },
): Promise<StoredTemplate> {
  const record: StoredTemplate = {
    ...template,
    createdAt: Date.now(),
  };
  await templateCollection(uid).doc(record.id).set(record);
  return record;
}

export async function getTemplateRecord(
  uid: string,
  templateId: string,
): Promise<StoredTemplate | null> {
  const snap = await templateCollection(uid).doc(templateId).get();
  if (!snap.exists) return null;
  return asStoredTemplate(snap.id, snap.data());
}

export async function deleteTemplateRecord(
  uid: string,
  templateId: string,
): Promise<void> {
  await templateCollection(uid).doc(templateId).delete();
}
