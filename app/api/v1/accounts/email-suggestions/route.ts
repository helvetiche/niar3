import { NextResponse } from "next/server";
import { withApiAuth } from "@/guards/with-api-auth";
import { isSuperAdmin } from "@/lib/auth/check-super-admin";
import { listAccountEmailSuggestions } from "@/lib/firebase-admin/accounts";
import { HTTP_STATUS } from "@/constants/http-status";
import { logger } from "@/lib/logger";

export const GET = withApiAuth(async (_req, user) => {
  if (!isSuperAdmin(user)) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const suggestions = await listAccountEmailSuggestions();
    return NextResponse.json({ suggestions });
  } catch (error) {
    logger.error("Error listing account email suggestions:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
});
