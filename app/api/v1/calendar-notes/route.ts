import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { getCalendarNotes } from "@/lib/firebase-admin/firestore";
import { logAuditTrailEntry } from "@/lib/firebase-admin/audit-trail";

/** GET /api/v1/calendar-notes - Get all calendar notes for current user */
export async function GET(request: Request) {
  const result = await getSession();
  if (!result.user) {
    await logAuditTrailEntry({
      action: "calendar-notes.get",
      status: "rejected",
      route: "/api/v1/calendar-notes",
      method: "GET",
      request,
      httpStatus: 401,
      details: { reason: "unauthorized" },
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const notes = await getCalendarNotes(result.user.uid);
    await logAuditTrailEntry({
      uid: result.user.uid,
      action: "calendar-notes.get",
      status: "success",
      route: "/api/v1/calendar-notes",
      method: "GET",
      request,
      httpStatus: 200,
      details: { dateCount: Object.keys(notes).length },
    });
    return NextResponse.json(notes);
  } catch (err) {
    console.error("[api/calendar-notes GET]", err);
    await logAuditTrailEntry({
      uid: result.user.uid,
      action: "calendar-notes.get",
      status: "error",
      route: "/api/v1/calendar-notes",
      method: "GET",
      request,
      httpStatus: 500,
      errorMessage: "Failed to load notes",
    });
    return NextResponse.json(
      { error: "Failed to load notes" },
      { status: 500 },
    );
  }
}
