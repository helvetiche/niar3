import { getTemplateRecord } from "@/lib/firebase-admin/firestore";
import { downloadBufferFromStorage } from "@/lib/firebase-admin/storage";
import { buildConsolidatedWorkbook } from "@/lib/consolidation";

type ConsolidateOptions = {
  templateId?: string;
  templateBuffer?: Buffer;
  inputFiles: Array<{ fileName: string; buffer: Buffer }>;
  fileName: string;
  division: string;
  ia: string;
};

type ConsolidateResult = {
  buffer: Buffer;
  outputName: string;
  consolidatedCount: number;
  skippedDetails: Array<{
    fileName: string;
    fileId?: string;
    reason: string;
  }>;
};

export async function consolidateIfrFiles(
  options: ConsolidateOptions,
): Promise<ConsolidateResult> {
  let templateBuffer: Buffer;

  if (options.templateBuffer) {
    templateBuffer = options.templateBuffer;
  } else if (options.templateId) {
    const savedTemplate = await getTemplateRecord(options.templateId);
    if (!savedTemplate) {
      throw new Error("Template not found");
    }
    templateBuffer = await downloadBufferFromStorage(savedTemplate.storagePath);
  } else {
    throw new Error("Either templateId or templateBuffer must be provided");
  }

  return buildConsolidatedWorkbook({
    templateBuffer,
    inputFiles: options.inputFiles,
    fileName: options.fileName,
    division: options.division,
    ia: options.ia,
  });
}
