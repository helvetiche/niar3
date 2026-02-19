import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/security-headers";
import { getAuditTrailEntries } from "@/lib/firebase-admin/audit-trail";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const auth = await withAuth(request, { action: "audit-trail.get" });
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  try {
    const url = new URL(request.url);
    const limitRaw = url.searchParams.get("limit");
    const limit = limitRaw ? Number(limitRaw) : 50;
    const entries = await getAuditTrailEntries(user.uid, limit);
    return applySecurityHeaders(NextResponse.json({ entries }));
  } catch (error) {
    logger.error("[api/audit-trail GET]", error);
    return applySecurityHeaders(
      NextResponse.json(
        { error: "Failed to fetch audit trail" },
        { status: 500 },
      ),
    );
  }
}
