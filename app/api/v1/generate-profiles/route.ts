import { NextResponse } from "next/server";
import JSZip from "jszip";
import {
  applySecurityHeaders,
  secureFileResponse,
} from "@/lib/security-headers";
import { withAuth } from "@/lib/auth";
import { parseExcelFile } from "@/lib/excelParser";
import { processMastersList } from "@/lib/mastersListProcessor";
import { generateProfileBuffer } from "@/lib/profileGenerator";
import { getTemplateRecord } from "@/lib/firebase-admin/firestore";
import { downloadBufferFromStorage } from "@/lib/firebase-admin/storage";
import { logAuditTrailEntry } from "@/lib/firebase-admin/audit-trail";
import { validateUploads, UPLOAD_LIMIT_PRESETS } from "@/lib/upload-limits";
import {
  sanitizeFolderName,
  getBaseName,
  getFileKey,
  getUniqueFolderName,
  detectDivisionAndIAFromFilename,
} from "@/lib/file-utils";
import { HTTP_STATUS } from "@/constants/http-status";
import { ERROR_MESSAGES } from "@/constants/error-messages";
import { getErrorMessage } from "@/lib/utils";
import { withHeavyOperationRateLimit } from "@/lib/rate-limit/with-api-rate-limit";
import { logger } from "@/lib/logger";

const sourceUploadLimits = UPLOAD_LIMIT_PRESETS.EXCEL_BATCH;
const templateUploadLimits = UPLOAD_LIMIT_PRESETS.EXCEL_SINGLE;

const parseTextMap = (
  value: FormDataEntryValue | null,
  transformer: (input: string) => string,
): Record<string, string> => {
  if (typeof value !== "string" || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return {};

    const map: Record<string, string> = {};
    Object.entries(parsed as Record<string, unknown>).forEach(([key, raw]) => {
      if (typeof raw !== "string") return;
      const cleanKey = key.trim();
      const cleanValue = transformer(raw);
      if (!cleanKey || !cleanValue) return;
      map[cleanKey] = cleanValue;
    });
    return map;
  } catch {
    return {};
  }
};

