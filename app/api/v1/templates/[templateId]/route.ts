import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { applySecurityHeaders } from "@/lib/security-headers";
import {
  deleteTemplateRecord,
  getTemplateRecord,
  updateTemplateRecord,
} from "@/lib/firebase-admin/firestore";
import {
  deleteFromStorage,
  uploadBufferToStorage,
} from "@/lib/firebase-admin/storage";
import { logAuditTrailEntry } from "@/lib/firebase-admin/audit-trail";
import { logger } from "@/lib/logger";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ templateId: string }> },
) {
  const result = await getSession();
  if (!result.user) {
    await logAuditTrailEntry({
      action: "templates.template-id.delete",
      status: "rejected",
      route: "/api/v1/templates/[templateId]",
      method: "DELETE",
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
        action: "templates.template-id.delete",
        status: "rejected",
        route: "/api/v1/templates/[templateId]",
        method: "DELETE",
        request,
        httpStatus: 404,
        details: { reason: "template-not-found", templateId },
      });
      return applySecurityHeaders(
        NextResponse.json({ error: "Template not found" }, { status: 404 }),
      );
    }

    if (template.uploaderUid !== result.user.uid) {
      await logAuditTrailEntry({
        uid: result.user.uid,
        action: "templates.template-id.delete",
        status: "rejected",
        route: "/api/v1/templates/[templateId]",
        method: "DELETE",
        request,
        httpStatus: 403,
        details: { reason: "forbidden-not-owner", templateId },
      });
      return applySecurityHeaders(
        NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      );
    }

    await deleteFromStorage(template.storagePath);
    await deleteTemplateRecord(templateId);
    await logAuditTrailEntry({
      uid: result.user.uid,
      action: "templates.template-id.delete",
      status: "success",
      route: "/api/v1/templates/[templateId]",
      method: "DELETE",
      request,
      httpStatus: 200,
      details: { templateId, scope: template.scope },
    });
    return applySecurityHeaders(NextResponse.json({ ok: true }));
  } catch (error) {
    logger.error("[api/templates/:id DELETE]", error);
    await logAuditTrailEntry({
      uid: result.user.uid,
      action: "templates.template-id.delete",
      status: "error",
      route: "/api/v1/templates/[templateId]",
      method: "DELETE",
      request,
      httpStatus: 500,
      errorMessage: "Failed to delete template",
      details: { templateId },
    });
    return applySecurityHeaders(
      NextResponse.json(
        { error: "Failed to delete template" },
        { status: 500 },
      ),
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ templateId: string }> },
) {
  const result = await getSession();
  if (!result.user) {
    await logAuditTrailEntry({
      action: "templates.template-id.patch",
      status: "rejected",
      route: "/api/v1/templates/[templateId]",
      method: "PATCH",
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
    const existing = await getTemplateRecord(templateId);
    if (!existing) {
      await logAuditTrailEntry({
        uid: result.user.uid,
        action: "templates.template-id.patch",
        status: "rejected",
        route: "/api/v1/templates/[templateId]",
        method: "PATCH",
        request,
        httpStatus: 404,
        details: { reason: "template-not-found", templateId },
      });
      return applySecurityHeaders(
        NextResponse.json({ error: "Template not found" }, { status: 404 }),
      );
    }

    if (existing.uploaderUid !== result.user.uid) {
      await logAuditTrailEntry({
        uid: result.user.uid,
        action: "templates.template-id.patch",
        status: "rejected",
        route: "/api/v1/templates/[templateId]",
        method: "PATCH",
        request,
        httpStatus: 403,
        details: { reason: "forbidden-not-owner", templateId },
      });
      return applySecurityHeaders(
        NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      );
    }

    const formData = await request.formData();
    const nameRaw = formData.get("name");
    const fileRaw = formData.get("file");

    const nextName =
      typeof nameRaw === "string" && nameRaw.trim()
        ? nameRaw.trim()
        : undefined;
    const hasFile = fileRaw instanceof File;

    if (!nextName && !hasFile) {
      await logAuditTrailEntry({
        uid: result.user.uid,
        action: "templates.template-id.patch",
        status: "rejected",
        route: "/api/v1/templates/[templateId]",
        method: "PATCH",
        request,
        httpStatus: 400,
        details: { reason: "no-updates", templateId },
      });
      return applySecurityHeaders(
        NextResponse.json(
          { error: "No template updates provided" },
          { status: 400 },
        ),
      );
    }

    let nextContentType: string | undefined;
    let nextSizeBytes: number | undefined;
    if (hasFile) {
      const file = fileRaw as File;
      const contentType =
        file.type ||
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      const buffer = Buffer.from(await file.arrayBuffer());
      await uploadBufferToStorage(existing.storagePath, buffer, contentType);
      nextContentType = contentType;
      nextSizeBytes = file.size;
    }

    const saved = await updateTemplateRecord(
      templateId,
      {
        name: nextName,
        contentType: nextContentType,
        sizeBytes: nextSizeBytes,
      },
      result.user.uid,
    );

    if (!saved) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Template not found" }, { status: 404 }),
      );
    }

    await logAuditTrailEntry({
      uid: result.user.uid,
      action: "templates.template-id.patch",
      status: "success",
      route: "/api/v1/templates/[templateId]",
      method: "PATCH",
      request,
      httpStatus: 200,
      details: {
        templateId,
        scope: saved.scope,
        updatedName: Boolean(nextName),
        replacedFile: hasFile,
      },
    });
    return applySecurityHeaders(NextResponse.json(saved));
  } catch (error) {
    logger.error("[api/templates/:id PATCH]", error);
    await logAuditTrailEntry({
      uid: result.user.uid,
      action: "templates.template-id.patch",
      status: "error",
      route: "/api/v1/templates/[templateId]",
      method: "PATCH",
      request,
      httpStatus: 500,
      errorMessage: "Failed to update template",
      details: { templateId },
    });
    return applySecurityHeaders(
      NextResponse.json(
        { error: "Failed to update template" },
        { status: 500 },
      ),
    );
  }
}
