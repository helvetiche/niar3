import { NextResponse } from "next/server";
import JSZip from "jszip";
import { getSession } from "@/lib/auth/get-session";
import { parseExcelFile } from "@/lib/excelParser";
import { processMastersList } from "@/lib/mastersListProcessor";
import { generateProfileBuffer } from "@/lib/profileGenerator";
import { getTemplateRecord } from "@/lib/firebase-admin/firestore";
import { downloadBufferFromStorage } from "@/lib/firebase-admin/storage";
import { buildConsolidatedWorkbook } from "@/lib/consolidation";

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

export async function POST(request: Request) {
  const result = await getSession();
  if (!result.user) {
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
    const consolidationFileNameRaw = formData.get("consolidationFileName");
    const consolidationDivisionRaw = formData.get("consolidationDivision");
    const consolidationIARaw = formData.get("consolidationIA");

    const createConsolidation =
      typeof createConsolidationRaw === "string" &&
      createConsolidationRaw.toLowerCase() === "true";
    const consolidationTemplateId =
      typeof consolidationTemplateIdRaw === "string"
        ? consolidationTemplateIdRaw.trim()
        : "";
    const consolidationFileName =
      typeof consolidationFileNameRaw === "string" && consolidationFileNameRaw.trim()
        ? consolidationFileNameRaw.trim()
        : "DIVISION X CONSOLIDATED";
    const consolidationDivision =
      typeof consolidationDivisionRaw === "string"
        ? consolidationDivisionRaw.replace(/[^0-9]/g, "") || "0"
        : "0";
    const consolidationIA =
      typeof consolidationIARaw === "string" && consolidationIARaw.trim()
        ? consolidationIARaw.trim()
        : "IA";

    const sourceFiles = files.length > 0 ? files : singleFile instanceof File ? [singleFile] : [];

    if (sourceFiles.length === 0) {
      return NextResponse.json(
        { error: "No source Excel files uploaded" },
        { status: 400 },
      );
    }
    if (!(template instanceof File) && !(typeof templateId === "string" && templateId.trim())) {
      return NextResponse.json(
        { error: "Template is required. Upload a template or select a saved template." },
        { status: 400 },
      );
    }
    if (createConsolidation && !consolidationTemplateId) {
      return NextResponse.json(
        { error: "Consolidation template is required when create consolidation is enabled." },
        { status: 400 },
      );
    }

    let templateBuffer: Buffer;
    if (template instanceof File) {
      templateBuffer = Buffer.from(await template.arrayBuffer());
    } else if (typeof templateId === "string" && templateId.trim()) {
      const savedTemplate = await getTemplateRecord(result.user.uid, templateId.trim());
      if (!savedTemplate) {
        return NextResponse.json({ error: "Selected template not found" }, { status: 404 });
      }
      templateBuffer = await downloadBufferFromStorage(savedTemplate.storagePath);
    } else {
      return NextResponse.json(
        { error: "Template is required. Upload a template or select a saved template." },
        { status: 400 },
      );
    }

    const zip = new JSZip();
    const seenDivisionFolders = new Map<string, number>();
    let totalGeneratedProfiles = 0;

    let consolidationTemplateBuffer: Buffer | null = null;
    if (createConsolidation) {
      const consolidationTemplate = await getTemplateRecord(
        result.user.uid,
        consolidationTemplateId,
      );
      if (!consolidationTemplate) {
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
        getFileBaseName(sourceFile.name),
        seenDivisionFolders,
      );
      const divisionFolder = zip.folder(divisionFolderName);
      if (!divisionFolder) {
        throw new Error(`Unable to create folder: ${divisionFolderName}`);
      }

      const consolidatedDivisionFolder = divisionFolder.folder("consolidated division");
      if (!consolidatedDivisionFolder) {
        throw new Error(`Unable to create folder: ${divisionFolderName}/consolidated division`);
      }

      const profilesFolder = consolidatedDivisionFolder.folder("farmer profile");
      if (!profilesFolder) {
        throw new Error(
          `Unable to create folder: ${divisionFolderName}/consolidated division/farmer profile`,
        );
      }

      const generatedProfileFiles: { fileName: string; buffer: Buffer }[] = [];
      for (const [index, lotGroup] of lotGroups.entries()) {
        const { buffer, filename } = await generateProfileBuffer(lotGroup, index + 1, {
          templateBuffer,
        });
        generatedProfileFiles.push({ fileName: filename, buffer });
        profilesFolder.file(filename, buffer);
      }

      totalGeneratedProfiles += generatedProfileFiles.length;

      if (createConsolidation && consolidationTemplateBuffer) {
        const consolidated = await buildConsolidatedWorkbook({
          templateBuffer: consolidationTemplateBuffer,
          inputFiles: generatedProfileFiles,
          fileName: consolidationFileName,
          division: consolidationDivision,
          ia: consolidationIA,
        });
        consolidatedDivisionFolder.file(consolidated.outputName, consolidated.buffer);
      }
    }

    if (totalGeneratedProfiles === 0) {
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

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="farmer-profiles.zip"',
      },
    });
  } catch (error) {
    console.error("[api/generate-profiles POST]", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate profiles";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
