import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin/app";
import { HTTP_STATUS } from "@/constants/http-status";
import { z } from "zod";

const requestSchema = z.object({
  uid: string(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { uid } = requestSchema.parse(body);

    const auth = getAdminAuth();
    const userRecord = await auth.getUser(uid);

    const customToken = await auth.createCustomToken(uid, userRecord.customClaims);

    return NextResponse.json({ customToken });
  } catch (error) {
    console.error("Error creating custom token:", error);
    return NextResponse.json(
      { error: "Server is broken" },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
    );
  }
}