export async function POST(request: Request) {
  const rateLimitResponse = await withHeavyOperationRateLimit(request);
  if (rateLimitResponse) {
    await logAuditTrailEntry({
      action: "generate-profiles.post",
      status: "rejected",
      route: "/api/v1/generate-profiles",
      method: "POST",
      request,
      httpStatus: 429,
      details: { reason: "rate-limited" },
    });
    return rateLimitResponse;
  }

  const auth = await withAuth(request, { action: "generate-profiles.post" });
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
    const billingUnitFolderNameRaw =
      formData.get("billingUnitFolderName") ??
      formData.get("profileFolderName");
    const sourceFolderNamesRaw = formData.get("sourceFolderNames");

    const billingUnitFolderName =
      typeof billingUnitFolderNameRaw === "string" &&
      billingUnitFolderNameRaw.trim()
        ? sanitizeFolderName(billingUnitFolderNameRaw)
        : "billing unit";
    const sourceFolderNames = parseTextMap(
      sourceFolderNamesRaw,
      sanitizeFolderName,
    );

    const sourceFiles =
      files.length > 0 ? files : singleFile instanceof File ? [singleFile] : [];

    const sourceUploadValidation = validateUploads(
      sourceFiles,
      sourceUploadLimits,
    );
    if (!sourceUploadValidation.ok) {
      await logAuditTrailEntry({
        uid: user.uid,
        action: "generate-profiles.post",
        status: "rejected",
        route: "/api/v1/generate-profiles",
        method: "POST",
        request,
        httpStatus: sourceUploadValidation.status,
        details: { reason: sourceUploadValidation.reason },
      });
      return applySecurityHeaders(
        NextResponse.json(
          { error: sourceUploadValidation.message },
          { status: sourceUploadValidation.status },
        ),
      );
    }

    if (sourceFiles.length === 0) {
      await logAuditTrailEntry({
        uid: user.uid,
        action: "generate-profiles.post",
        status: "rejected",
        route: "/api/v1/generate-profiles",
        method: "POST",
        request,
        httpStatus: 400,
        details: { reason: "no-source-files" },
      });
      return applySecurityHeaders(
        NextResponse.json(
          { error: ERROR_MESSAGES.NO_SOURCE_FILES },
          { status: HTTP_STATUS.BAD_REQUEST },
        ),
      );
    }
    if (
      !(template instanceof File) &&
      !(typeof templateId === "string" && templateId.trim())
    ) {
      await logAuditTrailEntry({
        uid: user.uid,
        action: "generate-profiles.post",
        status: "rejected",
        route: "/api/v1/generate-profiles",
        method: "POST",
        request,
        httpStatus: 400,
        details: { reason: "missing-template" },
      });
      return applySecurityHeaders(
        NextResponse.json(
          { error: ERROR_MESSAGES.MISSING_TEMPLATE },
          { status: HTTP_STATUS.BAD_REQUEST },
        ),
      );
    }

    let templateBuffer: Buffer;
    if (template instanceof File) {
      const templateValidation = validateUploads(
        [template],
        templateUploadLimits,
      );
      if (!templateValidation.ok) {
        await logAuditTrailEntry({
          uid: user.uid,
          action: "generate-profiles.post",
          status: "rejected",
          route: "/api/v1/generate-profiles",
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
    } else if (typeof templateId === "string" && templateId.trim()) {
      const savedTemplate = await getTemplateRecord(templateId.trim());
      if (!savedTemplate) {
        await logAuditTrailEntry({
          uid: user.uid,
          action: "generate-profiles.post",
          status: "rejected",
          route: "/api/v1/generate-profiles",
          method: "POST",
          request,
          httpStatus: 404,
          details: {
            reason: "template-not-found",
            templateId: templateId.trim(),
          },
        });
        return applySecurityHeaders(
          NextResponse.json(
            { error: ERROR_MESSAGES.TEMPLATE_NOT_FOUND },
            { status: HTTP_STATUS.NOT_FOUND },
          ),
        );
      }
      templateBuffer = await downloadBufferFromStorage(
        savedTemplate.storagePath,
      );
    } else {
      return applySecurityHeaders(
        NextResponse.json(
          { error: ERROR_MESSAGES.MISSING_TEMPLATE },
          { status: HTTP_STATUS.BAD_REQUEST },
        ),
      );
    }

    const zip = new JSZip();
    const seenDivisionFolders = new Map<string, number>();
    let totalGeneratedProfiles = 0;

    for (const sourceFile of sourceFiles) {
      const sourceBuffer = Buffer.from(await sourceFile.arrayBuffer());
      const parsedSheets = parseExcelFile(sourceBuffer);
      if (parsedSheets.length === 0) {
        continue;
      }

      const lotGroups = processMastersList(parsedSheets[0].data);
      if (lotGroups.length === 0) {
        continue;
      }

      const divisionFolderName = getUniqueFolderName(
        sourceFolderNames[getFileKey(sourceFile)] ??
          getBaseName(sourceFile.name),
        seenDivisionFolders,
      );
      const divisionFolder = zip.folder(divisionFolderName);
      if (!divisionFolder) {
        throw new Error(`Unable to create folder: ${divisionFolderName}`);
      }

      const profilesFolder = divisionFolder.folder(
        billingUnitFolderName || "billing unit",
      );
      if (!profilesFolder) {
        throw new Error(
          `Unable to create folder: ${divisionFolderName}/${billingUnitFolderName}`,
        );
      }

      const sourceFileKey = getFileKey(sourceFile);
      const detected = detectDivisionAndIAFromFilename(sourceFile.name);
      const sourceDivision = detected.division ?? "0";
      const sourceIA = detected.ia ?? "IA";

      for (const [index, lotGroup] of lotGroups.entries()) {
        const { buffer, filename } = await generateProfileBuffer(
          lotGroup,
          index + 1,
          {
            division: sourceDivision,
            nameOfIA: sourceIA,
            templateBuffer,
          },
        );
        profilesFolder.file(filename, buffer);
        totalGeneratedProfiles += 1;
      }
    }

    if (totalGeneratedProfiles === 0) {
      await logAuditTrailEntry({
        uid: user.uid,
        action: "generate-profiles.post",
        status: "rejected",
        route: "/api/v1/generate-profiles",
        method: "POST",
        request,
        httpStatus: 400,
        details: { reason: "no-lot-records-found" },
      });
      return applySecurityHeaders(
        NextResponse.json(
          { error: ERROR_MESSAGES.NO_LOT_RECORDS },
          { status: HTTP_STATUS.BAD_REQUEST },
        ),
      );
    }

    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    await logAuditTrailEntry({
      uid: user.uid,
      action: "generate-profiles.post",
      status: "success",
      route: "/api/v1/generate-profiles",
      method: "POST",
      request,
      httpStatus: 200,
      details: {
        sourceFileCount: sourceFiles.length,
        totalGeneratedProfiles,
      },
    });

    return secureFileResponse(zipBuffer, {
      contentType: "application/zip",
      filename: "BILLING UNITS.zip",
    });
  } catch (error) {
    logger.error("[api/generate-profiles POST]", error);
    const message = getErrorMessage(
      error,
      ERROR_MESSAGES.FAILED_GENERATE_PROFILES,
    );
    await logAuditTrailEntry({
      uid: user.uid,
      action: "generate-profiles.post",
      status: "error",
      route: "/api/v1/generate-profiles",
      method: "POST",
      request,
      httpStatus: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      errorMessage: message,
    });
    return applySecurityHeaders(
      NextResponse.json(
        { error: ERROR_MESSAGES.FAILED_GENERATE_PROFILES },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
      ),
    );
  }
}
