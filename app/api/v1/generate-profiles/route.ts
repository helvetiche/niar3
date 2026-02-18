import { NextResponse } from "next/server";
import JSZip from "jszip";
import { getSession } from "@/lib/auth/get-session";
import { parseExcelFile } from "@/lib/excelParser";
import { processMastersList } from "@/lib/mastersListProcessor";
import { generateProfileBuffer } from "@/lib/profileGenerator";
import { getTemplateRecord } from "@/lib/firebase-admin/firestore";
import { downloadBufferFromStorage } from "@/lib/firebase-admin/storage";

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

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No master's list Excel file uploaded" },
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

    let templateBuffer: Buffer | undefined;
    if (template instanceof File) {
      templateBuffer = Buffer.from(await template.arrayBuffer());
    } else if (typeof templateId === "string" && templateId.trim()) {
      const savedTemplate = await getTemplateRecord(result.user.uid, templateId.trim());
      if (!savedTemplate) {
        return NextResponse.json({ error: "Selected template not found" }, { status: 404 });
      }
      templateBuffer = await downloadBufferFromStorage(savedTemplate.storagePath);
    }

    const zip = new JSZip();
    for (let i = 0; i < lotGroups.length; i += 1) {
      const { buffer, filename } = await generateProfileBuffer(lotGroups[i], i + 1, {
        templateBuffer,
      });
      zip.file(filename, buffer);
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
