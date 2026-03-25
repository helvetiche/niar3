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

describe("IFR Checker API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 when no IFR files provided", async () => {
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

  it("should return 400 when no consolidated file provided", async () => {
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
    const formData = new FormData();
    formData.append("ifrFiles", new File(["invalid"], "ifr1.xlsx"));
    formData.append("consolidatedFile", new File(["invalid"], "consolidated.xlsx"));

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
