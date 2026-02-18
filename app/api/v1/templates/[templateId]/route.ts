import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import {
  deleteTemplateRecord,
  getTemplateRecord,
} from "@/lib/firebase-admin/firestore";
import { deleteFromStorage } from "@/lib/firebase-admin/storage";
import { logAuditTrailEntry } from "@/lib/firebase-admin/audit-trail";

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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await context.params;
  const templateId = params.templateId;

  try {
    const template = await getTemplateRecord(result.user.uid, templateId);
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
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 },
      );
    }

    await deleteFromStorage(template.storagePath);
    await deleteTemplateRecord(result.user.uid, templateId);
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
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/templates/:id DELETE]", error);
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
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 },
    );
  }
}
