import { NextRequest, NextResponse } from "next/server";
import { consolidateIFR } from "@/lib/consolidate-ifr";
import {
  applySecurityHeaders,
  secureFileResponse,
} from "@/lib/security-headers";
import { withAuth } from "@/lib/auth";
import { withHeavyOperationRateLimit } from "@/lib/rate-limit/with-api-rate-limit";
import { logAuditTrailEntry } from "@/lib/firebase-admin/audit-trail";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const rateLimitResponse = await withHeavyOperationRateLimit(request);
  if (rateLimitResponse) {
    await logAuditTrailEntry({
      action: "consolidate-land-profiles.post",
      status: "rejected",
      route: "/api/v1/consolidate-land-profiles",
      method: "POST",
      request,
      httpStatus: 429,
      details: { reason: "rate-limited" },
    });
    return rateLimitResponse;
  }

  const auth = await withAuth(request, {
    action: "consolidate-land-profiles.post",
  });
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  try {
    const formData = await request.formData();

    // Get template file
    const templateFile = formData.get("template") as File;
    if (!templateFile) {
      await logAuditTrailEntry({
        uid: user.uid,
        action: "consolidate-land-profiles.post",
        status: "rejected",
        route: "/api/v1/consolidate-land-profiles",
        method: "POST",
        request,
        httpStatus: 400,
        details: { reason: "missing-template" },
      });
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Template file is required" },
          { status: 400 },
        ),
      );
    }

    // Get all IFR files
    const ifrFiles: { buffer: Buffer; fileName: string }[] = [];
    let fileIndex = 0;

    while (true) {
      const file = formData.get(`landProfile_${fileIndex}`) as File;
      if (!file) break;

      const arrayBuffer = await file.arrayBuffer();
      ifrFiles.push({
        buffer: Buffer.from(arrayBuffer),
        fileName: file.name,
      });

      fileIndex++;
    }

    if (ifrFiles.length === 0) {
      await logAuditTrailEntry({
        uid: user.uid,
        action: "consolidate-land-profiles.post",
        status: "rejected",
        route: "/api/v1/consolidate-land-profiles",
        method: "POST",
        request,
        httpStatus: 400,
        details: { reason: "no-ifr-files" },
      });
      return applySecurityHeaders(
        NextResponse.json(
          { error: "At least one IFR file is required" },
          { status: 400 },
        ),
      );
    }

    // Convert template to buffer
    const templateArrayBuffer = await templateFile.arrayBuffer();
    const templateBuffer = Buffer.from(templateArrayBuffer);

    // Process consolidation with automatic calculation
    const { buffer, processedCount, errors, warnings } = await consolidateIFR(
      templateBuffer,
      ifrFiles,
    );

    if (processedCount === 0) {
      await logAuditTrailEntry({
        uid: user.uid,
        action: "consolidate-land-profiles.post",
        status: "error",
        route: "/api/v1/consolidate-land-profiles",
        method: "POST",
        request,
        httpStatus: 500,
        details: { reason: "no-files-processed", errorCount: errors.length },
      });
      return applySecurityHeaders(
        NextResponse.json(
          {
            error: "Consolidation failed",
          },
          { status: 500 },
        ),
      );
    }

    // Return the file with metadata in headers
    const response = secureFileResponse(buffer, {
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename: `consolidated-ifr-${Date.now()}.xlsx`,
    });

    // Add custom headers for metadata
    response.headers.set("X-Processed-Count", processedCount.toString());
    response.headers.set("X-Error-Count", errors.length.toString());
    response.headers.set("X-Warning-Count", warnings.length.toString());
    response.headers.set("X-Errors", JSON.stringify(errors));
    response.headers.set("X-Warnings", JSON.stringify(warnings));

    await logAuditTrailEntry({
      uid: user.uid,
      action: "consolidate-land-profiles.post",
      status: "success",
      route: "/api/v1/consolidate-land-profiles",
      method: "POST",
      request,
      httpStatus: 200,
      details: {
        processedCount,
        errorCount: errors.length,
        warningCount: warnings.length,
        fileCount: ifrFiles.length,
      },
    });

    return response;
  } catch (error) {
    logger.error("Error in consolidate-land-profiles API:", error);
    await logAuditTrailEntry({
      uid: user.uid,
      action: "consolidate-land-profiles.post",
      status: "error",
      route: "/api/v1/consolidate-land-profiles",
      method: "POST",
      request,
      httpStatus: 500,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    return applySecurityHeaders(
      NextResponse.json(
        {
          error: "Internal server error",
        },
        { status: 500 },
      ),
    );
  }
}
