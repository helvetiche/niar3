import { describe, it, expect } from "vitest";
import { standardizeLotNumber } from "@/lib/lot-code";

describe("standardizeLotNumber", () => {
  it("removes dots and keeps hyphenated alphanumeric lots", () => {
    expect(standardizeLotNumber("104.32-A")).toBe("10432-A");
  });

  it("leaves already-clean codes unchanged", () => {
    expect(standardizeLotNumber("10432-A")).toBe("10432-A");
  });

  it("trims surrounding whitespace before stripping", () => {
    expect(standardizeLotNumber("  12-AB  ")).toBe("12-AB");
  });

  it("collapses spaced hyphenated lots for consolidated-style input", () => {
    expect(standardizeLotNumber("1023 - A")).toBe("1023-A");
  });

  it("returns empty string for empty input", () => {
    expect(standardizeLotNumber("")).toBe("");
    expect(standardizeLotNumber(null)).toBe("");
    expect(standardizeLotNumber(undefined)).toBe("");
  });
});
