import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import {
  createTemplateRecord,
  listTemplates,
  type TemplateScope,
} from "@/lib/firebase-admin/firestore";
import { uploadBufferToStorage } from "@/lib/firebase-admin/storage";

const isScope = (value: unknown): value is TemplateScope =>
  value === "ifr-scanner" || value === "consolidate-ifr";

const sanitizeFilename = (name: string): string =>
  name.replace(/[^a-zA-Z0-9._-]/g, "_");

export async function GET(request: Request) {
  const result = await getSession();
  if (!result.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const scopeRaw = url.searchParams.get("scope");
  if (scopeRaw && !isScope(scopeRaw)) {
    return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
  }
  const scope = isScope(scopeRaw) ? scopeRaw : undefined;

  try {
    const templates = await listTemplates(result.user.uid, scope);
    return NextResponse.json({ templates });
  } catch (error) {
    console.error("[api/templates GET]", error);
    return NextResponse.json({ error: "Failed to list templates" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const result = await getSession();
  if (!result.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const scope = formData.get("scope");
    const customName = formData.get("name");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Template file is required" }, { status: 400 });
    }
    if (!isScope(scope)) {
      return NextResponse.json({ error: "Invalid template scope" }, { status: 400 });
    }

    const id = randomUUID();
    const filename = sanitizeFilename(file.name || "template.xlsx");
    const storagePath = `users/${result.user.uid}/templates/${scope}/${id}-${filename}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType =
      file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    await uploadBufferToStorage(storagePath, buffer, contentType);
    const saved = await createTemplateRecord(result.user.uid, {
      id,
      name:
        typeof customName === "string" && customName.trim()
          ? customName.trim()
          : file.name,
      scope,
      storagePath,
      contentType,
      sizeBytes: file.size,
    });

    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    console.error("[api/templates POST]", error);
    return NextResponse.json({ error: "Failed to save template" }, { status: 500 });
  }
}
