import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { setCalendarNotesForDate } from "@/lib/firebase-admin/firestore";

/** PUT /api/v1/calendar-notes/[dateKey] - Save notes for a date (YYYY-MM-DD) */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ dateKey: string }> },
) {
  const result = await getSession();
  if (!result.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { dateKey } = await params;
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return NextResponse.json(
      { error: "Invalid dateKey (use YYYY-MM-DD)" },
      { status: 400 },
    );
  }
  let body: { items?: { text: string; color: string }[] };
  try {
    body = await request.json();
  } catch {
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
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/calendar-notes PUT]", err);
    return NextResponse.json(
      { error: "Failed to save notes" },
      { status: 500 },
    );
  }
}
