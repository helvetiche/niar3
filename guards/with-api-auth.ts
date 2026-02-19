import "server-only";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-auth";
import type { AuthUser } from "@/types/auth";

type ApiHandler<T = unknown> = (
  request: Request,
  user: AuthUser,
  context?: T,
) => Promise<NextResponse>;

export function withApiAuth<T = unknown>(handler: ApiHandler<T>) {
  return async (request: Request, context?: T) => {
    const auth = await withAuth(request);
    if (auth instanceof NextResponse) return auth;
    return handler(request, auth.user, context);
  };
}
