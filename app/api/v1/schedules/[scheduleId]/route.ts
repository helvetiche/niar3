import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "@/lib/firebase-admin";
import { requireAuth } from "@/lib/auth";
import { syncScheduleCache } from "@/lib/schedule-cache";
import type { Schedule } from "@/types/schedule";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  try {
    const user = await requireAuth();
    const db = getFirestore();
    const { scheduleId } = await params;
    const body = await request.json();

    const scheduleRef = db.collection("schedules").doc(scheduleId);
    const scheduleDoc = await scheduleRef.get();

    if (!scheduleDoc.exists) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    const scheduleData = scheduleDoc.data();
    if (scheduleData?.userId !== user.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { title, description, deadline, reminderDate, personAssigned, status } = body;

    const userEmail = user.email;
    if (!userEmail) {
      return NextResponse.json({ error: "User email required" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(deadline !== undefined && { deadline }),
      ...(reminderDate !== undefined && { reminderDate }),
      ...(personAssigned !== undefined && { personAssigned }),
      ...(status !== undefined && { status }),
      personEmail: userEmail,
      updatedAt: new Date().toISOString(),
    };

    await scheduleRef.update(updateData);

    const updatedDoc = await scheduleRef.get();
    const data = updatedDoc.data();
    const schedule: Schedule = {
      id: updatedDoc.id,
      ...(data as Omit<Schedule, "id">),
    };

    // Auto-sync cache after updating schedule
    console.log("[AUTO-SYNC] Syncing cache after schedule update...");
    syncScheduleCache().catch((error) => {
      console.error("[AUTO-SYNC] Failed to sync cache:", error);
      // Don't fail the request if cache sync fails
    });

    return NextResponse.json({ schedule });
  } catch (error) {
    console.error("Error updating schedule:", error);
    return NextResponse.json({ error: "Failed to update schedule" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  try {
    const user = await requireAuth();
    const db = getFirestore();
    const { scheduleId } = await params;

    const scheduleRef = db.collection("schedules").doc(scheduleId);
    const scheduleDoc = await scheduleRef.get();

    if (!scheduleDoc.exists) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    const scheduleData = scheduleDoc.data();
    if (scheduleData?.userId !== user.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await scheduleRef.delete();

    // Auto-sync cache after deleting schedule
    console.log("[AUTO-SYNC] Syncing cache after schedule deletion...");
    syncScheduleCache().catch((error) => {
      console.error("[AUTO-SYNC] Failed to sync cache:", error);
      // Don't fail the request if cache sync fails
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting schedule:", error);
    return NextResponse.json({ error: "Failed to delete schedule" }, { status: 500 });
  }
}
