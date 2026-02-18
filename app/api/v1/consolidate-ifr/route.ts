import { NextResponse } from "next/server";
import XlsxPopulate from "xlsx-populate";
import { getSession } from "@/lib/auth/get-session";
import { extractData } from "@/lib/dataExtractor";
import { parseExcelFile } from "@/lib/excelParser";
import { getTemplateRecord } from "@/lib/firebase-admin/firestore";
import { downloadBufferFromStorage } from "@/lib/firebase-admin/storage";

const normalizeId = (value: unknown): string => {
  if (value === undefined || value === null) return "";
  const parsed = Number.parseInt(String(value), 10);
  if (Number.isNaN(parsed)) return "";
  return String(parsed);
};

const sanitizeFilename = (value: string): string =>
  value.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").trim();

const parseNumericValue = (value: string | number): number | null => {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace(/,/g, ""));
  if (!Number.isFinite(parsed)) return null;
  return parsed;
};

const setNumericCellWithFormat = (
  sheet: {
    cell: (ref: string) => {
      value: (val?: string | number) => unknown;
      style: (name: string, value: string) => unknown;
    };
  },
  address: string,
  value: string | number,
): void => {
  const parsed = parseNumericValue(value);
  const cell = sheet.cell(address);

  if (parsed === null) {
    cell.value("");
    return;
  }

  // Always keep numeric type; format displays 2 decimals and "-" for zero.
  cell.value(parsed);
  cell.style("numberFormat", '#,##0.00;-#,##0.00;"-"');
};

const setTextCell = (
  sheet: {
    cell: (ref: string) => {
      value: (val?: string | number) => unknown;
      style: (name: string, value: string) => unknown;
    };
  },
  address: string,
  value: string,
  options?: { alignLeft?: boolean; explicitText?: boolean },
): void => {
  const cell = sheet.cell(address);
  const trimmed = value.trim();
  cell.value(trimmed);
  if (options?.explicitText) {
    cell.style("numberFormat", "@");
  }
  if (options?.alignLeft) {
    cell.style("horizontalAlignment", "left");
  }
};

