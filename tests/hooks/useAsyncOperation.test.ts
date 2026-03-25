import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAsyncOperation } from "@/hooks/useAsyncOperation";
import toast from "react-hot-toast";

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("useAsyncOperation", () => {
  it("should handle successful operation", async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() =>
      useAsyncOperation({ onSuccess, showSuccessToast: true })
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);

    await act(async () => {
      await result.current.execute(async () => {
        await Promise.resolve();
      });
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(onSuccess).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith("Operation completed");
  });

  it("should handle failed operation", async () => {
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useAsyncOperation({ onError, showErrorToast: true })
    );

    await act(async () => {
      await result.current.execute(async () => {
        throw new Error("Test error");
      });
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Test error");
    expect(onError).toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Operation failed");
  });

  it("should set loading state during execution", async () => {
    const { result } = renderHook(() => useAsyncOperation());

    expect(result.current.isLoading).toBe(false);

    // Start execution without awaiting
    const executePromise = result.current.execute(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // Check that loading is true immediately after starting
    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    // Wait for execution to complete
    await act(async () => {
      await executePromise;
    });

    // Loading should be false after completion
    expect(result.current.isLoading).toBe(false);
  });
});
