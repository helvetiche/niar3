import "server-only";
import { cookies } from "next/headers";
import { getAdminAuth } from "@/lib/firebase-admin/app";
import type { AuthUser } from "@/types/auth";

const SESSION_COOKIE = "__session";

export async function getSession(): Promise<
  | { user: AuthUser }
  | { user: null; error: "no-token" | "invalid-token" | "expired" }
> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return { user: null, error: "no-token" };
  }

  try {
    const auth = getAdminAuth();
    const decoded = await auth.verifySessionCookie(token, true);

    const userRecord = await auth.getUser(decoded.uid);

    console.log("[DEBUG] Session decoded:", {
      uid: decoded.uid,
      email: decoded.email,
      customClaims: userRecord.customClaims,
    });

    const user: AuthUser = {
      uid: decoded.uid,
      email: decoded.email ?? null,
      emailVerified: decoded.email_verified ?? false,
      customClaims: userRecord.customClaims,
    };

    return { user };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (
      message.includes("expired") ||
      message.includes("auth/session-cookie-expired") ||
      message.includes("auth/id-token-expired")
    ) {
      return { user: null, error: "expired" };
    }
    return { user: null, error: "invalid-token" };
  }
}
