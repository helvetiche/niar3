import { NextResponse } from "next/server";
import { withApiAuth } from "@/guards/with-api-auth";
import { getAdminAuth } from "@/lib/firebase-admin/app";
import { getAccountsPaginated } from "@/lib/firebase-admin/accounts";
import { isSuperAdmin } from "@/lib/auth/check-super-admin";
import { HTTP_STATUS } from "@/constants/http-status";
import { BASE_ACCESS_PERMISSIONS } from "@/constants/permissions";
import type { CreateAccountRequest } from "@/types/account";
import { z } from "zod";
import { logger } from "@/lib/logger";

// Simple in-memory cache for page tokens (expires after 5 minutes)
const pageTokenCache = new Map<string, { token: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(userId: string, page: number, limit: number): string {
  return `${userId}:${page}:${limit}`;
}

function getPageToken(userId: string, page: number, limit: number): string | undefined {
  const key = getCacheKey(userId, page, limit);
  const cached = pageTokenCache.get(key);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.token;
  }
  
  pageTokenCache.delete(key);
  return undefined;
}

function setPageToken(userId: string, page: number, limit: number, token: string): void {
  const key = getCacheKey(userId, page, limit);
  pageTokenCache.set(key, { token, timestamp: Date.now() });
  
  // Clean up expired entries
  for (const [k, v] of pageTokenCache.entries()) {
    if (Date.now() - v.timestamp >= CACHE_TTL) {
      pageTokenCache.delete(k);
    }
  }
}

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

    // For page-based pagination, we need to fetch all pages up to the requested one
    // This is less efficient but matches the frontend expectation
    let pageToken: string | undefined;
    let currentPage = 1;
    let result = await getAccountsPaginated(limit, undefined);

    // Navigate to the requested page
    while (currentPage < page && result.nextPageToken) {
      pageToken = result.nextPageToken;
      result = await getAccountsPaginated(limit, pageToken);
      currentPage++;
    }

    // Calculate total pages by checking if there are more pages
    // Note: This is an approximation since we don't have total count
    const totalPages = result.hasMore ? page + 1 : page;

    return NextResponse.json({
      accounts: result.accounts,
      pagination: {
        page: currentPage,
        limit,
        total: result.accounts.length, // Approximate
        totalPages,
        hasMore: result.hasMore,
        nextPageToken: result.nextPageToken,
      },
    });
  } catch (error) {
    logger.error("Error listing accounts:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
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

    const toolPermissions = validated.permissions ?? [];
    const allPermissions = [
      ...new Set([...BASE_ACCESS_PERMISSIONS, ...toolPermissions]),
    ];

    await auth.setCustomUserClaims(userRecord.uid, {
      role: validated.role,
      permissions: allPermissions,
    });

    return NextResponse.json(
      {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        role: validated.role,
        permissions: allPermissions,
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

    logger.error("Error creating account:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
    );
  }
});
