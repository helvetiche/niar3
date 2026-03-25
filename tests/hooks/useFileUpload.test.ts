import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useFileUpload } from "@/hooks/useFileUpload";

describe("useFileUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with default state", () => {
    const { result } = renderHook(() => useFileUpload());

    expect(result.current.isUploading).toBe(false);
    expect(result.current.progress).toEqual({
      loaded: 0,
      total: 0,
      percent: 0,
    });
  });

  it("should track upload progress", async () => {
    const onProgress = vi.fn();
    const { result } = renderHook(() => useFileUpload({ onProgress }));

    const mockXHR = {
      upload: {
        addEventListener: vi.fn(),
      },
      addEventListener: vi.fn(),
      open: vi.fn(),
      send: vi.fn(),
      status: 200,
      response: JSON.stringify({ success: true }),
      getResponseHeader: vi.fn(() => "application/json"),
    };

    global.XMLHttpRequest = vi.fn(() => mockXHR) as any;

    const formData = new FormData();
    const uploadPromise = result.current.uploadWithProgress(
      "/api/upload",
      formData
    );

    // Simulate progress event
    const progressHandler = mockXHR.upload.addEventListener.mock.calls.find(
      (call) => call[0] === "progress"
    )?.[1];

    if (progressHandler) {
      progressHandler({
        lengthComputable: true,
        loaded: 50,
        total: 100,
      });
    }

    await waitFor(() => {
      expect(onProgress).toHaveBeenCalledWith({
        loaded: 50,
        total: 100,
        percent: 50,
      });
    });

    // Simulate load event
    const loadHandler = mockXHR.addEventListener.mock.calls.find(
      (call) => call[0] === "load"
    )?.[1];

    if (loadHandler) {
      loadHandler();
    }

    await uploadPromise;
  });

  it("should reset state", () => {
    const { result } = renderHook(() => useFileUpload());

    act(() => {
      result.current.reset();
    });

    expect(result.current.isUploading).toBe(false);
    expect(result.current.progress).toEqual({
      loaded: 0,
      total: 0,
      percent: 0,
    });
  });
});
