import { describe, it, expect } from "vitest";
import {
  validateFileBeforeUpload,
  validateMultipleFiles,
  formatFileSize,
  estimateUploadTime,
} from "@/lib/file-validation";

describe("validateFileBeforeUpload", () => {
  it("should validate PDF files", () => {
    const file = new File(["content"], "test.pdf", { type: "application/pdf" });
    const result = validateFileBeforeUpload(file, "pdf");

    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("should validate Excel files", () => {
    const file = new File(["content"], "test.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const result = validateFileBeforeUpload(file, "excel");

    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("should reject files with wrong extension", () => {
    const file = new File(["content"], "test.txt", { type: "text/plain" });
    const result = validateFileBeforeUpload(file, "pdf");

    expect(result.isValid).toBe(false);
    expect(result.error).toContain("Only .pdf files are allowed");
  });

  it("should reject empty files", () => {
    const file = new File([], "test.pdf", { type: "application/pdf" });
    const result = validateFileBeforeUpload(file);

    expect(result.isValid).toBe(false);
    expect(result.error).toBe("File is empty");
  });

  it("should reject files exceeding 2GB", () => {
    const largeSize = 3 * 1024 * 1024 * 1024; // 3GB
    const file = new File(["x".repeat(1000)], "test.pdf", {
      type: "application/pdf",
    });
    Object.defineProperty(file, "size", { value: largeSize });

    const result = validateFileBeforeUpload(file);

    expect(result.isValid).toBe(false);
    expect(result.error).toContain("exceeds 2GB limit");
  });

  it("should flag large files for progress indicator", () => {
    const largeSize = 150 * 1024 * 1024; // 150MB
    const file = new File(["x".repeat(1000)], "test.pdf", {
      type: "application/pdf",
    });
    Object.defineProperty(file, "size", { value: largeSize });

    const result = validateFileBeforeUpload(file);

    expect(result.isValid).toBe(true);
    expect(result.needsProgress).toBe(true);
  });

  it("should flag very large files for resumable upload", () => {
    const veryLargeSize = 600 * 1024 * 1024; // 600MB
    const file = new File(["x".repeat(1000)], "test.pdf", {
      type: "application/pdf",
    });
    Object.defineProperty(file, "size", { value: veryLargeSize });

    const result = validateFileBeforeUpload(file);

    expect(result.isValid).toBe(true);
    expect(result.needsResumable).toBe(true);
    expect(result.estimatedTime).toBeGreaterThan(0);
  });
});

describe("validateMultipleFiles", () => {
  it("should validate multiple valid files", () => {
    const files = [
      new File(["content1"], "test1.pdf", { type: "application/pdf" }),
      new File(["content2"], "test2.pdf", { type: "application/pdf" }),
    ];

    const result = validateMultipleFiles(files, "pdf");

    expect(result.valid).toHaveLength(2);
    expect(result.invalid).toHaveLength(0);
    expect(result.totalSize).toBeGreaterThan(0);
  });

  it("should separate valid and invalid files", () => {
    const files = [
      new File(["content1"], "test1.pdf", { type: "application/pdf" }),
      new File(["content2"], "test2.txt", { type: "text/plain" }),
      new File([], "test3.pdf", { type: "application/pdf" }),
    ];

    const result = validateMultipleFiles(files, "pdf");

    expect(result.valid).toHaveLength(1);
    expect(result.invalid).toHaveLength(2);
  });

  it("should calculate total size correctly", () => {
    const size1 = 1024 * 1024; // 1MB
    const size2 = 2 * 1024 * 1024; // 2MB

    const file1 = new File(["x".repeat(1000)], "test1.pdf", {
      type: "application/pdf",
    });
    const file2 = new File(["x".repeat(1000)], "test2.pdf", {
      type: "application/pdf",
    });

    Object.defineProperty(file1, "size", { value: size1 });
    Object.defineProperty(file2, "size", { value: size2 });

    const result = validateMultipleFiles([file1, file2], "pdf");

    expect(result.totalSize).toBe(size1 + size2);
  });
});

describe("formatFileSize", () => {
  it("should format bytes correctly", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(500)).toBe("500.00 B");
    expect(formatFileSize(1024)).toBe("1.00 KB");
    expect(formatFileSize(1024 * 1024)).toBe("1.00 MB");
    expect(formatFileSize(1024 * 1024 * 1024)).toBe("1.00 GB");
  });

  it("should handle decimal values", () => {
    expect(formatFileSize(1536)).toBe("1.50 KB");
    expect(formatFileSize(1024 * 1024 * 1.5)).toBe("1.50 MB");
  });
});

describe("estimateUploadTime", () => {
  it("should estimate upload time correctly", () => {
    const bytes = 10 * 1024 * 1024; // 10MB
    const speedMbps = 10;

    const time = estimateUploadTime(bytes, speedMbps);

    expect(time).toBeGreaterThan(0);
    expect(time).toBeLessThan(100); // Should be reasonable
  });

  it("should handle different speeds", () => {
    const bytes = 10 * 1024 * 1024; // 10MB

    const slowTime = estimateUploadTime(bytes, 1);
    const fastTime = estimateUploadTime(bytes, 100);

    expect(slowTime).toBeGreaterThan(fastTime);
  });
});
