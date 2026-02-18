import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import {
  deleteTemplateRecord,
  getTemplateRecord,
} from "@/lib/firebase-admin/firestore";
import { deleteFromStorage } from "@/lib/firebase-admin/storage";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ templateId: string }> },
) {
  const result = await getSession();
  if (!result.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await context.params;
  const templateId = params.templateId;

  try {
    const template = await getTemplateRecord(result.user.uid, templateId);
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    await deleteFromStorage(template.storagePath);
    await deleteTemplateRecord(result.user.uid, templateId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/templates/:id DELETE]", error);
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
  }
}
