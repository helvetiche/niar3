import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { getAuditTrailEntries } from "@/lib/firebase-admin/audit-trail";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const limitRaw = url.searchParams.get("limit");
    const limit = limitRaw ? Number(limitRaw) : 50;
    const entries = await getAuditTrailEntries(session.user.uid, limit);
    return NextResponse.json({ entries });
  } catch (error) {
    console.error("[api/audit-trail GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch audit trail" },
      { status: 500 },
    );
  }
}
