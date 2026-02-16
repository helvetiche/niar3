import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { getCalendarNotes } from "@/lib/firebase-admin/firestore";

/** GET /api/v1/calendar-notes - Get all calendar notes for current user */
export async function GET() {
  const result = await getSession();
  if (!result.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const notes = await getCalendarNotes(result.user.uid);
    return NextResponse.json(notes);
  } catch (err) {
    console.error("[api/calendar-notes GET]", err);
    return NextResponse.json(
      { error: "Failed to load notes" },
      { status: 500 },
    );
  }
}
