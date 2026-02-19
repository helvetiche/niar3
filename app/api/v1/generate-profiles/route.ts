import { NextResponse } from "next/server";
import JSZip from "jszip";
import { getSession } from "@/lib/auth/get-session";
import { parseExcelFile } from "@/lib/excelParser";
import { processMastersList } from "@/lib/mastersListProcessor";
import { generateProfileBuffer } from "@/lib/profileGenerator";
import { getTemplateRecord } from "@/lib/firebase-admin/firestore";
import { downloadBufferFromStorage } from "@/lib/firebase-admin/storage";
import { buildConsolidatedWorkbook } from "@/lib/consolidation";
import { mergeExcelBuffers } from "@/lib/merge-files";
import { logAuditTrailEntry } from "@/lib/firebase-admin/audit-trail";
import { validateUploads } from "@/lib/upload-limits";

const sanitizeFolderName = (value: string): string =>
  value
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, " ")
    .trim();

const getFileBaseName = (fileName: string): string => {
  const trimmed = fileName.trim();
  const lastDot = trimmed.lastIndexOf(".");
  if (lastDot <= 0) return trimmed;
  return trimmed.slice(0, lastDot);
};

const getUniqueFolderName = (
  rawName: string,
  seenFolders: Map<string, number>,
): string => {
  const baseName = sanitizeFolderName(rawName) || "division";
  const currentCount = seenFolders.get(baseName) ?? 0;
  seenFolders.set(baseName, currentCount + 1);
  if (currentCount === 0) return baseName;
  return `${baseName} (${String(currentCount + 1)})`;
};

const getSourceFileKey = (file: File): string =>
  `${file.name}::${String(file.size)}::${String(file.lastModified)}`;

const detectDivisionAndIAFromFilename = (
  fileName: string,
): { division: string; ia: string } => {
  const trimmedName = fileName.trim();
  const lastDot = trimmedName.lastIndexOf(".");
  const baseName = (lastDot > 0 ? trimmedName.slice(0, lastDot) : trimmedName)
    .replace(/_/g, " ")
    .trim();
  const divisionMatch = /\bDIV\.?\s*([0-9]{1,2})\b/i.exec(baseName);
  if (!divisionMatch) {
    return { division: "0", ia: "IA" };
  }

  const division = String(Number.parseInt(divisionMatch[1], 10) || 0);
  const matchStart = divisionMatch.index ?? 0;
  const remainderStart = matchStart + divisionMatch[0].length;
  let iaPart = baseName.slice(remainderStart).trim();
  iaPart = iaPart.replace(/^[-:–—]+\s*/, "");
  iaPart = iaPart.replace(/\s{2,}/g, " ");

  return {
    division: division || "0",
    ia: iaPart || "IA",
  };
};

const buildConsolidationFileName = (division: string, ia: string): string => {
  const digits = division.replace(/[^0-9]/g, "");
  const paddedDivision = digits ? digits.padStart(2, "0") : "00";
  const iaName = ia.trim().toUpperCase() || "IA";
  return `${paddedDivision} ${iaName} CONSOLIDATED`;
};

