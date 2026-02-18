import { GoogleGenerativeAI } from "@google/generative-ai";
import { PDFDocument } from "pdf-lib";
import { z } from "zod";
import type { LipaDivision, LipaReportData } from "@/lib/lipa-report-generator";

export type LipaSourceFile = {
  fileName: string;
  divisionName: string;
  pageNumber: number;
  buffer: Buffer;
};

export type LipaScannedFile = {
  fileName: string;
  divisionName: string;
  confidence: number;
  associations: LipaAssociationExtraction[];
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
};

type LipaAssociationExtraction = {
  name: string;
  totalArea: number;
};

type ExtractedFileResult = {
  fileName: string;
  divisionName: string;
  confidence: number;
  associations: LipaAssociationExtraction[];
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

const geminiModelName = "gemini-2.5-flash-lite";
const geminiPricingPerMillionTokens = {
  input: 0.15,
  output: 1.25,
};

const geminiJsonSchema = z.object({
  confidence: z.number().min(0).max(100).optional(),
  associations: z
    .array(
      z.object({
        name: z.string(),
        totalArea: z.union([z.number(), z.string()]),
      }),
    )
    .default([]),
});

const sanitizeAssociationName = (value: string): string =>
  value.replace(/\s+/g, " ").replace(/[\n\r\t]/g, " ").trim();

const parseNumericArea = (value: number | string): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseGeminiJsonResponse = (rawText: string): z.infer<typeof geminiJsonSchema> => {
  const cleaned = rawText
    .replace(/```json\n?/gi, "")
    .replace(/```\n?/g, "")
    .trim();

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("AI response parsing failed: no JSON object found.");

  const parsed = JSON.parse(jsonMatch[0]) as unknown;
  return geminiJsonSchema.parse(parsed);
};

const parseRetryDelayMs = (message: string): number => {
  const retryInMatch = message.match(/retry in ([0-9.]+)s/i);
  if (retryInMatch?.[1]) {
    const seconds = Number.parseFloat(retryInMatch[1]);
    if (Number.isFinite(seconds) && seconds > 0) {
      return Math.ceil(seconds * 1000);
    }
  }

  const retryDelayMatch = message.match(/"retryDelay":"([0-9.]+)s"/i);
  if (retryDelayMatch?.[1]) {
    const seconds = Number.parseFloat(retryDelayMatch[1]);
    if (Number.isFinite(seconds) && seconds > 0) {
      return Math.ceil(seconds * 1000);
    }
  }

  return 60_000;
};

const isQuotaOrRateLimitError = (message: string): boolean => {
  const lower = message.toLowerCase();
  return (
    lower.includes("429") ||
    lower.includes("too many requests") ||
    lower.includes("quota exceeded") ||
    lower.includes("rate limit")
  );
};

const generateContentWithQuotaGuard = async (
  model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>,
  parts: Array<
    | { inlineData: { mimeType: string; data: string } }
    | { text: string }
  >,
): Promise<Awaited<ReturnType<typeof model.generateContent>>> => {
  try {
    return await model.generateContent(parts);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isQuotaOrRateLimitError(message)) {
      const retryMs = parseRetryDelayMs(message);
      const retrySeconds = Math.ceil(retryMs / 1000);
      throw new Error(
        `Gemini API quota/rate limit reached. Please retry in about ${String(retrySeconds)} seconds.`,
      );
    }
    throw error;
  }
};

const buildGeminiPrompt = (originalPageNumber: number): string => `You are extracting irrigation summary data from a PDF.

Task:
1) Process ONLY the provided single-page PDF image (this is original page ${String(originalPageNumber)} from the source file).
2) Find irrigation association names and their corresponding total planted area values.
3) Return strict JSON only.
4) Do not include markdown fences.

Return this exact structure:
{
  "confidence": 95,
  "associations": [
    { "name": "ASSOCIATION NAME", "totalArea": 190.72 }
  ]
}

Rules:
- Extract only rows with both association name and numeric total area.
- Ignore unrelated tables or narrative text.
- If not found, return an empty associations array.
- confidence must be 0-100.
`;

const extractSinglePagePdf = async (
  sourceBuffer: Buffer,
  pageNumber: number,
): Promise<Buffer> => {
  const sourcePdf = await PDFDocument.load(sourceBuffer);
  const pageCount = sourcePdf.getPageCount();
  const resolvedPage = pageNumber === 0 ? pageCount : pageNumber;

  if (resolvedPage < 1 || resolvedPage > pageCount) {
    throw new Error(
      `Requested page ${String(pageNumber)} is out of range. This PDF has ${String(pageCount)} page(s).`,
    );
  }

  const targetPdf = await PDFDocument.create();
  const [page] = await targetPdf.copyPages(sourcePdf, [resolvedPage - 1]);
  targetPdf.addPage(page);
  const output = await targetPdf.save();
  return Buffer.from(output);
};

const extractFromSinglePdf = async (
  model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>,
  file: LipaSourceFile,
): Promise<ExtractedFileResult> => {
  const onePagePdfBuffer = await extractSinglePagePdf(file.buffer, file.pageNumber);

  const result = await generateContentWithQuotaGuard(model, [
    {
      inlineData: {
        mimeType: "application/pdf",
        data: onePagePdfBuffer.toString("base64"),
      },
    },
    { text: buildGeminiPrompt(file.pageNumber) },
  ]);

  const responseText = result.response.text();
  const parsed = parseGeminiJsonResponse(responseText);
  const usage = result.response.usageMetadata;

  const associations = parsed.associations
    .map((item) => ({
      name: sanitizeAssociationName(item.name),
      totalArea: parseNumericArea(item.totalArea),
    }))
    .filter((item) => item.name && item.totalArea > 0);

  return {
    fileName: file.fileName,
    divisionName: file.divisionName,
    confidence: parsed.confidence ?? 0,
    associations,
    inputTokens: usage?.promptTokenCount ?? 0,
    outputTokens: usage?.candidatesTokenCount ?? 0,
    totalTokens: usage?.totalTokenCount ?? 0,
  };
};

