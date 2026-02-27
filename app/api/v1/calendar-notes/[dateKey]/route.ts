import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/security-headers";
import { setCalendarNotesForDate } from "@/lib/firebase-admin/firestore";
import { logAuditTrailEntry } from "@/lib/firebase-admin/audit-trail";
import { logger } from "@/lib/logger";
import { stripHtml } from "@/lib/sanitize";

/** PUT /api/v1/calendar-notes/[dateKey] - Save notes for a date (YYYY-MM-DD) */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ dateKey: string }> },
) {
  const auth = await withAuth(request, {
    action: "calendar-notes.date-key.put",
  });
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { dateKey } = await params;
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    await logAuditTrailEntry({
      uid: user.uid,
      action: "calendar-notes.date-key.put",
      status: "rejected",
      route: "/api/v1/calendar-notes/[dateKey]",
      method: "PUT",
      request,
      httpStatus: 400,
      details: { reason: "invalid-date-key", dateKey },
    });
    return applySecurityHeaders(
      NextResponse.json(
        { error: "Invalid dateKey (use YYYY-MM-DD)" },
        { status: 400 },
      ),
    );
  }
  let body: { items?: { text: string; color: string }[] };
  try {
    const rawBody = await request.json();
    // Sanitize text inputs
    body = {
      items: Array.isArray(rawBody.items)
        ? rawBody.items.map((item: any) => ({
            text: typeof item.text === "string" ? stripHtml(item.text) : "",
            color: typeof item.color === "string" ? item.color : "",
          }))
        : undefined,
    };
  } catch {
    await logAuditTrailEntry({
      uid: user.uid,
      action: "calendar-notes.date-key.put",
      status: "rejected",
      route: "/api/v1/calendar-notes/[dateKey]",
      method: "PUT",
      request,
      httpStatus: 400,
      details: { reason: "invalid-json-body", dateKey },
    });
    return applySecurityHeaders(
      NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
    );
  }
  const MAX_ITEMS = 50;
  const MAX_TEXT_LENGTH = 1000;
  const MAX_COLOR_LENGTH = 20;

  const items = Array.isArray(body.items)
    ? body.items
        .slice(0, MAX_ITEMS)
        .filter(
          (x) => x && typeof x.text === "string" && typeof x.color === "string",
        )
        .map((x) => ({
          text: String(x.text).slice(0, MAX_TEXT_LENGTH),
          color: String(x.color).slice(0, MAX_COLOR_LENGTH),
        }))
    : [];
  try {
    await setCalendarNotesForDate(user.uid, dateKey, items);
    await logAuditTrailEntry({
      uid: user.uid,
      action: "calendar-notes.date-key.put",
      status: "success",
      route: "/api/v1/calendar-notes/[dateKey]",
      method: "PUT",
      request,
      httpStatus: 200,
      details: { dateKey, itemCount: items.length },
    });
    return applySecurityHeaders(NextResponse.json({ ok: true }));
  } catch (err) {
    logger.error("[api/calendar-notes PUT]", err);
    await logAuditTrailEntry({
      uid: user.uid,
      action: "calendar-notes.date-key.put",
      status: "error",
      route: "/api/v1/calendar-notes/[dateKey]",
      method: "PUT",
      request,
      httpStatus: 500,
      errorMessage: "Failed to save notes",
      details: { dateKey },
    });
    return applySecurityHeaders(
      NextResponse.json({ error: "Failed to save notes" }, { status: 500 }),
    );
  }
}
