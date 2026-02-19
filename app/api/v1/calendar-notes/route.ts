import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/security-headers";
import { getCalendarNotes } from "@/lib/firebase-admin/firestore";
import { logAuditTrailEntry } from "@/lib/firebase-admin/audit-trail";
import { logger } from "@/lib/logger";

/** GET /api/v1/calendar-notes - Get all calendar notes for current user */
export async function GET(request: Request) {
  const auth = await withAuth(request, { action: "calendar-notes.get" });
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  try {
    const notes = await getCalendarNotes(user.uid);
    await logAuditTrailEntry({
      uid: user.uid,
      action: "calendar-notes.get",
      status: "success",
      route: "/api/v1/calendar-notes",
      method: "GET",
      request,
      httpStatus: 200,
      details: { dateCount: Object.keys(notes).length },
    });
    return applySecurityHeaders(NextResponse.json(notes));
  } catch (err) {
    logger.error("[api/calendar-notes GET]", err);
    await logAuditTrailEntry({
      uid: user.uid,
      action: "calendar-notes.get",
      status: "error",
      route: "/api/v1/calendar-notes",
      method: "GET",
      request,
      httpStatus: 500,
      errorMessage: "Failed to load notes",
    });
    return applySecurityHeaders(
      NextResponse.json({ error: "Failed to load notes" }, { status: 500 }),
    );
  }
}
