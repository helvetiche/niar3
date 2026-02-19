import { NextResponse } from "next/server";
import { withApiAuth } from "@/guards/with-api-auth";
import { getAdminAuth } from "@/lib/firebase-admin/app";
import { isSuperAdmin } from "@/lib/auth/check-super-admin";
import { HTTP_STATUS } from "@/constants/http-status";
import type { CreateAccountRequest } from "@/types/account";
import { z } from "zod";

const createAccountSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1),
  role: z.enum(["super-admin", "admin", "user"]),
  permissions: z.array(z.string()).optional(),
});

export const GET = withApiAuth(async (req, user) => {
  if (!isSuperAdmin(user)) {
    return NextResponse.json(
      { error: "Only super-admins can view accounts" },
      { status: HTTP_STATUS.FORBIDDEN },
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "8", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);

    const auth = getAdminAuth();
    const listResult = await auth.listUsers(1000);

    const allAccounts = listResult.users.map((u) => ({
      uid: u.uid,
      email: u.email ?? "",
      displayName: u.displayName ?? "",
      role: u.customClaims?.role ?? "user",
      createdAt: u.metadata.creationTime,
      disabled: u.disabled,
      permissions: u.customClaims?.permissions ?? [],
    }));

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const accounts = allAccounts.slice(startIndex, endIndex);
    const totalPages = Math.ceil(allAccounts.length / limit);

    return NextResponse.json({
      accounts,
      pagination: {
        page,
        limit,
        total: allAccounts.length,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error listing accounts:", error);
    return NextResponse.json(
      { error: "Server is broken" },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
    );
  }
});

export const POST = withApiAuth(async (req, user) => {
  if (!isSuperAdmin(user)) {
    return NextResponse.json(
      { error: "Only super-admins can create accounts" },
      { status: HTTP_STATUS.FORBIDDEN },
    );
  }

  try {
    const body = (await req.json()) as CreateAccountRequest;
    const validated = createAccountSchema.parse(body);

    const auth = getAdminAuth();

    const userRecord = await auth.createUser({
      email: validated.email,
      password: validated.password,
      displayName: validated.displayName,
      emailVerified: false,
    });

    await auth.setCustomUserClaims(userRecord.uid, {
      role: validated.role,
      permissions: validated.permissions || [],
    });

    return NextResponse.json(
      {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        role: validated.role,
        permissions: validated.permissions || [],
      },
      { status: HTTP_STATUS.CREATED },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data" },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    console.error("Error creating account:", error);
    return NextResponse.json(
      { error: "Server is broken" },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
    );
  }
});
