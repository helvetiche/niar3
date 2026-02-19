import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth";
import {
  applySecurityHeaders,
  secureFileResponse,
} from "@/lib/security-headers";
import { generateLipaReportWorkbook } from "@/lib/lipa-report-generator";
import {
  buildLipaReportDataFromScannedFiles,
  type LipaScannedFile,
} from "@/lib/lipa-summary";
import { logAuditTrailEntry } from "@/lib/firebase-admin/audit-trail";
import { withHeavyOperationRateLimit } from "@/lib/rate-limit/with-api-rate-limit";
import { logger } from "@/lib/logger";

const scannedFileSchema = z.object({
  fileName: z.string().min(1),
  divisionName: z.string().min(1),
  confidence: z.number().min(0).max(100),
  associations: z.array(
    z.object({
      name: z.string().min(1),
      totalArea: z.number(),
    }),
  ),
  inputTokens: z.number().nonnegative(),
  outputTokens: z.number().nonnegative(),
  totalTokens: z.number().nonnegative(),
  estimatedCostUsd: z.number().nonnegative(),
});

const bodySchema = z.object({
  title: z.string().optional(),
  season: z.string().optional(),
  outputFileName: z.string().optional(),
  scannedFiles: z.array(scannedFileSchema).min(1),
});

export async function POST(request: Request) {
  const rateLimitResponse = await withHeavyOperationRateLimit(request);
  if (rateLimitResponse) {
    await logAuditTrailEntry({
      action: "lipa-summary.report.post",
      status: "rejected",
      route: "/api/v1/lipa-summary/report",
      method: "POST",
      request,
      httpStatus: 429,
      details: { reason: "rate-limited" },
    });
    return rateLimitResponse;
  }

  const auth = await withAuth(request, { action: "lipa-summary.report.post" });
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  try {
    const raw = await request.json();
    const parsed = bodySchema.parse(raw);

    const data = buildLipaReportDataFromScannedFiles({
      scannedFiles: parsed.scannedFiles as LipaScannedFile[],
      title: parsed.title,
      season: parsed.season,
    });
    const { buffer, outputName } = await generateLipaReportWorkbook({
      report: data.report,
      outputFileName: parsed.outputFileName,
    });

    await logAuditTrailEntry({
      uid: user.uid,
      action: "lipa-summary.report.post",
      status: "success",
      route: "/api/v1/lipa-summary/report",
      method: "POST",
      request,
      httpStatus: 200,
      details: {
        scannedFiles: data.scannedFiles,
        extractedAssociations: data.extractedAssociations,
        averageConfidence: data.averageConfidence,
        estimatedCostUsd: data.estimatedCostUsd,
        outputName,
      },
    });

    return secureFileResponse(buffer, {
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename: outputName,
      extraHeaders: {
        "X-Scanned-Files": String(data.scannedFiles),
        "X-Extracted-Associations": String(data.extractedAssociations),
        "X-Average-Confidence": String(data.averageConfidence),
        "X-Estimated-Cost-Usd": String(data.estimatedCostUsd),
      },
    });
  } catch (error) {
    logger.error("[api/lipa-summary/report POST]", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to build LIPA report output";
    const isValidationError = error instanceof z.ZodError;
    await logAuditTrailEntry({
      uid: user.uid,
      action: "lipa-summary.report.post",
      status: "error",
      route: "/api/v1/lipa-summary/report",
      method: "POST",
      request,
      httpStatus: isValidationError ? 400 : 500,
      errorMessage: message,
    });
    return applySecurityHeaders(
      NextResponse.json(
        {
          error: isValidationError
            ? "Invalid report payload."
            : "Failed to build LIPA report output.",
        },
        { status: isValidationError ? 400 : 500 },
      ),
    );
  }
}
