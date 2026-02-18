import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/get-session";
import { scanLipaSourceFile } from "@/lib/lipa-summary";
import { logAuditTrailEntry } from "@/lib/firebase-admin/audit-trail";

const scanPayloadSchema = z.object({
  divisionName: z.string().min(1),
  pageNumber: z.number().int().nonnegative(),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.user) {
    await logAuditTrailEntry({
      action: "lipa-summary.scan.post",
      status: "rejected",
      route: "/api/v1/lipa-summary/scan",
      method: "POST",
      request,
      httpStatus: 401,
      details: { reason: "unauthorized" },
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const payloadRaw = formData.get("payload");

    if (!(file instanceof File)) {
      await logAuditTrailEntry({
        uid: session.user.uid,
        action: "lipa-summary.scan.post",
        status: "rejected",
        route: "/api/v1/lipa-summary/scan",
        method: "POST",
        request,
        httpStatus: 400,
        details: { reason: "missing-file" },
      });
      return NextResponse.json(
        { error: "PDF file is required." },
        { status: 400 },
      );
    }
    if (
      !file.type.includes("pdf") &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      await logAuditTrailEntry({
        uid: session.user.uid,
        action: "lipa-summary.scan.post",
        status: "rejected",
        route: "/api/v1/lipa-summary/scan",
        method: "POST",
        request,
        httpStatus: 400,
        details: {
          reason: "invalid-file-type",
          fileName: file.name,
          fileType: file.type,
        },
      });
      return NextResponse.json(
        { error: "Only PDF files are supported." },
        { status: 400 },
      );
    }
    if (typeof payloadRaw !== "string" || !payloadRaw.trim()) {
      await logAuditTrailEntry({
        uid: session.user.uid,
        action: "lipa-summary.scan.post",
        status: "rejected",
        route: "/api/v1/lipa-summary/scan",
        method: "POST",
        request,
        httpStatus: 400,
        details: { reason: "missing-payload" },
      });
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

    await logAuditTrailEntry({
      uid: session.user.uid,
      action: "lipa-summary.scan.post",
      status: "success",
      route: "/api/v1/lipa-summary/scan",
      method: "POST",
      request,
      httpStatus: 200,
      details: {
        fileName: file.name,
        divisionName: payload.divisionName.trim(),
        pageNumber: payload.pageNumber,
        confidence: scanned.confidence,
        associationCount: scanned.associations.length,
      },
    });

    return NextResponse.json({ scanned });
  } catch (error) {
    console.error("[api/lipa-summary/scan POST]", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to scan PDF for LIPA summary";
    const lower = message.toLowerCase();
    const isQuotaOrRateLimit =
      lower.includes("quota") ||
      lower.includes("too many requests") ||
      lower.includes("rate limit") ||
      lower.includes("429");
    await logAuditTrailEntry({
      uid: session.user.uid,
      action: "lipa-summary.scan.post",
      status: "error",
      route: "/api/v1/lipa-summary/scan",
      method: "POST",
      request,
      httpStatus: isQuotaOrRateLimit ? 429 : 500,
      errorMessage: message,
    });
    return NextResponse.json(
      { error: message },
      { status: isQuotaOrRateLimit ? 429 : 500 },
    );
  }
}
