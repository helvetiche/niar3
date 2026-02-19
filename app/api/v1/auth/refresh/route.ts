import { NextResponse } from "next/server";
import { withApiAuth } from "@/guards/with-api-auth";
import { getAdminAuth } from "@/lib/firebase-admin/app";
import { HTTP_STATUS } from "@/constants/http-status";

export const GET = withApiAuth(async (req, user) => {
  try {
    const auth = getAdminAuth();
    const userRecord = await auth.getUser(user.uid);

    return NextResponse.json({
      uid: userRecord.uid,
      email: userRecord.email,
      customClaims: userRecord.customClaims ?? {},
    });
  } catch (error) {
    console.error("Error fetching user claims:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
    );
  }
});
