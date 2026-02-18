import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/get-session";
import { generateLipaReportWorkbook } from "@/lib/lipa-report-generator";
import {
  buildLipaReportDataFromScannedFiles,
  type LipaScannedFile,
} from "@/lib/lipa-summary";

const scannedFileSchema = z.object({
  fileName: z.string().min(1),
  divisionName: z.string().min(1),
  confidence: z.number().min(0).max(100),
  associations: z.array(
    z.object({
      name: z.string().min(1),
      totalArea: z.number(),
    }),
  ),
  inputTokens: z.number().nonnegative(),
  outputTokens: z.number().nonnegative(),
  totalTokens: z.number().nonnegative(),
  estimatedCostUsd: z.number().nonnegative(),
});

const bodySchema = z.object({
  title: z.string().optional(),
  season: z.string().optional(),
  outputFileName: z.string().optional(),
  scannedFiles: z.array(scannedFileSchema).min(1),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const raw = await request.json();
    const parsed = bodySchema.parse(raw);

    const data = buildLipaReportDataFromScannedFiles({
      scannedFiles: parsed.scannedFiles as LipaScannedFile[],
      title: parsed.title,
      season: parsed.season,
    });
    const { buffer, outputName } = await generateLipaReportWorkbook({
      report: data.report,
      outputFileName: parsed.outputFileName,
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${outputName}"`,
        "X-Scanned-Files": String(data.scannedFiles),
        "X-Extracted-Associations": String(data.extractedAssociations),
        "X-Average-Confidence": String(data.averageConfidence),
        "X-Estimated-Cost-Usd": String(data.estimatedCostUsd),
      },
    });
  } catch (error) {
    console.error("[api/lipa-summary/report POST]", error);
    const message =
      error instanceof Error ? error.message : "Failed to build LIPA report output";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
