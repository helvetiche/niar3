import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getFirestore } from "@/lib/firebase-admin";
import { logger } from "@/lib/logger";
import { generateMonthlyCompletionsWorkbook } from "@/lib/task-completions-export";
import { applySecurityHeaders, secureFileResponse } from "@/lib/security-headers";
import type { TaskCompletion } from "@/types/schedule";

const sanitizeForFilename = (value: string): string =>
  value.replace(/[\\/:*?"<>|]/g, "-").trim();

export async function GET(request: NextRequest) {
  const auth = await withAuth(request, { action: "completions.export.get" });
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { user } = auth;
  const requestUrl = new URL(request.url);
  const yearParam = requestUrl.searchParams.get("year");
  const parsedYear = Number.parseInt(yearParam ?? "", 10);
  const year = Number.isFinite(parsedYear) ? parsedYear : new Date().getFullYear();

  if (year < 2000 || year > 2100) {
    return applySecurityHeaders(
      NextResponse.json(
        { error: "Invalid year. Please provide a value between 2000 and 2100." },
        { status: 400 }
      )
    );
  }

  try {
    const db = getFirestore();
    const snapshot = await db
      .collection("completions")
      .where("scheduleOwnerId", "==", user.uid)
      .get();

    const completions: TaskCompletion[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<TaskCompletion, "id">),
    }));

    const fullNameFallback = user.email?.split("@")[0] ?? "User";
    const workbookBuffer = await generateMonthlyCompletionsWorkbook(
      completions,
      year,
      fullNameFallback
    );

    const fileName = `${sanitizeForFilename(fullNameFallback)}-accomplishments-${year}.xlsx`;
    return secureFileResponse(workbookBuffer, {
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename: fileName,
      extraHeaders: {
        "X-Accomplishment-Export-Year": String(year),
      },
    });
  } catch (error) {
    logger.error("[api/completions/export GET]", error);
    return applySecurityHeaders(
      NextResponse.json({ error: "Failed to export accomplishments." }, { status: 500 })
    );
  }
}
