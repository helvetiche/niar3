import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { extractData } from "@/lib/dataExtractor";
import { parseExcelFile } from "@/lib/excelParser";
import { batchWriteToSheet, readFromSheet } from "@/lib/googleSheets";

const rangeWithSheet = (sheetName: string | null, range: string): string => {
  if (!sheetName || sheetName.trim() === "") return range;
  const needsQuotes = /[\s'"]/.test(sheetName);
  const escaped = needsQuotes ? `'${sheetName.replace(/'/g, "''")}'` : sheetName;
  return `${escaped}!${range}`;
};

export async function POST(request: Request) {
  const result = await getSession();
  if (!result.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const sheetId = formData.get("sheetId");
    const tabNameRaw = formData.get("tabName");
    const tabName =
      typeof tabNameRaw === "string" && tabNameRaw.trim() ? tabNameRaw.trim() : null;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No Excel file uploaded" }, { status: 400 });
    }
    if (typeof sheetId !== "string" || !sheetId.trim()) {
      return NextResponse.json({ error: "Google Sheet ID is required" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsedSheets = parseExcelFile(buffer);
    if (parsedSheets.length === 0) {
      return NextResponse.json(
        { error: "No sheet data found in uploaded file" },
        { status: 400 },
      );
    }

    const extracted = extractData(parsedSheets, file.name);
    if (!extracted.fileId) {
      return NextResponse.json(
        { error: "Could not extract file ID from file name" },
        { status: 400 },
      );
    }

    const sheetColumnA = (await readFromSheet(
      sheetId.trim(),
      rangeWithSheet(tabName, "A:A"),
    )) as (string | number)[][];

    let targetRow = -1;
    for (const [index, row] of sheetColumnA.entries()) {
      const firstCell = row[0];
      if (firstCell === null || firstCell === undefined || firstCell === "") continue;

      const normalized = String(Number.parseInt(String(firstCell), 10));
      if (normalized === extracted.fileId) {
        targetRow = index + 1;
        break;
      }
    }

    if (targetRow === -1) {
      return NextResponse.json(
        {
          error: `No matching row found in column A for file ID ${extracted.fileId}`,
          hint: "Ensure column A contains values like 1, 01, 2, 02 matching your file prefix.",
        },
        { status: 404 },
      );
    }

    const updates: { range: string; values: unknown[][] }[] = [];
    const rowLabel = String(targetRow);

    if (extracted.accountDetails.length > 0) {
      const detail = extracted.accountDetails[0];
      updates.push({
        range: rangeWithSheet(tabName, `B${rowLabel}:G${rowLabel}`),
        values: [
          [
            detail.lotNo,
            detail.lotOwner.lastName,
            detail.lotOwner.firstName,
            "",
            detail.farmer.lastName,
            detail.farmer.firstName,
          ],
        ],
      });
    }

    if (extracted.soaDetails.length > 0) {
      const detail = extracted.soaDetails[0];
      updates.push({
        range: rangeWithSheet(tabName, `I${rowLabel}:M${rowLabel}`),
        values: [
          [detail.area, detail.principal, detail.penalty, detail.oldAccount, detail.total],
        ],
      });
    }

    await batchWriteToSheet(sheetId.trim(), updates);

    return NextResponse.json({
      success: true,
      row: targetRow,
      rowsWritten: updates.length,
    });
  } catch (error) {
    console.error("[api/consolidate-ifr POST]", error);

    const apiError = error as { code?: number; response?: { status?: number }; message?: string };
    const status = apiError.code ?? apiError.response?.status;
    const isRateLimited =
      status === 429 ||
      apiError.message?.includes("429") ||
      apiError.message?.includes("Quota exceeded");

    if (isRateLimited) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded on Google Sheets API",
          code: "quota_exceeded",
        },
        { status: 429 },
      );
    }

    return NextResponse.json({ error: "Failed to consolidate IFR file" }, { status: 500 });
  }
}
