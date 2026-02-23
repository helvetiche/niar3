import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/security-headers";
import {
  listAccomplishmentTasks,
  createAccomplishmentTask,
} from "@/lib/firebase-admin/firestore";
import { logAuditTrailEntry } from "@/lib/firebase-admin/audit-trail";
import { logger } from "@/lib/logger";

const MAX_LABEL_LENGTH = 200;

/** GET /api/v1/accomplishment-tasks - List all accomplishment tasks for current user */
export async function GET(request: Request) {
  const auth = await withAuth(request, {
    action: "accomplishment-tasks.get",
  });
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  try {
    const tasks = await listAccomplishmentTasks(user.uid);
    await logAuditTrailEntry({
      uid: user.uid,
      action: "accomplishment-tasks.get",
      status: "success",
      route: "/api/v1/accomplishment-tasks",
      method: "GET",
      request,
      httpStatus: 200,
      details: { count: tasks.length },
    });
    return applySecurityHeaders(NextResponse.json(tasks));
  } catch (err) {
    logger.error("[api/accomplishment-tasks GET]", err);
    await logAuditTrailEntry({
      uid: user.uid,
      action: "accomplishment-tasks.get",
      status: "error",
      route: "/api/v1/accomplishment-tasks",
      method: "GET",
      request,
      httpStatus: 500,
      errorMessage: "Failed to load accomplishment tasks",
    });
    return applySecurityHeaders(
      NextResponse.json(
        { error: "Failed to load accomplishment tasks" },
        { status: 500 },
      ),
    );
  }
}

/** POST /api/v1/accomplishment-tasks - Create a new accomplishment task */
export async function POST(request: Request) {
  const auth = await withAuth(request, {
    action: "accomplishment-tasks.post",
  });
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  let body: { label?: string; designation?: string };
  try {
    body = await request.json();
  } catch {
    await logAuditTrailEntry({
      uid: user.uid,
      action: "accomplishment-tasks.post",
      status: "rejected",
      route: "/api/v1/accomplishment-tasks",
      method: "POST",
      request,
      httpStatus: 400,
      details: { reason: "invalid-json-body" },
    });
    return applySecurityHeaders(
      NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
    );
  }

  const label =
    typeof body.label === "string"
      ? body.label.trim().slice(0, MAX_LABEL_LENGTH)
      : "";
  if (!label) {
    await logAuditTrailEntry({
      uid: user.uid,
      action: "accomplishment-tasks.post",
      status: "rejected",
      route: "/api/v1/accomplishment-tasks",
      method: "POST",
      request,
      httpStatus: 400,
      details: { reason: "missing-label" },
    });
    return applySecurityHeaders(
      NextResponse.json({ error: "Task label is required" }, { status: 400 }),
    );
  }

  const designation =
    body.designation === "SWRFT" || body.designation === "WRFOB"
      ? body.designation
      : "SWRFT";

  try {
    const task = await createAccomplishmentTask(user.uid, label, designation);
    await logAuditTrailEntry({
      uid: user.uid,
      action: "accomplishment-tasks.post",
      status: "success",
      route: "/api/v1/accomplishment-tasks",
      method: "POST",
      request,
      httpStatus: 200,
      details: { taskId: task.id },
    });
    return applySecurityHeaders(NextResponse.json(task));
  } catch (err) {
    logger.error("[api/accomplishment-tasks POST]", err);
    await logAuditTrailEntry({
      uid: user.uid,
      action: "accomplishment-tasks.post",
      status: "error",
      route: "/api/v1/accomplishment-tasks",
      method: "POST",
      request,
      httpStatus: 500,
      errorMessage: "Failed to create accomplishment task",
    });
    return applySecurityHeaders(
      NextResponse.json(
        { error: "Failed to create accomplishment task" },
        { status: 500 },
      ),
    );
  }
}
