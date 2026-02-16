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
