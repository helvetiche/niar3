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
import JSZip from "jszip";

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

    // Get all IFR files with their metadata
    const ifrFiles: {
      buffer: Buffer;
      fileName: string;
      divisionNumber: string;
      irrigationAssociation: string;
    }[] = [];
    let fileIndex = 0;

    while (true) {
      const file = formData.get(`landProfile_${fileIndex}`) as File;
      if (!file) break;

      const divisionNumber = formData.get(
        `divisionNumber_${fileIndex}`,
      ) as string;
      const irrigationAssociation = formData.get(
        `irrigationAssociation_${fileIndex}`,
      ) as string;

      const arrayBuffer = await file.arrayBuffer();
      ifrFiles.push({
        buffer: Buffer.from(arrayBuffer),
        fileName: file.name,
        divisionNumber: divisionNumber || "",
        irrigationAssociation: irrigationAssociation || "",
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

    // Create a ZIP file to hold all consolidated files
    const zip = new JSZip();
    let processedCount = 0;
    const allErrors: string[] = [];
    const allWarnings: string[] = [];

    // Process each IFR file separately
    for (const file of ifrFiles) {
      try {
        // Process single file with template
        const {
          buffer,
          processedCount: fileProcessedCount,
          errors,
          warnings,
        } = await consolidateIFR(templateBuffer, [
          {
            buffer: file.buffer,
            fileName: file.fileName,
            divisionNumber: file.divisionNumber,
            irrigationAssociation: file.irrigationAssociation,
          },
        ]);

        if (fileProcessedCount > 0) {
          // Generate output filename: DIV. {NO} - {NAME} (CONSOLIDATED).xlsx
          const outputFileName = `DIV. ${file.divisionNumber} - ${file.irrigationAssociation} (CONSOLIDATED).xlsx`;

          // Add to ZIP
          zip.file(outputFileName, buffer);
          processedCount += fileProcessedCount;
        }

        allErrors.push(...errors);
        allWarnings.push(...warnings);
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Unknown error";
        allErrors.push(`Error processing ${file.fileName}: ${errorMsg}`);
      }
    }

    if (processedCount === 0) {
      await logAuditTrailEntry({
        uid: user.uid,
        action: "consolidate-land-profiles.post",
        status: "error",
        route: "/api/v1/consolidate-land-profiles",
        method: "POST",
        request,
        httpStatus: 500,
        details: { reason: "no-files-processed", errorCount: allErrors.length },
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

    // Generate ZIP file
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    // Return the ZIP file with metadata in headers
    const response = secureFileResponse(zipBuffer, {
      contentType: "application/zip",
      filename: `consolidated-ifr-${Date.now()}.zip`,
    });

    // Add custom headers for metadata
    response.headers.set("X-Processed-Count", processedCount.toString());
    response.headers.set("X-Error-Count", allErrors.length.toString());
    response.headers.set("X-Warning-Count", allWarnings.length.toString());

    // Encode to base64 to handle special characters
    response.headers.set(
      "X-Errors",
      Buffer.from(JSON.stringify(allErrors)).toString("base64"),
    );
    response.headers.set(
      "X-Warnings",
      Buffer.from(JSON.stringify(allWarnings)).toString("base64"),
    );

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
        errorCount: allErrors.length,
        warningCount: allWarnings.length,
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
