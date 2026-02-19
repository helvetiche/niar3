import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/security-headers";
import { scanLipaSourceFile } from "@/lib/lipa-summary";
import { logAuditTrailEntry } from "@/lib/firebase-admin/audit-trail";
import { validateUploads } from "@/lib/upload-limits";
import { withHeavyOperationRateLimit } from "@/lib/rate-limit/with-api-rate-limit";
import { logger } from "@/lib/logger";

const scanPayloadSchema = z.object({
  divisionName: z.string().min(1),
  pageNumber: z.number().int().nonnegative(),
});
const scanUploadLimits = {
  maxFileCount: 1,
  maxFileSizeBytes: 150 * 1024 * 1024,
  maxTotalSizeBytes: 150 * 1024 * 1024,
  allowedExtensions: [".pdf"],
  allowedMimeSubstrings: ["pdf"],
} as const;

export async function POST(request: Request) {
  const rateLimitResponse = await withHeavyOperationRateLimit(request);
  if (rateLimitResponse) {
    await logAuditTrailEntry({
      action: "lipa-summary.scan.post",
      status: "rejected",
      route: "/api/v1/lipa-summary/scan",
      method: "POST",
      request,
      httpStatus: 429,
      details: { reason: "rate-limited" },
    });
    return rateLimitResponse;
  }

  const auth = await withAuth(request, { action: "lipa-summary.scan.post" });
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const payloadRaw = formData.get("payload");

    if (!(file instanceof File)) {
      await logAuditTrailEntry({
        uid: user.uid,
        action: "lipa-summary.scan.post",
        status: "rejected",
        route: "/api/v1/lipa-summary/scan",
        method: "POST",
        request,
        httpStatus: 400,
        details: { reason: "missing-file" },
      });
      return applySecurityHeaders(
        NextResponse.json(
          { error: "PDF file is required." },
          { status: 400 },
        ),
      );
    }
    const uploadValidation = validateUploads([file], scanUploadLimits);
    if (!uploadValidation.ok) {
      await logAuditTrailEntry({
        uid: user.uid,
        action: "lipa-summary.scan.post",
        status: "rejected",
        route: "/api/v1/lipa-summary/scan",
        method: "POST",
        request,
        httpStatus: uploadValidation.status,
        details: { reason: uploadValidation.reason },
      });
      return applySecurityHeaders(
        NextResponse.json(
          { error: uploadValidation.message },
          { status: uploadValidation.status },
        ),
      );
    }
    if (typeof payloadRaw !== "string" || !payloadRaw.trim()) {
      await logAuditTrailEntry({
        uid: user.uid,
        action: "lipa-summary.scan.post",
        status: "rejected",
        route: "/api/v1/lipa-summary/scan",
        method: "POST",
        request,
        httpStatus: 400,
        details: { reason: "missing-payload" },
      });
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Scan payload is required." },
          { status: 400 },
        ),
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(payloadRaw);
    } catch {
      await logAuditTrailEntry({
        uid: user.uid,
        action: "lipa-summary.scan.post",
        status: "rejected",
        route: "/api/v1/lipa-summary/scan",
        method: "POST",
        request,
        httpStatus: 400,
        details: { reason: "invalid-payload-json" },
      });
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Invalid scan payload JSON." },
          { status: 400 },
        ),
      );
    }
    const payload = scanPayloadSchema.parse(parsed);
    const scanned = await scanLipaSourceFile({
      fileName: file.name,
      divisionName: payload.divisionName.trim(),
      pageNumber: payload.pageNumber,
      buffer: Buffer.from(await file.arrayBuffer()),
    });

    await logAuditTrailEntry({
      uid: user.uid,
      action: "lipa-summary.scan.post",
      status: "success",
      route: "/api/v1/lipa-summary/scan",
      method: "POST",
      request,
      httpStatus: 200,
      details: {
        fileName: file.name,
        divisionName: payload.divisionName.trim(),
        pageNumber: payload.pageNumber,
        confidence: scanned.confidence,
        associationCount: scanned.associations.length,
      },
    });

    return applySecurityHeaders(NextResponse.json({ scanned }));
  } catch (error) {
    logger.error("[api/lipa-summary/scan POST]", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to scan PDF for LIPA summary";
    const lower = message.toLowerCase();
    const isQuotaOrRateLimit =
      lower.includes("quota") ||
      lower.includes("too many requests") ||
      lower.includes("rate limit") ||
      lower.includes("429");
    await logAuditTrailEntry({
      uid: user.uid,
      action: "lipa-summary.scan.post",
      status: "error",
      route: "/api/v1/lipa-summary/scan",
      method: "POST",
      request,
      httpStatus: isQuotaOrRateLimit ? 429 : 500,
      errorMessage: message,
    });
    const isValidationError = error instanceof z.ZodError;
    return applySecurityHeaders(
      NextResponse.json(
        {
          error: isValidationError
            ? "Invalid scan payload."
            : isQuotaOrRateLimit
              ? "LIPA scan request is currently rate-limited. Please retry."
              : "Failed to scan PDF for LIPA summary.",
        },
        { status: isValidationError ? 400 : isQuotaOrRateLimit ? 429 : 500 },
      ),
    );
  }
}
