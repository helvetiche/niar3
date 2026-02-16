import { NextResponse } from "next/server";
import XlsxPopulate from "xlsx-populate";
import { getSession } from "@/lib/auth/get-session";
import { extractData } from "@/lib/dataExtractor";
import { parseExcelFile } from "@/lib/excelParser";

const normalizeId = (value: unknown): string => {
  if (value === undefined || value === null) return "";
  const parsed = Number.parseInt(String(value), 10);
  if (Number.isNaN(parsed)) return "";
  return String(parsed);
};

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
  cell.value(options?.explicitText ? `'${trimmed}` : trimmed);
  if (options?.explicitText) {
    cell.style("numberFormat", "@");
  }
  if (options?.alignLeft) {
    cell.style("horizontalAlignment", "left");
  }
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
    const tabNameRaw = formData.get("tabName");
    const tabName =
      typeof tabNameRaw === "string" && tabNameRaw.trim() ? tabNameRaw.trim() : null;

    if (files.length === 0 && !(singleFile instanceof File)) {
      return NextResponse.json({ error: "No IFR Excel files uploaded" }, { status: 400 });
    }
    if (!(template instanceof File)) {
      return NextResponse.json(
        { error: "No consolidation template uploaded" },
        { status: 400 },
      );
    }

    const ifrFiles = files.length > 0 ? files : [singleFile as File];

    const templateBuffer = Buffer.from(await template.arrayBuffer());
    const templateWorkbook = await XlsxPopulate.fromDataAsync(templateBuffer);
    let targetSheet: ReturnType<typeof templateWorkbook.sheet> | undefined;
    try {
      if (tabName) {
        targetSheet = templateWorkbook.sheet(tabName);
      }
    } catch {
      targetSheet = undefined;
    }
    if (!targetSheet) {
      // xlsx-populate indexing can vary by workbook; try both common indices.
      targetSheet =
        templateWorkbook.sheet(0) ?? templateWorkbook.sheet(1) ?? undefined;
    }
    if (!targetSheet) {
      return NextResponse.json(
        {
          error: tabName
            ? `Template sheet "${tabName}" not found`
            : "Template has no readable worksheet",
        },
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
    const skippedIds: string[] = [];
    const skippedFiles: string[] = [];

    for (const file of ifrFiles) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const parsedSheets = parseExcelFile(buffer);
      if (parsedSheets.length === 0) {
        skippedFiles.push(file.name);
        continue;
      }

      const extracted = extractData(parsedSheets, file.name);
      if (!extracted.fileId) {
        skippedFiles.push(file.name);
        continue;
      }

      const targetRow = rowByFileId.get(extracted.fileId);
      if (!targetRow) {
        skippedIds.push(extracted.fileId);
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

      consolidatedCount += 1;
    }

    if (consolidatedCount === 0) {
      return NextResponse.json(
        {
          error: "No files were consolidated",
          hint: "Check IFR filenames have numeric prefixes and template column A has matching IDs.",
          skippedIds,
          skippedFiles,
        },
        { status: 400 },
      );
    }

    const output = await templateWorkbook.outputAsync();
    const outputBuffer = Buffer.isBuffer(output)
      ? output
      : Buffer.from(output as ArrayBuffer);

    const baseTemplateName = template.name.replace(/\.(xlsx|xls)$/i, "") || "template";
    const outputName = `${baseTemplateName}-consolidated-batch.xlsx`;
    const skippedSummary = [...skippedIds, ...skippedFiles].slice(0, 50).join(",");

    return new NextResponse(new Uint8Array(outputBuffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${outputName}"`,
        "X-Consolidated-Count": String(consolidatedCount),
        "X-Skipped-Count": String(skippedIds.length + skippedFiles.length),
        "X-Skipped-Items": skippedSummary,
      },
    });
  } catch (error) {
    console.error("[api/consolidate-ifr POST]", error);
    return NextResponse.json({ error: "Failed to consolidate IFR file" }, { status: 500 });
  }
}
