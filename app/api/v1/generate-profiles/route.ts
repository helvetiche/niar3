import { NextResponse } from "next/server";
import JSZip from "jszip";
import { getSession } from "@/lib/auth/get-session";
import { parseExcelFile } from "@/lib/excelParser";
import { processMastersList } from "@/lib/mastersListProcessor";
import { generateProfileBuffer } from "@/lib/profileGenerator";
import { getTemplateRecord } from "@/lib/firebase-admin/firestore";
import { downloadBufferFromStorage } from "@/lib/firebase-admin/storage";
import { buildConsolidatedWorkbook } from "@/lib/consolidation";

export async function POST(request: Request) {
  const result = await getSession();
  if (!result.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
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

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No master's list Excel file uploaded" },
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

    const mastersListBuffer = Buffer.from(await file.arrayBuffer());
    const parsedSheets = parseExcelFile(mastersListBuffer);
    if (parsedSheets.length === 0) {
      return NextResponse.json(
        { error: "No data found in the uploaded Excel file" },
        { status: 400 },
      );
    }

    const lotGroups = processMastersList(parsedSheets[0].data);
    if (lotGroups.length === 0) {
      return NextResponse.json(
        { error: "No lot records found in master's list" },
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
    const generatedProfileFiles: { fileName: string; buffer: Buffer }[] = [];
    const profileFolder = createConsolidation ? zip.folder("land-profiles") : null;
    for (let i = 0; i < lotGroups.length; i += 1) {
      const { buffer, filename } = await generateProfileBuffer(lotGroups[i], i + 1, {
        templateBuffer,
      });
      generatedProfileFiles.push({ fileName: filename, buffer });
      if (profileFolder) {
        profileFolder.file(filename, buffer);
      } else {
        zip.file(filename, buffer);
      }
    }

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
      const consolidationTemplateBuffer = await downloadBufferFromStorage(
        consolidationTemplate.storagePath,
      );
      const consolidated = await buildConsolidatedWorkbook({
        templateBuffer: consolidationTemplateBuffer,
        inputFiles: generatedProfileFiles,
        fileName: consolidationFileName,
        division: consolidationDivision,
        ia: consolidationIA,
      });
      zip.file(consolidated.outputName, consolidated.buffer);
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
