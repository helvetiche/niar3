import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "@/lib/firebase-admin";
import { requireAuth } from "@/lib/auth";
import type { Schedule } from "@/types/schedule";
import { syncScheduleCache } from "@/lib/schedule-cache";

const ITEMS_PER_PAGE = 10;

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getFirestore();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || String(ITEMS_PER_PAGE), 10);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    // Get total count for pagination
    const totalSnapshot = await db
      .collection("schedules")
      .where("userId", "==", user.uid)
      .get();
    
    let filteredSchedules = totalSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Schedule[];

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filteredSchedules = filteredSchedules.filter(
        (schedule) =>
          schedule.title.toLowerCase().includes(searchLower) ||
          schedule.description?.toLowerCase().includes(searchLower) ||
          schedule.personAssigned?.toLowerCase().includes(searchLower) ||
          schedule.personEmail?.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (status && (status === "active" || status === "inactive")) {
      filteredSchedules = filteredSchedules.filter(
        (schedule) => schedule.status === status
      );
    }

    const totalItems = filteredSchedules.length;
    const itemsPerPage = Math.min(limit, 1000); // Max 1000 items
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const paginatedSchedules = filteredSchedules.slice(
      startIndex,
      startIndex + itemsPerPage
    );

    return NextResponse.json({
      schedules: paginatedSchedules,
      pagination: {
        page,
        totalPages,
        totalItems,
        itemsPerPage,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
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
      status,
    } = body;

    // Force the email to be the current user's email for security
    const userEmail = user.email;

    if (!title || !userEmail || !deadline || !reminderDate) {
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
      personAssigned: personAssigned || userEmail.split("@")[0],
      personEmail: userEmail,
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
