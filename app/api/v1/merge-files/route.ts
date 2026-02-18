import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import {
  mergeExcelBuffers,
  mergePdfBuffers,
} from "@/lib/merge-files";

type MergeMode = "pdf" | "excel";

type PageOrderItem = {
  fileIndex: number;
  pageIndex: number;
};

const isMergeMode = (value: unknown): value is MergeMode =>
  value === "pdf" || value === "excel";

const parsePageOrder = (value: FormDataEntryValue | null): PageOrderItem[] => {
  if (typeof value !== "string" || !value.trim()) return [];

  const parsed = JSON.parse(value) as unknown;
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

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const modeValue = formData.get("mode");
    const fileNameValue = formData.get("fileName");
    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File);

    if (!isMergeMode(modeValue)) {
      return NextResponse.json(
        { error: "Invalid merge mode. Use pdf or excel." },
        { status: 400 },
      );
    }

    if (files.length < 2) {
      return NextResponse.json(
        { error: "Please upload at least two files to merge." },
        { status: 400 },
      );
    }

    const fileName = typeof fileNameValue === "string" ? fileNameValue : undefined;
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

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${outputName}"`,
          "X-Merged-Count": String(mergedPageCount),
        },
      });
    }

    const { buffer, outputName, mergedSheetCount } = mergeExcelBuffers({
      inputFiles,
      fileName,
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${outputName}"`,
        "X-Merged-Count": String(mergedSheetCount),
      },
    });
  } catch (error) {
    console.error("[api/merge-files POST]", error);
    const message = error instanceof Error ? error.message : "Failed to merge files";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
