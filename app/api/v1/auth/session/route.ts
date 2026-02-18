import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminAuth } from "@/lib/firebase-admin/app";
import {
  authRateLimit,
  getClientIdentifier,
  isRateLimitEnabled,
} from "@/lib/rate-limit";
import { logAuditTrailEntry } from "@/lib/firebase-admin/audit-trail";

const SESSION_COOKIE = "__session";
const MAX_AGE = 60 * 60 * 24 * 5; // 5 days
const EXPIRES_IN_MS = MAX_AGE * 1000;

/**
 * POST /api/v1/auth/session
 * Verifies Firebase ID token and sets __session cookie for server-side auth.
 * The cookie stores a Firebase session cookie (not raw ID token) to avoid 1-hour expiry.
 * Body: { token: string }
 */
export async function POST(request: Request) {
  if (isRateLimitEnabled() && authRateLimit) {
    const identifier = getClientIdentifier(request);
    const { success } = await authRateLimit.limit(identifier);
    if (!success) {
      await logAuditTrailEntry({
        action: "auth.session.post",
        status: "rejected",
        route: "/api/v1/auth/session",
        method: "POST",
        request,
        httpStatus: 429,
        details: { reason: "rate-limited" },
      });
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429 },
      );
    }
  }

  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    await logAuditTrailEntry({
      action: "auth.session.post",
      status: "rejected",
      route: "/api/v1/auth/session",
      method: "POST",
      request,
      httpStatus: 400,
      details: { reason: "invalid-json-body" },
    });
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token.trim() : null;
  if (!token) {
    await logAuditTrailEntry({
      action: "auth.session.post",
      status: "rejected",
      route: "/api/v1/auth/session",
      method: "POST",
      request,
      httpStatus: 400,
      details: { reason: "missing-token" },
    });
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  try {
    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(token);
    const sessionCookie = await auth.createSessionCookie(token, {
      expiresIn: EXPIRES_IN_MS,
    });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: MAX_AGE,
      path: "/",
    });

    await logAuditTrailEntry({
      uid: decoded.uid,
      action: "auth.session.post",
      status: "success",
      route: "/api/v1/auth/session",
      method: "POST",
      request,
      httpStatus: 200,
    });

    return NextResponse.json({ ok: true, uid: decoded.uid });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (
      message.includes("expired") ||
      message.includes("auth/id-token-expired") ||
      message.includes("invalid")
    ) {
      await logAuditTrailEntry({
        action: "auth.session.post",
        status: "rejected",
        route: "/api/v1/auth/session",
        method: "POST",
        request,
        httpStatus: 401,
        errorMessage: message,
        details: { reason: "invalid-or-expired-token" },
      });
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 },
      );
    }
    console.error("[auth/session]", err);
    await logAuditTrailEntry({
      action: "auth.session.post",
      status: "error",
      route: "/api/v1/auth/session",
      method: "POST",
      request,
      httpStatus: 500,
      errorMessage: message,
    });
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/v1/auth/session
 * Clears the __session cookie to log out the user.
 */
export async function DELETE(request: Request) {
  try {
    const auth = getAdminAuth();
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
    let revokedUid: string | null = null;

    if (sessionToken) {
      try {
        const decoded = await auth.verifySessionCookie(sessionToken, true);
        revokedUid = decoded.uid;
        await auth.revokeRefreshTokens(decoded.uid);
      } catch {
        // Ignore invalid/expired cookies during logout cleanup.
      }
    }

    cookieStore.delete(SESSION_COOKIE);
    await logAuditTrailEntry({
      uid: revokedUid,
      action: "auth.session.delete",
      status: "success",
      route: "/api/v1/auth/session",
      method: "DELETE",
      request,
      httpStatus: 200,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[auth/session DELETE]", err);
    await logAuditTrailEntry({
      action: "auth.session.delete",
      status: "error",
      route: "/api/v1/auth/session",
      method: "DELETE",
      request,
      httpStatus: 500,
      errorMessage: message,
    });
    return NextResponse.json({ error: "Failed to logout" }, { status: 500 });
  }
}
