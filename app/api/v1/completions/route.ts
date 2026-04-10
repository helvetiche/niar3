import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getFirestore } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/security-headers";
import type { ScheduleDeadlineType, TaskCompletion } from "@/types/schedule";
import { logger } from "@/lib/logger";

const deadlineTypeEnum = z.enum([
  "daily",
  "weekly",
  "monthly",
  "monthly-specific",
  "interval",
  "hourly",
  "per-minute",
  "custom",
]);

const createBodySchema = z
  .object({
    scheduleId: z.string().min(1),
    periodStart: z.string().min(1),
    periodEnd: z.string().min(1),
    deadlineType: deadlineTypeEnum,
    notes: z.string().optional(),
  })
  .strict();

export async function GET(request: NextRequest) {
  const auth = await withAuth(request, { action: "completions.get" });
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  try {
    const db = getFirestore();
    const snap = await db
      .collection("completions")
      .where("scheduleOwnerId", "==", user.uid)
      .get();

    const completions: TaskCompletion[] = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
      } as TaskCompletion;
    });

    completions.sort(
      (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );

    return applySecurityHeaders(NextResponse.json({ completions }));
  } catch (err) {
    logger.error("[api/completions GET]", err);
    return applySecurityHeaders(
      NextResponse.json({ error: "Failed to load completions" }, { status: 500 })
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await withAuth(request, { action: "completions.post" });
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  let body: z.infer<typeof createBodySchema>;
  try {
    const raw = await request.json();
    body = createBodySchema.parse(raw);
  } catch {
    return applySecurityHeaders(
      NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    );
  }

  const { scheduleId, periodStart, periodEnd, deadlineType, notes } = body;

  try {
    const db = getFirestore();
    const scheduleRef = db.collection("schedules").doc(scheduleId);
    const scheduleDoc = await scheduleRef.get();

    if (!scheduleDoc.exists) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Schedule not found" }, { status: 404 })
      );
    }

    const scheduleData = scheduleDoc.data();
    if (scheduleData?.userId !== user.uid) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Forbidden" }, { status: 403 })
      );
    }

    const existing = await db
      .collection("completions")
      .where("scheduleId", "==", scheduleId)
      .where("periodStart", "==", periodStart)
      .where("periodEnd", "==", periodEnd)
      .limit(1)
      .get();

    if (!existing.empty) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Task already completed for this period" },
          { status: 409 }
        )
      );
    }

    const assignedEmail =
      typeof scheduleData.personEmail === "string"
        ? scheduleData.personEmail
        : user.email || "";
    const assignedName =
      typeof scheduleData.personAssigned === "string"
        ? scheduleData.personAssigned
        : "";

    const completion: Omit<TaskCompletion, "id"> = {
      scheduleId,
      scheduleOwnerId: user.uid,
      userId: user.uid,
      completedAt: new Date().toISOString(),
      completedBy: user.email || "",
      completedByName: user.email?.split("@")[0] || undefined,
      periodStart,
      periodEnd,
      deadlineType: deadlineType as ScheduleDeadlineType,
      scheduleTitle: typeof scheduleData.title === "string" ? scheduleData.title : "",
      scheduleDescription:
        typeof scheduleData.description === "string" ? scheduleData.description : "",
      personAssigned: assignedName,
      personEmail: assignedEmail,
      ...(notes !== undefined && notes !== "" ? { notes } : {}),
    };

    const docRef = await db.collection("completions").add(completion);
    const created: TaskCompletion = { id: docRef.id, ...completion };

    return applySecurityHeaders(
      NextResponse.json({ completion: created }, { status: 201 })
    );
  } catch (err) {
    logger.error("[api/completions POST]", err);
    return applySecurityHeaders(
      NextResponse.json({ error: "Failed to save completion" }, { status: 500 })
    );
  }
}
