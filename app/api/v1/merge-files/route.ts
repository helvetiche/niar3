import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import {
  applySecurityHeaders,
  secureFileResponse,
} from "@/lib/security-headers";
import { mergeExcelBuffers, mergePdfBuffers } from "@/lib/merge-files";
import { logAuditTrailEntry } from "@/lib/firebase-admin/audit-trail";
import { validateUploads } from "@/lib/upload-limits";
import { withHeavyOperationRateLimit } from "@/lib/rate-limit/with-api-rate-limit";
import { logger } from "@/lib/logger";

type MergeMode = "pdf" | "excel";

type PageOrderItem = {
  fileIndex: number;
  pageIndex: number;
};
const pdfUploadLimits = {
  maxFileCount: 400,
  maxFileSizeBytes: 150 * 1024 * 1024,
  maxTotalSizeBytes: 8 * 1024 * 1024 * 1024,
  allowedExtensions: [".pdf"],
  allowedMimeSubstrings: ["pdf"],
} as const;
const excelUploadLimits = {
  maxFileCount: 400,
  maxFileSizeBytes: 150 * 1024 * 1024,
  maxTotalSizeBytes: 8 * 1024 * 1024 * 1024,
  allowedExtensions: [".xlsx", ".xls"],
  allowedMimeSubstrings: ["sheet", "excel"],
} as const;

const isMergeMode = (value: unknown): value is MergeMode =>
  value === "pdf" || value === "excel";

const parsePageOrder = (value: FormDataEntryValue | null): PageOrderItem[] => {
  if (typeof value !== "string" || !value.trim()) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("Invalid PDF page order payload.");
  }
  if (!Array.isArray(parsed)) {
    throw new Error("Invalid PDF page order payload.");
  }

  const result: PageOrderItem[] = [];
  for (const item of parsed) {
    if (
      typeof item !== "object" ||
      item === null ||
      !("fileIndex" in item) ||
      !("pageIndex" in item)
    ) {
      throw new Error("Invalid PDF page order entry.");
    }

    const fileIndex = Number((item as { fileIndex: unknown }).fileIndex);
    const pageIndex = Number((item as { pageIndex: unknown }).pageIndex);

    if (
      !Number.isInteger(fileIndex) ||
      fileIndex < 0 ||
      !Number.isInteger(pageIndex) ||
      pageIndex < 0
    ) {
      throw new Error("PDF page order values must be non-negative integers.");
    }

    result.push({ fileIndex, pageIndex });
  }

  return result;
};

const parseExcelPageNames = (value: FormDataEntryValue | null): string[] => {
  if (typeof value !== "string" || !value.trim()) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("Invalid Excel page names payload.");
  }
  if (!Array.isArray(parsed)) {
    throw new Error("Invalid Excel page names payload.");
  }

  return parsed.map((item) => (typeof item === "string" ? item : ""));
};

export async function POST(request: Request) {
  const rateLimitResponse = await withHeavyOperationRateLimit(request);
  if (rateLimitResponse) {
    await logAuditTrailEntry({
      action: "merge-files.post",
      status: "rejected",
      route: "/api/v1/merge-files",
      method: "POST",
      request,
      httpStatus: 429,
      details: { reason: "rate-limited" },
    });
    return rateLimitResponse;
  }

  const auth = await withAuth(request, { action: "merge-files.post" });
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  try {
    const formData = await request.formData();
    const modeValue = formData.get("mode");
    const fileNameValue = formData.get("fileName");
    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File);

    if (!isMergeMode(modeValue)) {
      await logAuditTrailEntry({
        uid: user.uid,
        action: "merge-files.post",
        status: "rejected",
        route: "/api/v1/merge-files",
        method: "POST",
        request,
        httpStatus: 400,
        details: { reason: "invalid-mode", mode: modeValue },
      });
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Invalid merge mode. Use pdf or excel." },
          { status: 400 },
        ),
      );
    }

    if (files.length < 2) {
      await logAuditTrailEntry({
        uid: user.uid,
        action: "merge-files.post",
        status: "rejected",
        route: "/api/v1/merge-files",
        method: "POST",
        request,
        httpStatus: 400,
        details: { reason: "insufficient-files", fileCount: files.length },
      });
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Please upload at least two files to merge." },
          { status: 400 },
        ),
      );
    }

    const uploadValidation = validateUploads(
      files,
      modeValue === "pdf" ? pdfUploadLimits : excelUploadLimits,
    );
    if (!uploadValidation.ok) {
      await logAuditTrailEntry({
        uid: user.uid,
        action: "merge-files.post",
        status: "rejected",
        route: "/api/v1/merge-files",
        method: "POST",
        request,
        httpStatus: uploadValidation.status,
        details: { reason: uploadValidation.reason, mode: modeValue },
      });
      return applySecurityHeaders(
        NextResponse.json(
          { error: uploadValidation.message },
          { status: uploadValidation.status },
        ),
      );
    }

    const fileName =
      typeof fileNameValue === "string" ? fileNameValue : undefined;
    const inputFiles = await Promise.all(
      files.map(async (file) => ({
        fileName: file.name,
        buffer: Buffer.from(await file.arrayBuffer()),
      })),
    );

    if (modeValue === "pdf") {
      const pageOrder = parsePageOrder(formData.get("pageOrder"));
      const { buffer, outputName, mergedPageCount } = await mergePdfBuffers({
        inputFiles,
        pageOrder,
        fileName,
      });

      await logAuditTrailEntry({
        uid: user.uid,
        action: "merge-files.post",
        status: "success",
        route: "/api/v1/merge-files",
        method: "POST",
        request,
        httpStatus: 200,
        details: {
          mode: "pdf",
          inputFileCount: files.length,
          mergedCount: mergedPageCount,
          outputName,
        },
      });

      return secureFileResponse(buffer, {
        contentType: "application/pdf",
        filename: outputName,
        extraHeaders: { "X-Merged-Count": String(mergedPageCount) },
      });
    }

    const excelPageNames = parseExcelPageNames(formData.get("excelPageNames"));

    const { buffer, outputName, mergedSheetCount } = await mergeExcelBuffers({
      inputFiles,
      fileName,
      excelPageNames,
    });

    await logAuditTrailEntry({
      uid: user.uid,
      action: "merge-files.post",
      status: "success",
      route: "/api/v1/merge-files",
      method: "POST",
      request,
      httpStatus: 200,
      details: {
        mode: "excel",
        inputFileCount: files.length,
        mergedCount: mergedSheetCount,
        outputName,
      },
    });

    return secureFileResponse(buffer, {
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename: outputName,
      extraHeaders: { "X-Merged-Count": String(mergedSheetCount) },
    });
  } catch (error) {
    logger.error("[api/merge-files POST]", error);
    const message =
      error instanceof Error ? error.message : "Failed to merge files";
    const isClientSafeError =
      message.includes("Invalid PDF page order") ||
      message.includes("PDF page order") ||
      message.includes("Invalid Excel page names payload");
    await logAuditTrailEntry({
      uid: user.uid,
      action: "merge-files.post",
      status: "error",
      route: "/api/v1/merge-files",
      method: "POST",
      request,
      httpStatus: 500,
      errorMessage: message,
    });
    return applySecurityHeaders(
      NextResponse.json(
        { error: isClientSafeError ? message : "Failed to merge files." },
        { status: 500 },
      ),
    );
  }
}
