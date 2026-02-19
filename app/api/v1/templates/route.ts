import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/security-headers";
import {
  createTemplateRecord,
  listTemplates,
  type TemplateScope,
} from "@/lib/firebase-admin/firestore";
import { uploadBufferToStorage } from "@/lib/firebase-admin/storage";
import { logAuditTrailEntry } from "@/lib/firebase-admin/audit-trail";
import { validateUploads } from "@/lib/upload-limits";
import { logger } from "@/lib/logger";

const isScope = (value: unknown): value is TemplateScope =>
  value === "ifr-scanner" || value === "consolidate-ifr";

const sanitizeFilename = (name: string): string =>
  name.replace(/[^a-zA-Z0-9._-]/g, "_");
const templateUploadLimits = {
  maxFileCount: 1,
  maxFileSizeBytes: 100 * 1024 * 1024,
  maxTotalSizeBytes: 100 * 1024 * 1024,
  allowedExtensions: [".xlsx", ".xls"],
  allowedMimeSubstrings: ["sheet", "excel"],
} as const;

export async function GET(request: Request) {
  const auth = await withAuth(request, { action: "templates.get" });
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const url = new URL(request.url);
  const scopeRaw = url.searchParams.get("scope");
  if (scopeRaw && !isScope(scopeRaw)) {
    await logAuditTrailEntry({
      uid: user.uid,
      action: "templates.get",
      status: "rejected",
      route: "/api/v1/templates",
      method: "GET",
      request,
      httpStatus: 400,
      details: { reason: "invalid-scope", scope: scopeRaw },
    });
    return applySecurityHeaders(
      NextResponse.json({ error: "Invalid scope" }, { status: 400 }),
    );
  }
  const scope = isScope(scopeRaw) ? scopeRaw : undefined;

  try {
    const templates = await listTemplates(scope);
    await logAuditTrailEntry({
      uid: user.uid,
      action: "templates.get",
      status: "success",
      route: "/api/v1/templates",
      method: "GET",
      request,
      httpStatus: 200,
      details: { scope: scope ?? null, templateCount: templates.length },
    });
    return applySecurityHeaders(NextResponse.json({ templates }));
  } catch (error) {
    logger.error("[api/templates GET]", error);
    await logAuditTrailEntry({
      uid: user.uid,
      action: "templates.get",
      status: "error",
      route: "/api/v1/templates",
      method: "GET",
      request,
      httpStatus: 500,
      errorMessage: "Failed to list templates",
    });
    return applySecurityHeaders(
      NextResponse.json(
        { error: "Failed to list templates" },
        { status: 500 },
      ),
    );
  }
}

export async function POST(request: Request) {
  const auth = await withAuth(request, { action: "templates.post" });
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const scope = formData.get("scope");
    const customName = formData.get("name");

    if (!(file instanceof File)) {
      await logAuditTrailEntry({
        uid: user.uid,
        action: "templates.post",
        status: "rejected",
        route: "/api/v1/templates",
        method: "POST",
        request,
        httpStatus: 400,
        details: { reason: "missing-file" },
      });
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Template file is required" },
          { status: 400 },
        ),
      );
    }

    const uploadValidation = validateUploads([file], templateUploadLimits);
    if (!uploadValidation.ok) {
      await logAuditTrailEntry({
        uid: user.uid,
        action: "templates.post",
        status: "rejected",
        route: "/api/v1/templates",
        method: "POST",
        request,
        httpStatus: uploadValidation.status,
        details: { reason: uploadValidation.reason },
      });
      return applySecurityHeaders(
        NextResponse.json(
          { error: uploadValidation.message },
          { status: uploadValidation.status },
        ),
      );
    }
    if (!isScope(scope)) {
      await logAuditTrailEntry({
        uid: user.uid,
        action: "templates.post",
        status: "rejected",
        route: "/api/v1/templates",
        method: "POST",
        request,
        httpStatus: 400,
        details: { reason: "invalid-scope", scope },
      });
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Invalid template scope" },
          { status: 400 },
        ),
      );
    }

    const id = randomUUID();
    const filename = sanitizeFilename(file.name || "template.xlsx");
    const storagePath = `shared/templates/${scope}/${id}-${filename}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType =
      file.type ||
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    await uploadBufferToStorage(storagePath, buffer, contentType);
    const saved = await createTemplateRecord(
      {
        id,
        name:
          typeof customName === "string" && customName.trim()
            ? customName.trim()
            : file.name,
        scope,
        storagePath,
        contentType,
        sizeBytes: file.size,
      },
      user.uid,
    );

    await logAuditTrailEntry({
      uid: user.uid,
      action: "templates.post",
      status: "success",
      route: "/api/v1/templates",
      method: "POST",
      request,
      httpStatus: 201,
      details: {
        templateId: saved.id,
        scope: saved.scope,
        sizeBytes: saved.sizeBytes,
      },
    });

    return applySecurityHeaders(
      NextResponse.json(saved, { status: 201 }),
    );
  } catch (error) {
    logger.error("[api/templates POST]", error);
    await logAuditTrailEntry({
      uid: user.uid,
      action: "templates.post",
      status: "error",
      route: "/api/v1/templates",
      method: "POST",
      request,
      httpStatus: 500,
      errorMessage: "Failed to save template",
    });
    return applySecurityHeaders(
      NextResponse.json(
        { error: "Failed to save template" },
        { status: 500 },
      ),
    );
  }
}
