import { NextResponse } from "next/server";
import { withApiAuth } from "@/guards/with-api-auth";
import { getAdminAuth } from "@/lib/firebase-admin/app";
import { isSuperAdmin } from "@/lib/auth/check-super-admin";
import { HTTP_STATUS } from "@/constants/http-status";
import type { UpdateAccountRequest } from "@/types/account";
import { z } from "zod";

const updateAccountSchema = z.object({
  displayName: z.string().min(1).optional(),
  role: z.enum(["super-admin", "admin", "user"]).optional(),
  disabled: z.boolean().optional(),
  permissions: z.array(z.string()).optional(),
});

export const PATCH = withApiAuth(async (req, user, context) => {
  if (!isSuperAdmin(user)) {
    return NextResponse.json(
      { error: "Only super-admins can update accounts" },
      { status: HTTP_STATUS.FORBIDDEN },
    );
  }

  try {
    const { uid } = await (context as { params: Promise<{ uid: string }> })
      .params;
    const body = (await req.json()) as UpdateAccountRequest;
    const validated = updateAccountSchema.parse(body);

    const auth = getAdminAuth();

    const updates: {
      displayName?: string;
      disabled?: boolean;
    } = {};

    if (validated.displayName !== undefined) {
      updates.displayName = validated.displayName;
    }
    if (validated.disabled !== undefined) {
      updates.disabled = validated.disabled;
    }

    if (Object.keys(updates).length > 0) {
      await auth.updateUser(uid, updates);
    }

    if (validated.role !== undefined || validated.permissions !== undefined) {
      const currentUser = await auth.getUser(uid);
      const currentClaims = currentUser.customClaims || {};

      await auth.setCustomUserClaims(uid, {
        ...currentClaims,
        ...(validated.role !== undefined && { role: validated.role }),
        ...(validated.permissions !== undefined && {
          permissions: validated.permissions,
        }),
      });
    }

    const updatedUser = await auth.getUser(uid);

    return NextResponse.json({
      uid: updatedUser.uid,
      email: updatedUser.email,
      displayName: updatedUser.displayName,
      role: updatedUser.customClaims?.role ?? "user",
      disabled: updatedUser.disabled,
      permissions: updatedUser.customClaims?.permissions ?? [],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data" },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    console.error("Error updating account:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
    );
  }
});

export const DELETE = withApiAuth(async (req, user, context) => {
  if (!isSuperAdmin(user)) {
    return NextResponse.json(
      { error: "Only super-admins can delete accounts" },
      { status: HTTP_STATUS.FORBIDDEN },
    );
  }

  try {
    const { uid } = await (context as { params: Promise<{ uid: string }> })
      .params;
    const auth = getAdminAuth();

    await auth.deleteUser(uid);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting account:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
    );
  }
});
