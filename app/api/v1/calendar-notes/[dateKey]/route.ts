import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { setCalendarNotesForDate } from "@/lib/firebase-admin/firestore";
import { logAuditTrailEntry } from "@/lib/firebase-admin/audit-trail";

/** PUT /api/v1/calendar-notes/[dateKey] - Save notes for a date (YYYY-MM-DD) */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ dateKey: string }> },
) {
  const result = await getSession();
  if (!result.user) {
    await logAuditTrailEntry({
      action: "calendar-notes.date-key.put",
      status: "rejected",
      route: "/api/v1/calendar-notes/[dateKey]",
      method: "PUT",
      request,
      httpStatus: 401,
      details: { reason: "unauthorized" },
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { dateKey } = await params;
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    await logAuditTrailEntry({
      uid: result.user.uid,
      action: "calendar-notes.date-key.put",
      status: "rejected",
      route: "/api/v1/calendar-notes/[dateKey]",
      method: "PUT",
      request,
      httpStatus: 400,
      details: { reason: "invalid-date-key", dateKey },
    });
    return NextResponse.json(
      { error: "Invalid dateKey (use YYYY-MM-DD)" },
      { status: 400 },
    );
  }
  let body: { items?: { text: string; color: string }[] };
  try {
    body = await request.json();
  } catch {
    await logAuditTrailEntry({
      uid: result.user.uid,
      action: "calendar-notes.date-key.put",
      status: "rejected",
      route: "/api/v1/calendar-notes/[dateKey]",
      method: "PUT",
      request,
      httpStatus: 400,
      details: { reason: "invalid-json-body", dateKey },
    });
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const items = Array.isArray(body.items)
    ? body.items
        .filter(
          (x) => x && typeof x.text === "string" && typeof x.color === "string",
        )
        .map((x) => ({ text: String(x.text), color: String(x.color) }))
    : [];
  try {
    await setCalendarNotesForDate(result.user.uid, dateKey, items);
    await logAuditTrailEntry({
      uid: result.user.uid,
      action: "calendar-notes.date-key.put",
      status: "success",
      route: "/api/v1/calendar-notes/[dateKey]",
      method: "PUT",
      request,
      httpStatus: 200,
      details: { dateKey, itemCount: items.length },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/calendar-notes PUT]", err);
    await logAuditTrailEntry({
      uid: result.user.uid,
      action: "calendar-notes.date-key.put",
      status: "error",
      route: "/api/v1/calendar-notes/[dateKey]",
      method: "PUT",
      request,
      httpStatus: 500,
      errorMessage: "Failed to save notes",
      details: { dateKey },
    });
    return NextResponse.json(
      { error: "Failed to save notes" },
      { status: 500 },
    );
  }
}
