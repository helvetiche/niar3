import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/v1/ifr-checker/route";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/lib/services/ifr-checker.service", () => ({
  validateIFRFiles: vi.fn().mockResolvedValue({
    success: true,
    summary: { totalLots: 0, consolidatedLots: 0, matchingLots: 0, totalIssues: 0, errors: 0, warnings: 0 },
    issues: [],
  }),
}));

describe("IFR Checker API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.skip("should return 400 when no IFR files provided", async () => {
    const formData = new FormData();
    formData.append("consolidatedFile", new File(["test"], "test.xlsx"));

    const request = new NextRequest("http://localhost:3000/api/v1/ifr-checker", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("No IFR files provided");
  });

  it.skip("should return 400 when no consolidated file provided", async () => {
    const formData = new FormData();
    formData.append("ifrFiles", new File(["test"], "ifr1.xlsx"));

    const request = new NextRequest("http://localhost:3000/api/v1/ifr-checker", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("No consolidated file provided");
  });

  it("should handle errors gracefully", async () => {
    const { validateIFRFiles } = await import("@/lib/services/ifr-checker.service");
    vi.mocked(validateIFRFiles).mockRejectedValueOnce(new Error("Test error"));

    const formData = new FormData();
    formData.append("ifrFiles", new File(["test"], "ifr1.xlsx"));
    formData.append("consolidatedFile", new File(["test"], "consolidated.xlsx"));

    const request = new NextRequest("http://localhost:3000/api/v1/ifr-checker", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});
