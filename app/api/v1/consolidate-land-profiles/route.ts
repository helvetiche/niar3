import { NextRequest, NextResponse } from "next/server";
import { consolidateIFR } from "@/lib/consolidate-ifr";
import {
  applySecurityHeaders,
  secureFileResponse,
} from "@/lib/security-headers";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Get template file
    const templateFile = formData.get("template") as File;
    if (!templateFile) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Template file is required" },
          { status: 400 },
        ),
      );
    }

    // Get all IFR files
    const ifrFiles: { buffer: Buffer; fileName: string }[] = [];
    let fileIndex = 0;

    while (true) {
      const file = formData.get(`landProfile_${fileIndex}`) as File;
      if (!file) break;

      const arrayBuffer = await file.arrayBuffer();
      ifrFiles.push({
        buffer: Buffer.from(arrayBuffer),
        fileName: file.name,
      });

      fileIndex++;
    }

    if (ifrFiles.length === 0) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "At least one IFR file is required" },
          { status: 400 },
        ),
      );
    }

    // Convert template to buffer
    const templateArrayBuffer = await templateFile.arrayBuffer();
    const templateBuffer = Buffer.from(templateArrayBuffer);

    // Process consolidation with automatic calculation
    const { buffer, processedCount, errors, warnings } = await consolidateIFR(
      templateBuffer,
      ifrFiles,
    );

    if (processedCount === 0) {
      return applySecurityHeaders(
        NextResponse.json(
          {
            error: "Consolidation failed",
            details: errors,
          },
          { status: 500 },
        ),
      );
    }

    // Return the file with metadata in headers
    const response = secureFileResponse(buffer, {
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename: `consolidated-ifr-${Date.now()}.xlsx`,
    });

    // Add custom headers for metadata
    response.headers.set("X-Processed-Count", processedCount.toString());
    response.headers.set("X-Error-Count", errors.length.toString());
    response.headers.set("X-Warning-Count", warnings.length.toString());
    response.headers.set("X-Errors", JSON.stringify(errors));
    response.headers.set("X-Warnings", JSON.stringify(warnings));

    return response;
  } catch (error) {
    console.error("Error in consolidate-ifr API:", error);
    return applySecurityHeaders(
      NextResponse.json(
        {
          error: "Internal server error",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      ),
    );
  }
}
