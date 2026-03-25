import { describe, it, expect, vi } from "vitest";
import { requireAuth } from "@/lib/auth/require-auth";
import { getSession } from "@/lib/auth/get-session";
import { redirect } from "next/navigation";

vi.mock("@/lib/auth/get-session");
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

describe("requireAuth", () => {
  it("should return user when authenticated", async () => {
    const mockUser = {
      uid: "test-uid",
      email: "test@example.com",
      emailVerified: true,
    };

    vi.mocked(getSession).mockResolvedValue({ user: mockUser });

    const user = await requireAuth();

    expect(user).toEqual(mockUser);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("should redirect when not authenticated", async () => {
    vi.mocked(getSession).mockResolvedValue({ user: null });

    await requireAuth();

    expect(redirect).toHaveBeenCalledWith("/?login=1");
  });
});
