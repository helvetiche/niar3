import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "@/lib/firebase-admin";
import { requireAuth } from "@/lib/auth";
import type { Schedule } from "@/types/schedule";
import { syncScheduleCache } from "@/lib/schedule-cache";

export async function GET(_request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getFirestore();

    const schedulesSnapshot = await db
      .collection("schedules")
      .where("userId", "==", user.uid)
      .orderBy("createdAt", "desc")
      .get();

    const schedules: Schedule[] = schedulesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Schedule[];

    return NextResponse.json({ schedules });
  } catch (error) {
    console.error("Error fetching schedules:", error);
    return NextResponse.json(
      { error: "Failed to fetch schedules" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getFirestore();
    const body = await request.json();

    const {
      title,
      description,
      deadline,
      reminderDate,
      personAssigned,
      personEmail,
      status,
    } = body;

    if (!title || !personAssigned || !personEmail || !deadline || !reminderDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const scheduleData: Omit<Schedule, "id"> = {
      userId: user.uid,
      title,
      description: description || "",
      deadline,
      reminderDate,
      personAssigned,
      personEmail,
      status: status || "active",
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await db.collection("schedules").add(scheduleData);

    const schedule: Schedule = {
      id: docRef.id,
      ...scheduleData,
    };

    // Auto-sync cache after creating schedule
    console.log("[AUTO-SYNC] Syncing cache after schedule creation...");
    syncScheduleCache().catch((error) => {
      console.error("[AUTO-SYNC] Failed to sync cache:", error);
      // Don't fail the request if cache sync fails
    });

    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error) {
    console.error("Error creating schedule:", error);
    return NextResponse.json(
      { error: "Failed to create schedule" },
      { status: 500 }
    );
  }
}
