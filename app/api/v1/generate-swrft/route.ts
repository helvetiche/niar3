import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/security-headers";
import { logAuditTrailEntry } from "@/lib/firebase-admin/audit-trail";
import { getTemplateBuffer } from "@/lib/firebase-admin/firestore";
import { generateYearSwrftBuffers } from "@/lib/swrftGenerator";
import { mergeExcelBuffers } from "@/lib/merge-files";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  const auth = await withAuth(request, { action: "generate-swrft.post" });
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  try {
    const body = (await request.json()) as {
      fullName?: string;
      reportType?: string;
      year?: number;
      templateId?: string;
    };

    const { fullName, reportType, year, templateId } = body;

    if (!fullName?.trim()) {
      await logAuditTrailEntry({
        uid: user.uid,
        action: "generate-swrft.post",
        status: "rejected",
        route: "/api/v1/generate-swrft",
        method: "POST",
        request,
        httpStatus: 400,
        details: { reason: "missing-fullName" },
      });
      return applySecurityHeaders(
        NextResponse.json({ error: "Full name is required" }, { status: 400 }),
      );
    }

    if (!reportType?.trim()) {
      await logAuditTrailEntry({
        uid: user.uid,
        action: "generate-swrft.post",
        status: "rejected",
        route: "/api/v1/generate-swrft",
        method: "POST",
        request,
        httpStatus: 400,
        details: { reason: "missing-reportType" },
      });
      return applySecurityHeaders(
        NextResponse.json({ error: "Report type is required" }, { status: 400 }),
      );
    }

    if (!year || year < 2000 || year > 2100) {
      await logAuditTrailEntry({
        uid: user.uid,
        action: "generate-swrft.post",
        status: "rejected",
        route: "/api/v1/generate-swrft",
        method: "POST",
        request,
        httpStatus: 400,
        details: { reason: "invalid-year", year },
      });
      return applySecurityHeaders(
        NextResponse.json({ error: "Valid year is required" }, { status: 400 }),
      );
    }

    if (!templateId?.trim()) {
      await logAuditTrailEntry({
        uid: user.uid,
        action: "generate-swrft.post",
        status: "rejected",
        route: "/api/v1/generate-swrft",
        method: "POST",
        request,
        httpStatus: 400,
        details: { reason: "missing-templateId" },
      });
      return applySecurityHeaders(
        NextResponse.json({ error: "Template ID is required" }, { status: 400 }),
      );
    }

    const templateBuffer = await getTemplateBuffer(templateId);
    if (!templateBuffer) {
      await logAuditTrailEntry({
        uid: user.uid,
        action: "generate-swrft.post",
        status: "rejected",
        route: "/api/v1/generate-swrft",
        method: "POST",
        request,
        httpStatus: 404,
        details: { reason: "template-not-found", templateId },
      });
      return applySecurityHeaders(
        NextResponse.json({ error: "Template not found" }, { status: 404 }),
      );
    }

    const swrftBuffers = await generateYearSwrftBuffers(
      fullName.trim(),
      reportType.trim(),
      year,
      templateBuffer,
    );

    const mergedBuffer = await mergeExcelBuffers({
      inputFiles: swrftBuffers.map((item) => ({
        fileName: item.filename,
        buffer: item.buffer,
      })),
      fileName: `${fullName.trim()} - SWRFT - ${year}`,
      excelPageNames: swrftBuffers.map((item) =>
        item.filename.replace(".xlsx", ""),
      ),
    });

    await logAuditTrailEntry({
      uid: user.uid,
      action: "generate-swrft.post",
      status: "success",
      route: "/api/v1/generate-swrft",
      method: "POST",
      request,
      httpStatus: 200,
      details: {
        fullName,
        reportType,
        year,
        filesGenerated: swrftBuffers.length,
      },
    });

    const filename = `${fullName.trim()} - SWRFT - ${year}.xlsx`;

    return new NextResponse(mergedBuffer.buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        ...applySecurityHeaders(new NextResponse()).headers,
      },
    });
  } catch (error) {
    logger.error("[api/generate-swrft POST]", error);
    const errorMessage =
      error instanceof Error ? error.message : "Something went wrong";
    await logAuditTrailEntry({
      uid: user.uid,
      action: "generate-swrft.post",
      status: "error",
      route: "/api/v1/generate-swrft",
      method: "POST",
      request,
      httpStatus: 500,
      errorMessage,
    });
    return applySecurityHeaders(
      NextResponse.json({ error: errorMessage }, { status: 500 }),
    );
  }
}
