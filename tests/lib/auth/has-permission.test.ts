import { describe, it, expect } from "vitest";
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
} from "@/lib/auth/has-permission";
import { PERMISSIONS } from "@/constants/permissions";
import type { AuthUser } from "@/types/auth";

describe("hasPermission", () => {
  it("should return true for super-admin with any permission", () => {
    const user: AuthUser = {
      uid: "test-uid",
      email: "admin@test.com",
      emailVerified: true,
      customClaims: {
        role: "super-admin",
        permissions: [],
      },
    };

    expect(hasPermission(user, PERMISSIONS.WORKSPACE_READ)).toBe(true);
    expect(hasPermission(user, PERMISSIONS.USERS_WRITE)).toBe(true);
  });

  it("should return true when user has the required permission", () => {
    const user: AuthUser = {
      uid: "test-uid",
      email: "user@test.com",
      emailVerified: true,
      customClaims: {
        role: "user",
        permissions: [PERMISSIONS.WORKSPACE_READ, PERMISSIONS.DASHBOARD_READ],
      },
    };

    expect(hasPermission(user, PERMISSIONS.WORKSPACE_READ)).toBe(true);
  });

  it("should return false when user lacks the required permission", () => {
    const user: AuthUser = {
      uid: "test-uid",
      email: "user@test.com",
      emailVerified: true,
      customClaims: {
        role: "user",
        permissions: [PERMISSIONS.WORKSPACE_READ],
      },
    };

    expect(hasPermission(user, PERMISSIONS.USERS_WRITE)).toBe(false);
  });

  it("should grant base access permissions to users with any tool permission", () => {
    const user: AuthUser = {
      uid: "test-uid",
      email: "user@test.com",
      emailVerified: true,
      customClaims: {
        role: "user",
        permissions: [PERMISSIONS.WORKSPACE_WRITE],
      },
    };

    expect(hasPermission(user, PERMISSIONS.WORKSPACE_READ)).toBe(true);
    expect(hasPermission(user, PERMISSIONS.DASHBOARD_READ)).toBe(true);
  });

  it("should return false when user has no permissions", () => {
    const user: AuthUser = {
      uid: "test-uid",
      email: "user@test.com",
      emailVerified: true,
      customClaims: {
        role: "user",
        permissions: [],
      },
    };

    expect(hasPermission(user, PERMISSIONS.WORKSPACE_READ)).toBe(false);
  });

  it("should return false when customClaims is undefined", () => {
    const user: AuthUser = {
      uid: "test-uid",
      email: "user@test.com",
      emailVerified: true,
    };

    expect(hasPermission(user, PERMISSIONS.WORKSPACE_READ)).toBe(false);
  });
});

describe("hasAnyPermission", () => {
  it("should return true when user has at least one permission", () => {
    const user: AuthUser = {
      uid: "test-uid",
      email: "user@test.com",
      emailVerified: true,
      customClaims: {
        role: "user",
        permissions: [PERMISSIONS.WORKSPACE_READ],
      },
    };

    expect(
      hasAnyPermission(user, [
        PERMISSIONS.WORKSPACE_READ,
        PERMISSIONS.USERS_WRITE,
      ]),
    ).toBe(true);
  });

  it("should return false when user has none of the permissions", () => {
    const user: AuthUser = {
      uid: "test-uid",
      email: "user@test.com",
      emailVerified: true,
      customClaims: {
        role: "user",
        permissions: [PERMISSIONS.WORKSPACE_READ],
      },
    };

    expect(
      hasAnyPermission(user, [
        PERMISSIONS.USERS_WRITE,
        PERMISSIONS.USERS_DELETE,
      ]),
    ).toBe(false);
  });

  it("should return true when permission array is empty", () => {
    const user: AuthUser = {
      uid: "test-uid",
      email: "user@test.com",
      emailVerified: true,
      customClaims: {
        role: "user",
        permissions: [],
      },
    };

    expect(hasAnyPermission(user, [])).toBe(true);
  });
});

describe("hasAllPermissions", () => {
  it("should return true when user has all required permissions", () => {
    const user: AuthUser = {
      uid: "test-uid",
      email: "user@test.com",
      emailVerified: true,
      customClaims: {
        role: "user",
        permissions: [
          PERMISSIONS.WORKSPACE_READ,
          PERMISSIONS.WORKSPACE_WRITE,
          PERMISSIONS.DASHBOARD_READ,
        ],
      },
    };

    expect(
      hasAllPermissions(user, [
        PERMISSIONS.WORKSPACE_READ,
        PERMISSIONS.WORKSPACE_WRITE,
      ]),
    ).toBe(true);
  });

  it("should return false when user is missing one permission", () => {
    const user: AuthUser = {
      uid: "test-uid",
      email: "user@test.com",
      emailVerified: true,
      customClaims: {
        role: "user",
        permissions: [PERMISSIONS.WORKSPACE_READ],
      },
    };

    expect(
      hasAllPermissions(user, [
        PERMISSIONS.WORKSPACE_READ,
        PERMISSIONS.WORKSPACE_WRITE,
      ]),
    ).toBe(false);
  });

  it("should return true when permission array is empty", () => {
    const user: AuthUser = {
      uid: "test-uid",
      email: "user@test.com",
      emailVerified: true,
      customClaims: {
        role: "user",
        permissions: [],
      },
    };

    expect(hasAllPermissions(user, [])).toBe(true);
  });
});
