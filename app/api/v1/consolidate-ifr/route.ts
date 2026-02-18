import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { getTemplateRecord } from "@/lib/firebase-admin/firestore";
import { downloadBufferFromStorage } from "@/lib/firebase-admin/storage";
import { buildConsolidatedWorkbook } from "@/lib/consolidation";
import { logAuditTrailEntry } from "@/lib/firebase-admin/audit-trail";
import { validateUploads } from "@/lib/upload-limits";

const ifrUploadLimits = {
  maxFileCount: 400,
  maxFileSizeBytes: 100 * 1024 * 1024,
  maxTotalSizeBytes: 5 * 1024 * 1024 * 1024,
  allowedExtensions: [".xlsx", ".xls"],
  allowedMimeSubstrings: ["sheet", "excel"],
} as const;
const templateUploadLimits = {
  maxFileCount: 1,
  maxFileSizeBytes: 100 * 1024 * 1024,
  maxTotalSizeBytes: 100 * 1024 * 1024,
  allowedExtensions: [".xlsx", ".xls"],
  allowedMimeSubstrings: ["sheet", "excel"],
} as const;

export async function POST(request: Request) {
  const result = await getSession();
  if (!result.user) {
    await logAuditTrailEntry({
      action: "consolidate-ifr.post",
      status: "rejected",
      route: "/api/v1/consolidate-ifr",
      method: "POST",
      request,
      httpStatus: 401,
      details: { reason: "unauthorized" },
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
      await logAuditTrailEntry({
        uid: result.user.uid,
        action: "consolidate-ifr.post",
        status: "rejected",
        route: "/api/v1/consolidate-ifr",
        method: "POST",
        request,
        httpStatus: 400,
        details: { reason: "no-ifr-files" },
      });
      return NextResponse.json(
        { error: "No IFR Excel files uploaded" },
        { status: 400 },
      );
    }
    if (
      !(template instanceof File) &&
      !(typeof templateId === "string" && templateId.trim())
    ) {
      await logAuditTrailEntry({
        uid: result.user.uid,
        action: "consolidate-ifr.post",
        status: "rejected",
        route: "/api/v1/consolidate-ifr",
        method: "POST",
        request,
        httpStatus: 400,
        details: { reason: "missing-template" },
      });
      return NextResponse.json(
        { error: "No consolidation template provided" },
        { status: 400 },
      );
    }

    const ifrFiles = files.length > 0 ? files : [singleFile as File];
    const ifrUploadValidation = validateUploads(ifrFiles, ifrUploadLimits);
    if (!ifrUploadValidation.ok) {
      await logAuditTrailEntry({
        uid: result.user.uid,
        action: "consolidate-ifr.post",
        status: "rejected",
        route: "/api/v1/consolidate-ifr",
        method: "POST",
        request,
        httpStatus: ifrUploadValidation.status,
        details: { reason: ifrUploadValidation.reason },
      });
      return NextResponse.json(
        { error: ifrUploadValidation.message },
        { status: ifrUploadValidation.status },
      );
    }

    let templateBuffer: Buffer;
    if (template instanceof File) {
      const templateValidation = validateUploads([template], templateUploadLimits);
      if (!templateValidation.ok) {
        await logAuditTrailEntry({
          uid: result.user.uid,
          action: "consolidate-ifr.post",
          status: "rejected",
          route: "/api/v1/consolidate-ifr",
          method: "POST",
          request,
          httpStatus: templateValidation.status,
          details: { reason: templateValidation.reason },
        });
        return NextResponse.json(
          { error: templateValidation.message },
          { status: templateValidation.status },
        );
      }
      templateBuffer = Buffer.from(await template.arrayBuffer());
    } else {
      const savedTemplate = await getTemplateRecord(
        String(templateId).trim(),
      );
      if (!savedTemplate) {
        await logAuditTrailEntry({
          uid: result.user.uid,
          action: "consolidate-ifr.post",
          status: "rejected",
          route: "/api/v1/consolidate-ifr",
          method: "POST",
          request,
          httpStatus: 404,
          details: {
            reason: "template-not-found",
            templateId: String(templateId).trim(),
          },
        });
        return NextResponse.json(
          { error: "Selected template not found" },
          { status: 404 },
        );
      }
      templateBuffer = await downloadBufferFromStorage(
        savedTemplate.storagePath,
      );
    }
    const inputFiles = await Promise.all(
      ifrFiles.map(async (file) => ({
        fileName: file.name,
        buffer: Buffer.from(await file.arrayBuffer()),
      })),
    );

    const resultWorkbook = await buildConsolidatedWorkbook({
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

    await logAuditTrailEntry({
      uid: result.user.uid,
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

    return new NextResponse(new Uint8Array(outputBuffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${outputName}"`,
        "X-Consolidated-Count": String(consolidatedCount),
        "X-Skipped-Count": String(skippedDetails.length),
        "X-Skipped-Items": skippedSummary,
        "X-Skipped-Details": skippedDetailsHeader,
      },
    });
  } catch (error) {
    console.error("[api/consolidate-ifr POST]", error);
    const message =
      error instanceof Error ? error.message : "Failed to consolidate IFR file";
    const isNoConsolidation = message.includes("No files were consolidated");
    await logAuditTrailEntry({
      uid: result.user.uid,
      action: "consolidate-ifr.post",
      status: "error",
      route: "/api/v1/consolidate-ifr",
      method: "POST",
      request,
      httpStatus: isNoConsolidation ? 400 : 500,
      errorMessage: message,
    });
    if (isNoConsolidation) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to consolidate IFR file." },
      { status: 500 },
    );
  }
}
