import { NextResponse } from "next/server";
import { withApiAuth } from "@/guards/with-api-auth";

export const GET = withApiAuth(async (req, user) => {
  return NextResponse.json({
    uid: user.uid,
    email: user.email,
    emailVerified: user.emailVerified,
    customClaims: user.customClaims,
    role: user.customClaims?.role ?? "user",
  });
});
