import { NextRequest, NextResponse } from "next/server";
import { validateIFRFiles } from "@/lib/services/ifr-checker.service";
import { logger } from "@/lib/logger";

/**
 * POST /api/v1/ifr-checker
 * Validate consolidated files against source IFR data
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const ifrFiles = formData.getAll("ifrFiles") as File[];
    const consolidatedFile = formData.get("consolidatedFile") as File;

    // Validate inputs
    if (!ifrFiles || ifrFiles.length === 0) {
      return NextResponse.json(
        { error: "No IFR files provided" },
        { status: 400 }
      );
    }

    if (!consolidatedFile) {
      return NextResponse.json(
        { error: "No consolidated file provided" },
        { status: 400 }
      );
    }

    // Validate using service
    const result = await validateIFRFiles(ifrFiles, consolidatedFile);

    return NextResponse.json(result);
  } catch (error) {
    logger.error("IFR Checker error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
