import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth";
import {
  applySecurityHeaders,
  secureFileResponse,
} from "@/lib/security-headers";
import { buildLipaReportData } from "@/lib/lipa-summary";
import { generateLipaReportWorkbook } from "@/lib/lipa-report-generator";
import { logAuditTrailEntry } from "@/lib/firebase-admin/audit-trail";
import { validateUploads } from "@/lib/upload-limits";
import { withHeavyOperationRateLimit } from "@/lib/rate-limit/with-api-rate-limit";
import { logger } from "@/lib/logger";

const fileMappingSchema = z.object({
  fileIndex: z.number().int().nonnegative(),
  fileName: z.string().min(1),
  divisionName: z.string().min(1),
  pageNumber: z.number().int().nonnegative(),
});

const parseMappings = (
  raw: FormDataEntryValue | null,
): z.infer<typeof fileMappingSchema>[] => {
  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error("File division mapping is required.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid file division mapping.");
  }
  if (!Array.isArray(parsed)) throw new Error("Invalid file division mapping.");
  return z.array(fileMappingSchema).parse(parsed);
};
const lipaUploadLimits = {
  maxFileCount: 400,
  maxFileSizeBytes: 150 * 1024 * 1024,
  maxTotalSizeBytes: 8 * 1024 * 1024 * 1024,
  allowedExtensions: [".pdf"],
  allowedMimeSubstrings: ["pdf"],
} as const;

export async function POST(request: Request) {
  const rateLimitResponse = await withHeavyOperationRateLimit(request);
  if (rateLimitResponse) {
    await logAuditTrailEntry({
      action: "lipa-summary.post",
      status: "rejected",
      route: "/api/v1/lipa-summary",
      method: "POST",
      request,
      httpStatus: 429,
      details: { reason: "rate-limited" },
    });
    return rateLimitResponse;
  }

  const auth = await withAuth(request, { action: "lipa-summary.post" });
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  try {
    const formData = await request.formData();
    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File);
    const mappings = parseMappings(formData.get("mappings"));
    const titleRaw = formData.get("title");
    const seasonRaw = formData.get("season");
    const outputFileNameRaw = formData.get("outputFileName");

    if (files.length === 0) {
      await logAuditTrailEntry({
        uid: user.uid,
        action: "lipa-summary.post",
        status: "rejected",
        route: "/api/v1/lipa-summary",
        method: "POST",
        request,
        httpStatus: 400,
        details: { reason: "no-files" },
      });
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Please upload at least one PDF file." },
          { status: 400 },
        ),
      );
    }

    const uploadValidation = validateUploads(files, lipaUploadLimits);
    if (!uploadValidation.ok) {
      await logAuditTrailEntry({
        uid: user.uid,
        action: "lipa-summary.post",
        status: "rejected",
        route: "/api/v1/lipa-summary",
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

    if (mappings.length !== files.length) {
      await logAuditTrailEntry({
        uid: user.uid,
        action: "lipa-summary.post",
        status: "rejected",
        route: "/api/v1/lipa-summary",
        method: "POST",
        request,
        httpStatus: 400,
        details: {
          reason: "mappings-mismatch",
          mappingCount: mappings.length,
          fileCount: files.length,
        },
      });
      return applySecurityHeaders(
        NextResponse.json(
          {
            error:
              "Each uploaded file must have a mapped division and page number.",
          },
          { status: 400 },
        ),
      );
    }

    const fileByIndex = files.map((file, index) => ({ file, index }));
    const mappingByIndex = new Map(
      mappings.map((mapping) => [mapping.fileIndex, mapping]),
    );

    const inputFiles = await Promise.all(
      fileByIndex.map(async ({ file, index }) => {
        if (
          !file.type.includes("pdf") &&
          !file.name.toLowerCase().endsWith(".pdf")
        ) {
          throw new Error(
            `Only PDF files are supported. Invalid file: ${file.name}`,
          );
        }
        const mapping = mappingByIndex.get(index);
        if (!mapping || !mapping.divisionName.trim()) {
          throw new Error(`Missing division mapping for file: ${file.name}`);
        }
        if (!Number.isInteger(mapping.pageNumber) || mapping.pageNumber < 0) {
          throw new Error(`Invalid page number for file: ${file.name}`);
        }

        return {
          fileName: file.name,
          divisionName: mapping.divisionName.trim(),
          pageNumber: mapping.pageNumber,
          buffer: Buffer.from(await file.arrayBuffer()),
        };
      }),
    );

    const title = typeof titleRaw === "string" ? titleRaw.trim() : "";
    const season = typeof seasonRaw === "string" ? seasonRaw.trim() : "";
    const outputFileName =
      typeof outputFileNameRaw === "string" ? outputFileNameRaw.trim() : "";

    const data = await buildLipaReportData({
      inputFiles,
      title,
      season,
    });
    const { buffer, outputName } = await generateLipaReportWorkbook({
      report: data.report,
      outputFileName,
    });

    await logAuditTrailEntry({
      uid: user.uid,
      action: "lipa-summary.post",
      status: "success",
      route: "/api/v1/lipa-summary",
      method: "POST",
      request,
      httpStatus: 200,
      details: {
        fileCount: files.length,
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
    logger.error("[api/lipa-summary POST]", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to generate LIPA summary report";
    const lower = message.toLowerCase();
    const isQuotaOrRateLimit =
      lower.includes("quota") ||
      lower.includes("too many requests") ||
      lower.includes("rate limit") ||
      lower.includes("429");
    await logAuditTrailEntry({
      uid: user.uid,
      action: "lipa-summary.post",
      status: "error",
      route: "/api/v1/lipa-summary",
      method: "POST",
      request,
      httpStatus: isQuotaOrRateLimit ? 429 : 500,
      errorMessage: message,
    });
    const isValidationError = error instanceof z.ZodError;
    const isClientInputError =
      message.includes("Only PDF files are supported") ||
      message.includes("Missing division mapping") ||
      message.includes("Invalid page number") ||
      message.includes("Invalid file division mapping") ||
      message.includes("File division mapping is required");
    return applySecurityHeaders(
      NextResponse.json(
        {
          error: isValidationError
            ? "Invalid request payload."
            : isClientInputError
              ? message
              : isQuotaOrRateLimit
                ? "LIPA summary request is currently rate-limited. Please retry."
                : "Failed to generate LIPA summary report.",
        },
        {
          status: isValidationError
            ? 400
            : isClientInputError
              ? 400
              : isQuotaOrRateLimit
                ? 429
                : 500,
        },
      ),
    );
  }
}
