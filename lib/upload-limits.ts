export type UploadLimits = {
  maxFileCount: number;
  maxFileSizeBytes: number;
  maxTotalSizeBytes: number;
  allowedExtensions?: readonly string[];
  allowedMimeSubstrings?: readonly string[];
};

export type UploadValidationResult =
  | {
      ok: true;
      totalSizeBytes: number;
    }
  | {
      ok: false;
      status: 400 | 413;
      reason:
        | "no-files"
        | "too-many-files"
        | "file-too-large"
        | "payload-too-large"
        | "invalid-file-type";
      message: string;
    };

const getExtension = (fileName: string): string => {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot < 0) return "";
  return fileName.slice(lastDot).toLowerCase();
};

const hasAllowedType = (file: File, limits: UploadLimits): boolean => {
  const extension = getExtension(file.name);
  const { allowedExtensions, allowedMimeSubstrings } = limits;
  const extensionAllowed =
    !allowedExtensions ||
    allowedExtensions.length === 0 ||
    allowedExtensions.includes(extension);
  const mimeAllowed =
    !allowedMimeSubstrings ||
    allowedMimeSubstrings.length === 0 ||
    allowedMimeSubstrings.some((value) => file.type.toLowerCase().includes(value));

  if (
    (!allowedExtensions || allowedExtensions.length === 0) &&
    (!allowedMimeSubstrings || allowedMimeSubstrings.length === 0)
  ) {
    return true;
  }

  return extensionAllowed || mimeAllowed;
};

export const validateUploads = (
  files: File[],
  limits: UploadLimits,
): UploadValidationResult => {
  if (files.length === 0) {
    return {
      ok: false,
      status: 400,
      reason: "no-files",
      message: "No files uploaded.",
    };
  }

  if (files.length > limits.maxFileCount) {
    return {
      ok: false,
      status: 413,
      reason: "too-many-files",
      message: `Too many files. Maximum is ${String(limits.maxFileCount)}.`,
    };
  }

  let totalSizeBytes = 0;
  for (const file of files) {
    if (!hasAllowedType(file, limits)) {
      return {
        ok: false,
        status: 400,
        reason: "invalid-file-type",
        message: `Invalid file type: ${file.name}`,
      };
    }

    if (file.size > limits.maxFileSizeBytes) {
      return {
        ok: false,
        status: 413,
        reason: "file-too-large",
        message: `File too large: ${file.name}`,
      };
    }

    totalSizeBytes += file.size;
    if (totalSizeBytes > limits.maxTotalSizeBytes) {
      return {
        ok: false,
        status: 413,
        reason: "payload-too-large",
        message: "Total upload size is too large.",
      };
    }
  }

  return { ok: true, totalSizeBytes };
};