const toScannedFile = (entry: ExtractedFileResult): LipaScannedFile => {
  const estimatedCostUsd =
    (entry.inputTokens / 1_000_000) * geminiPricingPerMillionTokens.input +
    (entry.outputTokens / 1_000_000) * geminiPricingPerMillionTokens.output;

  return {
    fileName: entry.fileName,
    divisionName: entry.divisionName,
    confidence: entry.confidence,
    associations: entry.associations,
    inputTokens: entry.inputTokens,
    outputTokens: entry.outputTokens,
    totalTokens: entry.totalTokens,
    estimatedCostUsd: Number(estimatedCostUsd.toFixed(6)),
  };
};

export const scanLipaSourceFile = async (
  file: LipaSourceFile,
): Promise<LipaScannedFile> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing. Please set it in environment variables.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: geminiModelName });
  const extracted = await extractFromSinglePdf(model, file);
  return toScannedFile(extracted);
};

const mergeDivisionAssociations = (
  entries: ExtractedFileResult[],
): {
  divisions: LipaDivision[];
  extractedAssociations: number;
} => {
  const divisionBuckets = new Map<string, Map<string, { name: string; total: number }>>();
  let extractedAssociations = 0;

  for (const entry of entries) {
    const divisionName = entry.divisionName.trim() || "UNNAMED DIVISION";
    if (!divisionBuckets.has(divisionName)) {
      divisionBuckets.set(divisionName, new Map());
    }
    const divisionMap = divisionBuckets.get(divisionName);
    if (!divisionMap) continue;

    for (const assoc of entry.associations) {
      extractedAssociations += 1;
      const key = assoc.name.toLowerCase();
      const existing = divisionMap.get(key);
      if (!existing) {
        divisionMap.set(key, { name: assoc.name, total: assoc.totalArea });
      } else {
        existing.total += assoc.totalArea;
      }
    }
  }

  const divisions: LipaDivision[] = Array.from(divisionBuckets.entries()).map(
    ([divisionName, assocMap]) => {
      const irrigators = Array.from(assocMap.values())
        .map((entry) => ({
          name: entry.name,
          totalPlantedArea: Number(entry.total.toFixed(2)),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      const total = Number(
        irrigators.reduce((sum, item) => sum + item.totalPlantedArea, 0).toFixed(2),
      );
      return { divisionName, irrigators, total };
    },
  );

  return { divisions, extractedAssociations };
};

export const buildLipaReportData = async ({
  inputFiles,
  title,
  season,
}: {
  inputFiles: LipaSourceFile[];
  title?: string;
  season?: string;
}): Promise<{
  report: LipaReportData;
  scannedFiles: number;
  extractedAssociations: number;
  averageConfidence: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}> => {
  const scannedFiles = await Promise.all(inputFiles.map((file) => scanLipaSourceFile(file)));
  return buildLipaReportDataFromScannedFiles({
    scannedFiles,
    title,
    season,
  });
};

export const buildLipaReportDataFromScannedFiles = ({
  scannedFiles,
  title,
  season,
}: {
  scannedFiles: LipaScannedFile[];
  title?: string;
  season?: string;
}): {
  report: LipaReportData;
  scannedFiles: number;
  extractedAssociations: number;
  averageConfidence: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
} => {
  const extracted: ExtractedFileResult[] = scannedFiles.map((item) => ({
    fileName: item.fileName,
    divisionName: item.divisionName,
    confidence: item.confidence,
    associations: item.associations,
    inputTokens: item.inputTokens,
    outputTokens: item.outputTokens,
    totalTokens: item.totalTokens,
  }));

  const { divisions, extractedAssociations } = mergeDivisionAssociations(extracted);
  if (extractedAssociations === 0) {
    throw new Error(
      "No irrigation association data could be extracted from the uploaded PDFs.",
    );
  }

  const inputTokens = extracted.reduce((sum, file) => sum + file.inputTokens, 0);
  const outputTokens = extracted.reduce((sum, file) => sum + file.outputTokens, 0);
  const estimatedCostUsd =
    (inputTokens / 1_000_000) * geminiPricingPerMillionTokens.input +
    (outputTokens / 1_000_000) * geminiPricingPerMillionTokens.output;
  const averageConfidence =
    extracted.length > 0
      ? Number(
          (
            extracted.reduce((sum, file) => sum + file.confidence, 0) /
            extracted.length
          ).toFixed(2),
        )
      : 0;

  const report: LipaReportData = {
    title: title?.trim() || "LIST OF IRRIGATED AND PLANTED AREA (LIPA)",
    season: season?.trim() || "DRY CROPPING SEASON 2025",
    divisions,
  };

  return {
    report,
    scannedFiles: scannedFiles.length,
    extractedAssociations,
    averageConfidence,
    inputTokens,
    outputTokens,
    estimatedCostUsd: Number(estimatedCostUsd.toFixed(6)),
  };
};
