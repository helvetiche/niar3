import { describe, it, expect, vi } from "vitest";
import {
  toExcelValue,
  roundHalfUp,
  isValidName,
  sanitizeFilePart,
  formatQueueNumber,
} from "@/lib/excel/cell-utils";

describe("toExcelValue", () => {
  it("should convert 'N' to empty string", () => {
    expect(toExcelValue("N")).toBe("");
    expect(toExcelValue("n")).toBe("");
  });

  it("should return numbers as-is", () => {
    expect(toExcelValue(123)).toBe(123);
    expect(toExcelValue(0)).toBe(0);
    expect(toExcelValue(-45.67)).toBe(-45.67);
  });

  it("should parse numeric strings", () => {
    expect(toExcelValue("123")).toBe(123);
    expect(toExcelValue("45.67")).toBe(45.67);
    expect(toExcelValue("1,234.56")).toBe(1234.56);
  });

  it("should return non-numeric strings as-is", () => {
    expect(toExcelValue("Hello")).toBe("Hello");
    expect(toExcelValue("ABC-123")).toBe("ABC-123");
  });

  it("should return empty string for empty input", () => {
    expect(toExcelValue("")).toBe("");
    expect(toExcelValue("   ")).toBe("");
  });
});

describe("roundHalfUp", () => {
  it("should round to specified decimal places", () => {
    expect(roundHalfUp(1.2345, 2)).toBe(1.23);
    expect(roundHalfUp(1.2355, 2)).toBe(1.24);
    expect(roundHalfUp(1.235, 2)).toBe(1.24);
  });

  it("should handle negative numbers", () => {
    expect(roundHalfUp(-1.2345, 2)).toBe(-1.23);
    expect(roundHalfUp(-1.2355, 2)).toBe(-1.24);
  });

  it("should handle zero decimal places", () => {
    expect(roundHalfUp(1.5, 0)).toBe(2);
    expect(roundHalfUp(1.4, 0)).toBe(1);
  });

  it("should handle large decimal places", () => {
    expect(roundHalfUp(1.123456789, 6)).toBe(1.123457);
  });
});

describe("isValidName", () => {
  it("should return true for valid names", () => {
    expect(isValidName("John Doe")).toBe(true);
    expect(isValidName("Smith")).toBe(true);
  });

  it("should return false for 'N'", () => {
    expect(isValidName("N")).toBe(false);
    expect(isValidName("n")).toBe(false);
  });

  it("should return false for empty strings", () => {
    expect(isValidName("")).toBe(false);
    expect(isValidName("   ")).toBe(false);
  });
});

describe("sanitizeFilePart", () => {
  it("should remove invalid filename characters", () => {
    expect(sanitizeFilePart("file/name")).toBe("file-name");
    expect(sanitizeFilePart("file\\name")).toBe("file-name");
    expect(sanitizeFilePart("file:name")).toBe("file-name");
    expect(sanitizeFilePart('file*name?"<>|')).toBe("file-name-----");
  });

  it("should trim whitespace", () => {
    expect(sanitizeFilePart("  filename  ")).toBe("filename");
  });

  it("should handle valid filenames", () => {
    expect(sanitizeFilePart("valid-filename.txt")).toBe("valid-filename.txt");
  });
});

describe("formatQueueNumber", () => {
  it("should pad with leading zeros", () => {
    expect(formatQueueNumber(1)).toBe("01");
    expect(formatQueueNumber(9)).toBe("09");
    expect(formatQueueNumber(10)).toBe("10");
  });

  it("should handle custom length", () => {
    expect(formatQueueNumber(1, 3)).toBe("001");
    expect(formatQueueNumber(1, 4)).toBe("0001");
  });

  it("should not truncate larger numbers", () => {
    expect(formatQueueNumber(123, 2)).toBe("123");
  });
});
