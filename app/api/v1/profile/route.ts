import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/security-headers";
import { getProfile, setProfile } from "@/lib/firebase-admin/firestore";
import { logAuditTrailEntry } from "@/lib/firebase-admin/audit-trail";
import { logger } from "@/lib/logger";

/** GET /api/v1/profile - Get current user's profile */
export async function GET(request: Request) {
  const auth = await withAuth(request, { action: "profile.get" });
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  try {
    const profile = await getProfile(user.uid);
    await logAuditTrailEntry({
      uid: user.uid,
      action: "profile.get",
      status: "success",
      route: "/api/v1/profile",
      method: "GET",
      request,
      httpStatus: 200,
    });
    return applySecurityHeaders(NextResponse.json(profile));
  } catch (err) {
    logger.error("[api/profile GET]", err);
    await logAuditTrailEntry({
      uid: user.uid,
      action: "profile.get",
      status: "error",
      route: "/api/v1/profile",
      method: "GET",
      request,
      httpStatus: 500,
      errorMessage: "Failed to load profile",
    });
    return applySecurityHeaders(
      NextResponse.json(
        { error: "Failed to load profile" },
        { status: 500 },
      ),
    );
  }
}

/** PUT /api/v1/profile - Save current user's profile */
export async function PUT(request: Request) {
  const auth = await withAuth(request, { action: "profile.put" });
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  let body: {
    first?: string;
    middle?: string;
    last?: string;
    birthday?: string;
  };
  try {
    body = await request.json();
  } catch {
    await logAuditTrailEntry({
      uid: user.uid,
      action: "profile.put",
      status: "rejected",
      route: "/api/v1/profile",
      method: "PUT",
      request,
      httpStatus: 400,
      details: { reason: "invalid-json-body" },
    });
    return applySecurityHeaders(
      NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
    );
  }
  const MAX_NAME_LENGTH = 100;
  const MAX_BIRTHDAY_LENGTH = 10;
  const BIRTHDAY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

  const trimField = (val: unknown, max: number): string =>
    typeof val === "string" ? val.trim().slice(0, max) : "";
  const first = trimField(body.first, MAX_NAME_LENGTH);
  const middle = trimField(body.middle, MAX_NAME_LENGTH);
  const last = trimField(body.last, MAX_NAME_LENGTH);
  const rawBirthday = trimField(body.birthday, MAX_BIRTHDAY_LENGTH);
  const birthday =
    rawBirthday && BIRTHDAY_REGEX.test(rawBirthday) ? rawBirthday : "";

  const profile = { first, middle, last, birthday };
  try {
    await setProfile(user.uid, profile);
    await logAuditTrailEntry({
      uid: user.uid,
      action: "profile.put",
      status: "success",
      route: "/api/v1/profile",
      method: "PUT",
      request,
      httpStatus: 200,
    });
    return applySecurityHeaders(NextResponse.json({ ok: true }));
  } catch (err) {
    logger.error("[api/profile PUT]", err);
    await logAuditTrailEntry({
      uid: user.uid,
      action: "profile.put",
      status: "error",
      route: "/api/v1/profile",
      method: "PUT",
      request,
      httpStatus: 500,
      errorMessage: "Failed to save profile",
    });
    return applySecurityHeaders(
      NextResponse.json(
        { error: "Failed to save profile" },
        { status: 500 },
      ),
    );
  }
}