type SkippedDetail = {
  fileName: string;
  fileId?: string;
  reason: string;
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
    const fileNameRaw = formData.get("fileName");
    const divisionRaw = formData.get("division");
    const iaRaw = formData.get("ia");
    const requestedFileName =
      typeof fileNameRaw === "string" && fileNameRaw.trim()
        ? fileNameRaw.trim()
        : "DIVISION X CONSOLIDATED";
    const divisionValue =
      typeof divisionRaw === "string" ? divisionRaw.replace(/[^0-9]/g, "") : "0";
    const iaValue =
      typeof iaRaw === "string" && iaRaw.trim() ? iaRaw.trim() : "IA";

    if (files.length === 0 && !(singleFile instanceof File)) {
      return NextResponse.json({ error: "No IFR Excel files uploaded" }, { status: 400 });
    }
    if (!(template instanceof File) && !(typeof templateId === "string" && templateId.trim())) {
      return NextResponse.json(
        { error: "No consolidation template provided" },
        { status: 400 },
      );
    }

    const ifrFiles = files.length > 0 ? files : [singleFile as File];

    let templateBuffer: Buffer;
    if (template instanceof File) {
      templateBuffer = Buffer.from(await template.arrayBuffer());
    } else {
      const savedTemplate = await getTemplateRecord(result.user.uid, String(templateId).trim());
      if (!savedTemplate) {
        return NextResponse.json({ error: "Selected template not found" }, { status: 404 });
      }
      templateBuffer = await downloadBufferFromStorage(savedTemplate.storagePath);
    }
    const templateWorkbook = await XlsxPopulate.fromDataAsync(templateBuffer);
    const targetSheet: ReturnType<typeof templateWorkbook.sheet> | undefined =
      templateWorkbook.sheet(0) ?? templateWorkbook.sheet(1) ?? undefined;
    if (!targetSheet) {
      return NextResponse.json(
        { error: "Template has no readable worksheet" },
        { status: 404 },
      );
    }

    const rowByFileId = new Map<string, number>();
    // Scan reasonable row window for IDs in column A while preserving workbook formatting.
    for (let row = 1; row <= 10000; row += 1) {
      const aValue = targetSheet.cell(`A${String(row)}`).value();
      const id = normalizeId(aValue);
      if (id) rowByFileId.set(id, row);
    }

    let consolidatedCount = 0;
    const skippedDetails: SkippedDetail[] = [];

    for (const file of ifrFiles) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const parsedSheets = parseExcelFile(buffer);
      if (parsedSheets.length === 0) {
        skippedDetails.push({
          fileName: file.name,
          reason: "No readable worksheet data found in file.",
        });
        continue;
      }

      const extracted = extractData(parsedSheets, file.name);
      if (!extracted.fileId) {
        skippedDetails.push({
          fileName: file.name,
          reason: "Cannot extract file ID from filename prefix.",
        });
        continue;
      }

      const targetRow = rowByFileId.get(extracted.fileId);
      if (!targetRow) {
        skippedDetails.push({
          fileName: file.name,
          fileId: extracted.fileId,
          reason: `No matching row in template column A for file ID ${extracted.fileId}.`,
        });
        continue;
      }

      const rowLabel = String(targetRow);

      if (extracted.accountDetails.length > 0) {
        const detail = extracted.accountDetails[0];
        setTextCell(targetSheet, `B${rowLabel}`, detail.lotNo, {
          alignLeft: true,
          explicitText: true,
        });
        setTextCell(targetSheet, `C${rowLabel}`, detail.lotOwner.lastName);
        setTextCell(targetSheet, `D${rowLabel}`, detail.lotOwner.firstName);
        setTextCell(targetSheet, `E${rowLabel}`, "");
        setTextCell(targetSheet, `F${rowLabel}`, detail.farmer.lastName);
        setTextCell(targetSheet, `G${rowLabel}`, detail.farmer.firstName);
      }

      if (extracted.soaDetails.length > 0) {
        const detail = extracted.soaDetails[0];
        setNumericCellWithFormat(targetSheet, `I${rowLabel}`, detail.area);
        setNumericCellWithFormat(targetSheet, `J${rowLabel}`, detail.principal);
        setNumericCellWithFormat(targetSheet, `K${rowLabel}`, detail.penalty);
        setNumericCellWithFormat(targetSheet, `L${rowLabel}`, detail.oldAccount);
        setNumericCellWithFormat(targetSheet, `M${rowLabel}`, detail.total);
      }

      setTextCell(targetSheet, `N${rowLabel}`, iaValue);
      targetSheet
        .cell(`O${rowLabel}`)
        .value(Number.parseInt(divisionValue || "0", 10) || 0);

      consolidatedCount += 1;
    }

    if (consolidatedCount === 0) {
      return NextResponse.json(
        {
          error: "No files were consolidated",
          hint: "Check IFR filenames have numeric prefixes and template column A has matching IDs.",
          skippedDetails,
        },
        { status: 400 },
      );
    }

    const output = await templateWorkbook.outputAsync();
    const outputBuffer = Buffer.isBuffer(output)
      ? output
      : Buffer.from(output as ArrayBuffer);

    const safeFileName =
      sanitizeFilename(requestedFileName) || "DIVISION X CONSOLIDATED";
    const outputName = safeFileName.endsWith(".xlsx")
      ? safeFileName
      : `${safeFileName}.xlsx`;
    const skippedItems = skippedDetails.map((item) =>
      item.fileId ? `${item.fileName} (${item.fileId})` : item.fileName,
    );
    const skippedSummary = skippedItems.slice(0, 50).join(",");
    const skippedDetailsHeader = encodeURIComponent(
      JSON.stringify(skippedDetails.slice(0, 200)),
    );

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
    return NextResponse.json({ error: "Failed to consolidate IFR file" }, { status: 500 });
  }
}