const defaultMergedConsolidationFileName = "ALL DIVISION CONSOLIDATED";
const sourceUploadLimits = {
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
const ensureXlsxExtension = (value: string): string => {
  const cleaned = value
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  const baseName = cleaned || defaultMergedConsolidationFileName;
  return baseName.toLowerCase().endsWith(".xlsx")
    ? baseName
    : `${baseName}.xlsx`;
};

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
  const result = await getSession();
  if (!result.user) {
    await logAuditTrailEntry({
      action: "generate-profiles.post",
      status: "rejected",
      route: "/api/v1/generate-profiles",
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
    const createConsolidationRaw = formData.get("createConsolidation");
    const consolidationTemplateIdRaw = formData.get("consolidationTemplateId");
    const createMergedConsolidationRaw = formData.get(
      "createMergedConsolidation",
    );
    const mergedConsolidationFileNameRaw = formData.get(
      "mergedConsolidationFileName",
    );
    const consolidationDivisionRaw = formData.get("consolidationDivision");
    const consolidationIARaw = formData.get("consolidationIA");
    const billingUnitFolderNameRaw =
      formData.get("billingUnitFolderName") ??
      formData.get("profileFolderName");
    const sourceFolderNamesRaw = formData.get("sourceFolderNames");
    const sourceConsolidationDivisionsRaw = formData.get(
      "sourceConsolidationDivisions",
    );
    const sourceConsolidationIAsRaw = formData.get("sourceConsolidationIAs");

    const createConsolidation =
      typeof createConsolidationRaw === "string" &&
      createConsolidationRaw.toLowerCase() === "true";
    const consolidationTemplateId =
      typeof consolidationTemplateIdRaw === "string"
        ? consolidationTemplateIdRaw.trim()
        : "";
    const createMergedConsolidation =
      typeof createMergedConsolidationRaw === "string" &&
      createMergedConsolidationRaw.toLowerCase() === "true";
    const mergedConsolidationFileName =
      typeof mergedConsolidationFileNameRaw === "string" &&
      mergedConsolidationFileNameRaw.trim()
        ? mergedConsolidationFileNameRaw.trim()
        : defaultMergedConsolidationFileName;
    const consolidationDivision =
      typeof consolidationDivisionRaw === "string"
        ? consolidationDivisionRaw.replace(/[^0-9]/g, "") || "0"
        : "0";
    const consolidationIA =
      typeof consolidationIARaw === "string" && consolidationIARaw.trim()
        ? consolidationIARaw.trim()
        : "IA";
    const billingUnitFolderName =
      typeof billingUnitFolderNameRaw === "string" &&
      billingUnitFolderNameRaw.trim()
        ? sanitizeFolderName(billingUnitFolderNameRaw)
        : "billing unit";
    const sourceFolderNames = parseTextMap(
      sourceFolderNamesRaw,
      sanitizeFolderName,
    );
    const sourceConsolidationDivisions = parseTextMap(
      sourceConsolidationDivisionsRaw,
      (value) => value.replace(/[^0-9]/g, ""),
    );
    const sourceConsolidationIAs = parseTextMap(
      sourceConsolidationIAsRaw,
      (value) => value.trim(),
    );

    const sourceFiles =
      files.length > 0 ? files : singleFile instanceof File ? [singleFile] : [];

    const sourceUploadValidation = validateUploads(
      sourceFiles,
      sourceUploadLimits,
    );
    if (!sourceUploadValidation.ok) {
      await logAuditTrailEntry({
        uid: result.user.uid,
        action: "generate-profiles.post",
        status: "rejected",
        route: "/api/v1/generate-profiles",
        method: "POST",
        request,
        httpStatus: sourceUploadValidation.status,
        details: { reason: sourceUploadValidation.reason },
      });
      return NextResponse.json(
        { error: sourceUploadValidation.message },
        { status: sourceUploadValidation.status },
      );
    }

    if (sourceFiles.length === 0) {
      await logAuditTrailEntry({
        uid: result.user.uid,
        action: "generate-profiles.post",
        status: "rejected",
        route: "/api/v1/generate-profiles",
        method: "POST",
        request,
        httpStatus: 400,
        details: { reason: "no-source-files" },
      });
      return NextResponse.json(
        { error: "No source Excel files uploaded" },
        { status: 400 },
      );
    }
    if (
      !(template instanceof File) &&
      !(typeof templateId === "string" && templateId.trim())
    ) {
      await logAuditTrailEntry({
        uid: result.user.uid,
        action: "generate-profiles.post",
        status: "rejected",
        route: "/api/v1/generate-profiles",
        method: "POST",
        request,
        httpStatus: 400,
        details: { reason: "missing-template" },
      });
      return NextResponse.json(
        {
          error:
            "Template is required. Upload a template or select a saved template.",
        },
        { status: 400 },
      );
    }
    if (createConsolidation && !consolidationTemplateId) {
      await logAuditTrailEntry({
        uid: result.user.uid,
        action: "generate-profiles.post",
        status: "rejected",
        route: "/api/v1/generate-profiles",
        method: "POST",
        request,
        httpStatus: 400,
        details: { reason: "missing-consolidation-template" },
      });
      return NextResponse.json(
        {
          error:
            "Consolidation template is required when create consolidation is enabled.",
        },
        { status: 400 },
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
          uid: result.user.uid,
          action: "generate-profiles.post",
          status: "rejected",
          route: "/api/v1/generate-profiles",
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
    } else if (typeof templateId === "string" && templateId.trim()) {
      const savedTemplate = await getTemplateRecord(templateId.trim());
      if (!savedTemplate) {
        await logAuditTrailEntry({
          uid: result.user.uid,
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
        return NextResponse.json(
          { error: "Selected template not found" },
          { status: 404 },
        );
      }
      templateBuffer = await downloadBufferFromStorage(
        savedTemplate.storagePath,
      );
    } else {
      return NextResponse.json(
        {
          error:
            "Template is required. Upload a template or select a saved template.",
        },
        { status: 400 },
      );
    }

    const zip = new JSZip();
    const seenDivisionFolders = new Map<string, number>();
    let totalGeneratedProfiles = 0;
    const consolidatedFilesForMerge: Array<{
      fileName: string;
      buffer: Buffer;
    }> = [];

    let consolidationTemplateBuffer: Buffer | null = null;
    if (createConsolidation) {
      const consolidationTemplate = await getTemplateRecord(
        consolidationTemplateId,
      );
      if (!consolidationTemplate) {
        await logAuditTrailEntry({
          uid: result.user.uid,
          action: "generate-profiles.post",
          status: "rejected",
          route: "/api/v1/generate-profiles",
          method: "POST",
          request,
          httpStatus: 404,
          details: {
            reason: "consolidation-template-not-found",
            consolidationTemplateId,
          },
        });
        return NextResponse.json(
          { error: "Selected consolidation template not found." },
          { status: 404 },
        );
      }
      consolidationTemplateBuffer = await downloadBufferFromStorage(
        consolidationTemplate.storagePath,
      );
    }

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
        sourceFolderNames[getSourceFileKey(sourceFile)] ??
          getFileBaseName(sourceFile.name),
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

      const generatedProfileFiles: { fileName: string; buffer: Buffer }[] = [];
      for (const [index, lotGroup] of lotGroups.entries()) {
        const { buffer, filename } = await generateProfileBuffer(
          lotGroup,
          index + 1,
          {
            templateBuffer,
          },
        );
        generatedProfileFiles.push({ fileName: filename, buffer });
        profilesFolder.file(filename, buffer);
      }

      totalGeneratedProfiles += generatedProfileFiles.length;

      if (createConsolidation && consolidationTemplateBuffer) {
        const sourceFileKey = getSourceFileKey(sourceFile);
        const detected = detectDivisionAndIAFromFilename(sourceFile.name);
        const sourceDivision =
          sourceConsolidationDivisions[sourceFileKey] ??
          detected.division ??
          consolidationDivision ??
          "0";
        const sourceIA =
          sourceConsolidationIAs[sourceFileKey] ??
          detected.ia ??
          consolidationIA ??
          "IA";
        const consolidationFileName = buildConsolidationFileName(
          sourceDivision,
          sourceIA,
        );
        const consolidated = await buildConsolidatedWorkbook({
          templateBuffer: consolidationTemplateBuffer,
          inputFiles: generatedProfileFiles,
          fileName: consolidationFileName,
          division: sourceDivision,
          ia: sourceIA,
        });
        divisionFolder.file(consolidated.outputName, consolidated.buffer);
        consolidatedFilesForMerge.push({
          fileName: consolidated.outputName,
          buffer: consolidated.buffer,
        });
      }
    }

    if (
      createConsolidation &&
      createMergedConsolidation &&
      consolidatedFilesForMerge.length > 0
    ) {
      if (consolidatedFilesForMerge.length === 1) {
        const singleFile = consolidatedFilesForMerge[0];
        const outputName = ensureXlsxExtension(mergedConsolidationFileName);
        zip.file(outputName, singleFile.buffer);
      } else {
        const { buffer, outputName } = await mergeExcelBuffers({
          inputFiles: consolidatedFilesForMerge,
          fileName: mergedConsolidationFileName,
          excelPageNames: consolidatedFilesForMerge.map((item) =>
            getFileBaseName(item.fileName),
          ),
        });
        zip.file(outputName, buffer);
      }
    }

    if (totalGeneratedProfiles === 0) {
      await logAuditTrailEntry({
        uid: result.user.uid,
        action: "generate-profiles.post",
        status: "rejected",
        route: "/api/v1/generate-profiles",
        method: "POST",
        request,
        httpStatus: 400,
        details: { reason: "no-lot-records-found" },
      });
      return NextResponse.json(
        {
          error:
            "No lot records found in uploaded files. Check spreadsheet format and upload valid source files.",
        },
        { status: 400 },
      );
    }

    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    await logAuditTrailEntry({
      uid: result.user.uid,
      action: "generate-profiles.post",
      status: "success",
      route: "/api/v1/generate-profiles",
      method: "POST",
      request,
      httpStatus: 200,
      details: {
        sourceFileCount: sourceFiles.length,
        totalGeneratedProfiles,
        createConsolidation,
        createMergedConsolidation:
          createConsolidation && createMergedConsolidation,
        mergedConsolidationFileCount: consolidatedFilesForMerge.length,
      },
    });

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="BILLING UNITS.zip"',
      },
    });
  } catch (error) {
    console.error("[api/generate-profiles POST]", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate profiles";
    await logAuditTrailEntry({
      uid: result.user.uid,
      action: "generate-profiles.post",
      status: "error",
      route: "/api/v1/generate-profiles",
      method: "POST",
      request,
      httpStatus: 500,
      errorMessage: message,
    });
    return NextResponse.json(
      { error: "Failed to generate profiles." },
      { status: 500 },
    );
  }
}
