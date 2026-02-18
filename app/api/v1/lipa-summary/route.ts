import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/get-session";
import { buildLipaReportData } from "@/lib/lipa-summary";
import { generateLipaReportWorkbook } from "@/lib/lipa-report-generator";

const fileMappingSchema = z.object({
  fileIndex: z.number().int().nonnegative(),
  fileName: z.string().min(1),
  divisionName: z.string().min(1),
  pageNumber: z.number().int().nonnegative(),
});

const parseMappings = (
  raw: FormDataEntryValue | null,
): z.infer<typeof fileMappingSchema>[] => {
  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error("File division mapping is required.");
  }
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) throw new Error("Invalid file division mapping.");
  return z.array(fileMappingSchema).parse(parsed);
};

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File);
    const mappings = parseMappings(formData.get("mappings"));
    const titleRaw = formData.get("title");
    const seasonRaw = formData.get("season");
    const outputFileNameRaw = formData.get("outputFileName");

    if (files.length === 0) {
      return NextResponse.json(
        { error: "Please upload at least one PDF file." },
        { status: 400 },
      );
    }

    if (mappings.length !== files.length) {
      return NextResponse.json(
        { error: "Each uploaded file must have a mapped division and page number." },
        { status: 400 },
      );
    }

    const fileByIndex = files.map((file, index) => ({ file, index }));
    const mappingByIndex = new Map(mappings.map((mapping) => [mapping.fileIndex, mapping]));

    const inputFiles = await Promise.all(
      fileByIndex.map(async ({ file, index }) => {
        if (!file.type.includes("pdf") && !file.name.toLowerCase().endsWith(".pdf")) {
          throw new Error(`Only PDF files are supported. Invalid file: ${file.name}`);
        }
        const mapping = mappingByIndex.get(index);
        if (!mapping || !mapping.divisionName.trim()) {
          throw new Error(`Missing division mapping for file: ${file.name}`);
        }
        if (!Number.isInteger(mapping.pageNumber) || mapping.pageNumber < 0) {
          throw new Error(`Invalid page number for file: ${file.name}`);
        }

        return {
          fileName: file.name,
          divisionName: mapping.divisionName.trim(),
          pageNumber: mapping.pageNumber,
          buffer: Buffer.from(await file.arrayBuffer()),
        };
      }),
    );

    const title = typeof titleRaw === "string" ? titleRaw.trim() : "";
    const season = typeof seasonRaw === "string" ? seasonRaw.trim() : "";
    const outputFileName =
      typeof outputFileNameRaw === "string" ? outputFileNameRaw.trim() : "";

    const data = await buildLipaReportData({
      inputFiles,
      title,
      season,
    });
    const { buffer, outputName } = await generateLipaReportWorkbook({
      report: data.report,
      outputFileName,
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
    console.error("[api/lipa-summary POST]", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate LIPA summary report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
