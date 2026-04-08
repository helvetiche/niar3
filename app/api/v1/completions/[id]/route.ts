import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/security-headers";
import { logger } from "@/lib/logger";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await withAuth(request, { action: "completions.delete" });
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { id } = await params;
  if (!id) {
    return applySecurityHeaders(
      NextResponse.json({ error: "Completion ID is required" }, { status: 400 }),
    );
  }

  try {
    const db = getFirestore();
    const docRef = db.collection("completions").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Completion not found" }, { status: 404 }),
      );
    }

    const data = doc.data();
    const ownerId = data?.scheduleOwnerId as string | undefined;
    if (ownerId && ownerId !== user.uid) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      );
    }

    const scheduleId = data?.scheduleId as string | undefined;
    if (scheduleId) {
      const scheduleDoc = await db.collection("schedules").doc(scheduleId).get();
      if (scheduleDoc.exists) {
        const scheduleUserId = scheduleDoc.data()?.userId;
        if (scheduleUserId !== user.uid) {
          return applySecurityHeaders(
            NextResponse.json({ error: "Forbidden" }, { status: 403 }),
          );
        }
      }
    } else if (!ownerId) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      );
    }

    await docRef.delete();
    return applySecurityHeaders(NextResponse.json({ ok: true, id }));
  } catch (err) {
    logger.error("[api/completions DELETE]", err);
    return applySecurityHeaders(
      NextResponse.json({ error: "Failed to remove completion" }, { status: 500 }),
    );
  }
}
