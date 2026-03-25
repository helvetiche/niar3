import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  WorkspaceProvider,
  useWorkspaceTab,
  useWorkspaceUser,
} from "@/contexts/WorkspaceContext";
import type { AuthUser } from "@/types/auth";

const mockUser: AuthUser = {
  uid: "test-uid",
  email: "test@example.com",
  emailVerified: true,
  customClaims: { role: "user" },
};

describe("WorkspaceContext", () => {
  it("should provide user and tab state", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <WorkspaceProvider user={mockUser}>{children}</WorkspaceProvider>
    );

    const { result } = renderHook(() => useWorkspaceTab(), { wrapper });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.selectedTab).toBe("hub");
  });

  it("should update selected tab", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <WorkspaceProvider user={mockUser}>{children}</WorkspaceProvider>
    );

    const { result } = renderHook(() => useWorkspaceTab(), { wrapper });

    act(() => {
      result.current.setSelectedTab("accounts");
    });

    expect(result.current.selectedTab).toBe("accounts");
  });

  it("should not update if same tab selected", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <WorkspaceProvider user={mockUser}>{children}</WorkspaceProvider>
    );

    const { result } = renderHook(() => useWorkspaceTab(), { wrapper });

    const initialTab = result.current.selectedTab;

    act(() => {
      result.current.setSelectedTab("hub");
    });

    expect(result.current.selectedTab).toBe(initialTab);
  });

  it("should provide user through useWorkspaceUser", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <WorkspaceProvider user={mockUser}>{children}</WorkspaceProvider>
    );

    const { result } = renderHook(() => useWorkspaceUser(), { wrapper });

    expect(result.current).toEqual(mockUser);
  });

  it("should throw error when used outside provider", () => {
    expect(() => {
      renderHook(() => useWorkspaceTab());
    }).toThrow("useWorkspaceTab must be used within WorkspaceProvider");
  });
});
