import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { applySecurityHeaders } from "@/lib/security-headers";
import { getTemplateRecord } from "@/lib/firebase-admin/firestore";
import { downloadBufferFromStorage } from "@/lib/firebase-admin/storage";
import { logAuditTrailEntry } from "@/lib/firebase-admin/audit-trail";
import { logger } from "@/lib/logger";

export async function GET(
  request: Request,
  context: { params: Promise<{ templateId: string }> },
) {
  const result = await getSession();
  if (!result.user) {
    await logAuditTrailEntry({
      action: "templates.template-id.download.get",
      status: "rejected",
      route: "/api/v1/templates/[templateId]/download",
      method: "GET",
      request,
      httpStatus: 401,
      details: { reason: "unauthorized" },
    });
    return applySecurityHeaders(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );
  }

  const params = await context.params;
  const templateId = params.templateId;

  try {
    const template = await getTemplateRecord(templateId);
    if (!template) {
      await logAuditTrailEntry({
        uid: result.user.uid,
        action: "templates.template-id.download.get",
        status: "rejected",
        route: "/api/v1/templates/[templateId]/download",
        method: "GET",
        request,
        httpStatus: 404,
        details: { reason: "template-not-found", templateId },
      });
      return applySecurityHeaders(
        NextResponse.json({ error: "Template not found" }, { status: 404 }),
      );
    }

    // Download the file from storage
    const fileBuffer = await downloadBufferFromStorage(template.storagePath);

    await logAuditTrailEntry({
      uid: result.user.uid,
      action: "templates.template-id.download.get",
      status: "success",
      route: "/api/v1/templates/[templateId]/download",
      method: "GET",
      request,
      httpStatus: 200,
      details: {
        templateId,
        scope: template.scope,
        sizeBytes: fileBuffer.length,
      },
    });

    // Return the file as a blob
    const response = new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        "Content-Type":
          template.contentType ||
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${template.name}"`,
        "Content-Length": fileBuffer.length.toString(),
      },
    });

    return applySecurityHeaders(response);
  } catch (error) {
    logger.error("[api/templates/:id/download GET]", error);
    await logAuditTrailEntry({
      uid: result.user.uid,
      action: "templates.template-id.download.get",
      status: "error",
      route: "/api/v1/templates/[templateId]/download",
      method: "GET",
      request,
      httpStatus: 500,
      errorMessage: "Failed to download template",
      details: { templateId },
    });
    return applySecurityHeaders(
      NextResponse.json(
        { error: "Failed to download template" },
        { status: 500 },
      ),
    );
  }
}
