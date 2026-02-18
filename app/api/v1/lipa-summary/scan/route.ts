import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/get-session";
import { scanLipaSourceFile } from "@/lib/lipa-summary";

const scanPayloadSchema = z.object({
  divisionName: z.string().min(1),
  pageNumber: z.number().int().nonnegative(),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const payloadRaw = formData.get("payload");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "PDF file is required." }, { status: 400 });
    }
    if (!file.type.includes("pdf") && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are supported." }, { status: 400 });
    }
    if (typeof payloadRaw !== "string" || !payloadRaw.trim()) {
      return NextResponse.json(
        { error: "Scan payload is required." },
        { status: 400 },
      );
    }

    const payload = scanPayloadSchema.parse(JSON.parse(payloadRaw) as unknown);
    const scanned = await scanLipaSourceFile({
      fileName: file.name,
      divisionName: payload.divisionName.trim(),
      pageNumber: payload.pageNumber,
      buffer: Buffer.from(await file.arrayBuffer()),
    });

    return NextResponse.json({ scanned });
  } catch (error) {
    console.error("[api/lipa-summary/scan POST]", error);
    const message =
      error instanceof Error ? error.message : "Failed to scan PDF for LIPA summary";
    const lower = message.toLowerCase();
    const isQuotaOrRateLimit =
      lower.includes("quota") ||
      lower.includes("too many requests") ||
      lower.includes("rate limit") ||
      lower.includes("429");
    return NextResponse.json(
      { error: message },
      { status: isQuotaOrRateLimit ? 429 : 500 },
    );
  }
}
