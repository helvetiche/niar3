import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/security-headers";
import { deleteAccomplishmentTask } from "@/lib/firebase-admin/firestore";
import { logAuditTrailEntry } from "@/lib/firebase-admin/audit-trail";
import { logger } from "@/lib/logger";

/** DELETE /api/v1/accomplishment-tasks/[taskId] - Delete an accomplishment task */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const auth = await withAuth(request, {
    action: "accomplishment-tasks.delete",
  });
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { taskId } = await params;
  if (!taskId?.trim()) {
    await logAuditTrailEntry({
      uid: user.uid,
      action: "accomplishment-tasks.delete",
      status: "rejected",
      route: "/api/v1/accomplishment-tasks/[taskId]",
      method: "DELETE",
      request,
      httpStatus: 400,
      details: { reason: "missing-task-id", taskId },
    });
    return applySecurityHeaders(
      NextResponse.json({ error: "Task ID is required" }, { status: 400 }),
    );
  }

  try {
    await deleteAccomplishmentTask(user.uid, taskId.trim());
    await logAuditTrailEntry({
      uid: user.uid,
      action: "accomplishment-tasks.delete",
      status: "success",
      route: "/api/v1/accomplishment-tasks/[taskId]",
      method: "DELETE",
      request,
      httpStatus: 200,
      details: { taskId },
    });
    return applySecurityHeaders(NextResponse.json({ deleted: true }));
  } catch (err) {
    logger.error("[api/accomplishment-tasks DELETE]", err);
    await logAuditTrailEntry({
      uid: user.uid,
      action: "accomplishment-tasks.delete",
      status: "error",
      route: "/api/v1/accomplishment-tasks/[taskId]",
      method: "DELETE",
      request,
      httpStatus: 500,
      errorMessage: "Failed to delete accomplishment task",
    });
    return applySecurityHeaders(
      NextResponse.json(
        { error: "Failed to delete accomplishment task" },
        { status: 500 },
      ),
    );
  }
}
