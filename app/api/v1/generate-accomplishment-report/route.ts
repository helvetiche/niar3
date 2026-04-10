import { NextResponse } from "next/server";
import {
  applySecurityHeaders,
  secureFileResponse,
} from "@/lib/security-headers";
import { withAuth } from "@/lib/auth";
import { getTemplateRecord } from "@/lib/firebase-admin/firestore";
import { downloadBufferFromStorage } from "@/lib/firebase-admin/storage";
import { generateMergedAccomplishmentReportWorkbook } from "@/lib/accomplishment-report-workbook";
import { logAuditTrailEntry } from "@/lib/firebase-admin/audit-trail";
import { withHeavyOperationRateLimit } from "@/lib/rate-limit/with-api-rate-limit";
import { logger } from "@/lib/logger";

const sanitizeForFilename = (value: string): string =>
  value.replace(/[\\/:*?"<>|]/g, "-").trim();

export async function POST(request: Request) {
  const rateLimitResponse = await withHeavyOperationRateLimit(request);
  if (rateLimitResponse) {
    await logAuditTrailEntry({
      action: "generate-accomplishment-report.post",
      status: "rejected",
      route: "/api/v1/generate-accomplishment-report",
      method: "POST",
      request,
      httpStatus: 429,
      details: { reason: "rate-limited" },
    });
    return rateLimitResponse;
  }

  const auth = await withAuth(request, {
    action: "generate-accomplishment-report.post",
  });
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  try {
    const formData = await request.formData();
    const templateId = formData.get("templateId");
    const firstNameOverride = formData.get("firstName");
    const lastNameOverride = formData.get("lastName");
    const designation = formData.get("designation");
    const monthsRaw = formData.get("months");
    const includeFirstHalfRaw = formData.get("includeFirstHalf");
    const includeSecondHalfRaw = formData.get("includeSecondHalf");
    const customTasksRaw = formData.get("customTasks");

    if (typeof templateId !== "string" || !templateId.trim()) {
      await logAuditTrailEntry({
        uid: user.uid,
        action: "generate-accomplishment-report.post",
        status: "rejected",
        route: "/api/v1/generate-accomplishment-report",
        method: "POST",
        request,
        httpStatus: 400,
        details: { reason: "missing-template-id" },
      });
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Template is required. Select an accomplishment template." },
          { status: 400 },
        ),
      );
    }

    const templateRecord = await getTemplateRecord(templateId.trim());
    if (
      !templateRecord ||
      templateRecord.scope !== "accomplishment-report"
    ) {
      await logAuditTrailEntry({
        uid: user.uid,
        action: "generate-accomplishment-report.post",
        status: "rejected",
        route: "/api/v1/generate-accomplishment-report",
        method: "POST",
        request,
        httpStatus: 404,
        details: { reason: "template-not-found" },
      });
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Template not found or invalid scope." },
          { status: 404 },
        ),
      );
    }

    const fullName =
      typeof firstNameOverride === "string" && firstNameOverride.trim()
        ? firstNameOverride.trim()
        : "";

    if (!fullName) {
      return applySecurityHeaders(
        NextResponse.json(
          {
            error: "Full name is required. Enter it in the form.",
          },
          { status: 400 },
        ),
      );
    }

    let months: number[] = [];
    if (typeof monthsRaw === "string" && monthsRaw.trim()) {
      try {
        const parsed = JSON.parse(monthsRaw) as unknown;
        if (Array.isArray(parsed)) {
          months = parsed
            .filter(
              (m): m is number => typeof m === "number" && m >= 1 && m <= 12,
            )
            .sort((a, b) => a - b);
        }
      } catch {
        /* invalid JSON, use default */
      }
    }
    if (months.length === 0) {
      months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    }

    const includeFirstHalf =
      typeof includeFirstHalfRaw === "string"
        ? includeFirstHalfRaw.toLowerCase() !== "false"
        : true;
    const includeSecondHalf =
      typeof includeSecondHalfRaw === "string"
        ? includeSecondHalfRaw.toLowerCase() !== "false"
        : true;

    if (!includeFirstHalf && !includeSecondHalf) {
      return applySecurityHeaders(
        NextResponse.json(
          {
            error:
              "Select at least one period: first half (1-15) or second half (16-30/31).",
          },
          { status: 400 },
        ),
      );
    }

    const designationValue =
      typeof designation === "string" && designation.trim()
        ? designation.trim()
        : "SWRFT";

    let customTasks: string[] | undefined;
    if (typeof customTasksRaw === "string" && customTasksRaw.trim()) {
      try {
        const parsed = JSON.parse(customTasksRaw) as unknown;
        if (Array.isArray(parsed)) {
          customTasks = parsed
            .filter(
              (t): t is string => typeof t === "string" && t.trim().length > 0,
            )
            .map((t) => (t as string).trim())
            .slice(0, 20);
          if (customTasks.length === 0) customTasks = undefined;
        }
      } catch {
        /* invalid JSON, ignore */
      }
    }

    const templateBuffer = await downloadBufferFromStorage(
      templateRecord.storagePath,
    );

    const year = new Date().getFullYear();
    const buffer = await generateMergedAccomplishmentReportWorkbook(
      templateBuffer,
      fullName,
      designationValue,
      year,
      {
        months,
        includeFirstHalf,
        includeSecondHalf,
      },
      customTasks,
    );

    const outputBaseName = `${sanitizeForFilename(fullName)} - ${designationValue}`;
    const outputName = outputBaseName.toLowerCase().endsWith(".xlsx")
      ? outputBaseName
      : `${outputBaseName}.xlsx`;

    await logAuditTrailEntry({
      uid: user.uid,
      action: "generate-accomplishment-report.post",
      status: "success",
      route: "/api/v1/generate-accomplishment-report",
      method: "POST",
      request,
      httpStatus: 200,
      details: {
        periodCount:
          months.length * (includeFirstHalf ? 1 : 0) +
          months.length * (includeSecondHalf ? 1 : 0),
        outputName,
      },
    });

    return secureFileResponse(buffer, {
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename: outputName,
      extraHeaders: {
        "X-Accomplishment-Report-Period-Count": String(
          months.length * (includeFirstHalf ? 1 : 0) +
            months.length * (includeSecondHalf ? 1 : 0),
        ),
      },
    });
  } catch (error) {
    logger.error("[api/generate-accomplishment-report POST]", error);
    await logAuditTrailEntry({
      uid: user.uid,
      action: "generate-accomplishment-report.post",
      status: "error",
      route: "/api/v1/generate-accomplishment-report",
      method: "POST",
      request,
      httpStatus: 500,
      errorMessage:
        error instanceof Error
          ? error.message
          : "Failed to generate accomplishment report",
    });
    return applySecurityHeaders(
      NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to generate accomplishment report.",
        },
        { status: 500 },
      ),
    );
  }
}
