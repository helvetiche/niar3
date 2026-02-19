import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import {
  applySecurityHeaders,
  secureFileResponse,
} from "@/lib/security-headers";
import { queueAuditLog } from "@/lib/services/audit-queue";
import { consolidateIfrFiles } from "@/lib/services/consolidation-service";
import { validateUploads, UPLOAD_LIMIT_PRESETS } from "@/lib/upload-limits";
import { withHeavyOperationRateLimit } from "@/lib/rate-limit/with-api-rate-limit";
import { logger } from "@/lib/logger";

const ifrUploadLimits = UPLOAD_LIMIT_PRESETS.EXCEL_BATCH;
const templateUploadLimits = UPLOAD_LIMIT_PRESETS.EXCEL_SINGLE;

export async function POST(request: Request) {
  const rateLimitResponse = await withHeavyOperationRateLimit(request);
  if (rateLimitResponse) {
    queueAuditLog({
      action: "consolidate-ifr.post",
      status: "rejected",
      route: "/api/v1/consolidate-ifr",
      method: "POST",
      request,
      httpStatus: 429,
      details: { reason: "rate-limited" },
    });
    return rateLimitResponse;
  }

  const auth = await withAuth(request, { action: "consolidate-ifr.post" });
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  try {
    const formData = await request.formData();
    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File);
    const singleFile = formData.get("file");
    const template = formData.get("template");
    const templateId = formData.get("templateId");
    const fileNameRaw = formData.get("fileName");
    const divisionRaw = formData.get("division");
    const iaRaw = formData.get("ia");
    const requestedFileName =
      typeof fileNameRaw === "string" && fileNameRaw.trim()
        ? fileNameRaw.trim()
        : "DIVISION X CONSOLIDATED";
    const division =
      typeof divisionRaw === "string"
        ? divisionRaw.replace(/[^0-9]/g, "")
        : "0";
    const ia = typeof iaRaw === "string" && iaRaw.trim() ? iaRaw.trim() : "IA";

    if (files.length === 0 && !(singleFile instanceof File)) {
      queueAuditLog({
        uid: user.uid,
        action: "consolidate-ifr.post",
        status: "rejected",
        route: "/api/v1/consolidate-ifr",
        method: "POST",
        request,
        httpStatus: 400,
        details: { reason: "no-ifr-files" },
      });
      return applySecurityHeaders(
        NextResponse.json(
          { error: "No IFR Excel files uploaded" },
          { status: 400 },
        ),
      );
    }
    if (
      !(template instanceof File) &&
      !(typeof templateId === "string" && templateId.trim())
    ) {
      queueAuditLog({
        uid: user.uid,
        action: "consolidate-ifr.post",
        status: "rejected",
        route: "/api/v1/consolidate-ifr",
        method: "POST",
        request,
        httpStatus: 400,
        details: { reason: "missing-template" },
      });
      return applySecurityHeaders(
        NextResponse.json(
          { error: "No consolidation template provided" },
          { status: 400 },
        ),
      );
    }

    const ifrFiles = files.length > 0 ? files : [singleFile as File];
    const ifrUploadValidation = validateUploads(ifrFiles, ifrUploadLimits);
    if (!ifrUploadValidation.ok) {
      queueAuditLog({
        uid: user.uid,
        action: "consolidate-ifr.post",
        status: "rejected",
        route: "/api/v1/consolidate-ifr",
        method: "POST",
        request,
        httpStatus: ifrUploadValidation.status,
        details: { reason: ifrUploadValidation.reason },
      });
      return applySecurityHeaders(
        NextResponse.json(
          { error: ifrUploadValidation.message },
          { status: ifrUploadValidation.status },
        ),
      );
    }

    let templateBuffer: Buffer | undefined;
    let templateIdToUse: string | undefined;

    if (template instanceof File) {
      const templateValidation = validateUploads(
        [template],
        templateUploadLimits,
      );
      if (!templateValidation.ok) {
        queueAuditLog({
          uid: user.uid,
          action: "consolidate-ifr.post",
          status: "rejected",
          route: "/api/v1/consolidate-ifr",
          method: "POST",
          request,
          httpStatus: templateValidation.status,
          details: { reason: templateValidation.reason },
        });
        return applySecurityHeaders(
          NextResponse.json(
            { error: templateValidation.message },
            { status: templateValidation.status },
          ),
        );
      }
      templateBuffer = Buffer.from(await template.arrayBuffer());
    } else {
      templateIdToUse = String(templateId).trim();
    }

    const inputFiles = await Promise.all(
      ifrFiles.map(async (file) => ({
        fileName: file.name,
        buffer: Buffer.from(await file.arrayBuffer()),
      })),
    );

    const resultWorkbook = await consolidateIfrFiles({
      templateId: templateIdToUse,
      templateBuffer,
      inputFiles,
      fileName: requestedFileName,
      division,
      ia,
    });

    const {
      buffer: outputBuffer,
      outputName,
      consolidatedCount,
      skippedDetails,
    } = resultWorkbook;
    const skippedItems = skippedDetails.map((item) =>
      item.fileId ? `${item.fileName} (${item.fileId})` : item.fileName,
    );
    const skippedSummary = skippedItems.slice(0, 50).join(",");
    const skippedDetailsHeader = encodeURIComponent(
      JSON.stringify(skippedDetails.slice(0, 200)),
    );

    queueAuditLog({
      uid: user.uid,
      action: "consolidate-ifr.post",
      status: "success",
      route: "/api/v1/consolidate-ifr",
      method: "POST",
      request,
      httpStatus: 200,
      details: {
        inputFileCount: ifrFiles.length,
        consolidatedCount,
        skippedCount: skippedDetails.length,
        outputName,
      },
    });

    return secureFileResponse(outputBuffer, {
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename: outputName,
      extraHeaders: {
        "X-Consolidated-Count": String(consolidatedCount),
        "X-Skipped-Count": String(skippedDetails.length),
        "X-Skipped-Items": skippedSummary,
        "X-Skipped-Details": skippedDetailsHeader,
      },
    });
  } catch (error) {
    logger.error("[api/consolidate-ifr POST]", error);
    const message =
      error instanceof Error
        ? error.message
        : "Server broke while consolidating";
    const isNoConsolidation = message.includes("No files were consolidated");
    queueAuditLog({
      uid: user.uid,
      action: "consolidate-ifr.post",
      status: "error",
      route: "/api/v1/consolidate-ifr",
      method: "POST",
      request,
      httpStatus: isNoConsolidation ? 400 : 500,
      errorMessage: message,
    });
    if (isNoConsolidation) {
      return applySecurityHeaders(
        NextResponse.json({ error: message }, { status: 400 }),
      );
    }
    return applySecurityHeaders(
      NextResponse.json(
        { error: "Server broke while consolidating IFR files" },
        { status: 500 },
      ),
    );
  }
}
