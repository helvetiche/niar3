import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { getProfile, setProfile } from "@/lib/firebase-admin/firestore";
import { logAuditTrailEntry } from "@/lib/firebase-admin/audit-trail";

/** GET /api/v1/profile - Get current user's profile */
export async function GET(request: Request) {
  const result = await getSession();
  if (!result.user) {
    await logAuditTrailEntry({
      action: "profile.get",
      status: "rejected",
      route: "/api/v1/profile",
      method: "GET",
      request,
      httpStatus: 401,
      details: { reason: "unauthorized" },
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const profile = await getProfile(result.user.uid);
    await logAuditTrailEntry({
      uid: result.user.uid,
      action: "profile.get",
      status: "success",
      route: "/api/v1/profile",
      method: "GET",
      request,
      httpStatus: 200,
    });
    return NextResponse.json(profile);
  } catch (err) {
    console.error("[api/profile GET]", err);
    await logAuditTrailEntry({
      uid: result.user.uid,
      action: "profile.get",
      status: "error",
      route: "/api/v1/profile",
      method: "GET",
      request,
      httpStatus: 500,
      errorMessage: "Failed to load profile",
    });
    return NextResponse.json(
      { error: "Failed to load profile" },
      { status: 500 },
    );
  }
}

/** PUT /api/v1/profile - Save current user's profile */
export async function PUT(request: Request) {
  const result = await getSession();
  if (!result.user) {
    await logAuditTrailEntry({
      action: "profile.put",
      status: "rejected",
      route: "/api/v1/profile",
      method: "PUT",
      request,
      httpStatus: 401,
      details: { reason: "unauthorized" },
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
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
      uid: result.user.uid,
      action: "profile.put",
      status: "rejected",
      route: "/api/v1/profile",
      method: "PUT",
      request,
      httpStatus: 400,
      details: { reason: "invalid-json-body" },
    });
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const profile = {
    first: typeof body.first === "string" ? body.first : "",
    middle: typeof body.middle === "string" ? body.middle : "",
    last: typeof body.last === "string" ? body.last : "",
    birthday: typeof body.birthday === "string" ? body.birthday : "",
  };
  try {
    await setProfile(result.user.uid, profile);
    await logAuditTrailEntry({
      uid: result.user.uid,
      action: "profile.put",
      status: "success",
      route: "/api/v1/profile",
      method: "PUT",
      request,
      httpStatus: 200,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/profile PUT]", err);
    await logAuditTrailEntry({
      uid: result.user.uid,
      action: "profile.put",
      status: "error",
      route: "/api/v1/profile",
      method: "PUT",
      request,
      httpStatus: 500,
      errorMessage: "Failed to save profile",
    });
    return NextResponse.json(
      { error: "Failed to save profile" },
      { status: 500 },
    );
  }
}
